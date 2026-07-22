package services

import (
	"errors"
	"fmt"
	"log"
	"os"
	"strconv"
	"strings"
	"time"
	"xdfc-server/models"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

const (
	AIUsageStatusRunning       = "running"
	AIUsageStatusSuccess       = "success"
	AIUsageStatusFailed        = "failed"
	AIUsageStatusUpstreamError = "upstream_error"
	AIUsageStatusRejected      = "rejected"
)

var ErrAIUsageLimitExceeded = errors.New("AI usage governance limit exceeded")

type AIUsageLimitError struct {
	Code    string
	Message string
}

func (err *AIUsageLimitError) Error() string {
	if strings.TrimSpace(err.Message) == "" {
		return ErrAIUsageLimitExceeded.Error()
	}
	return err.Message
}

func (err *AIUsageLimitError) Unwrap() error {
	return ErrAIUsageLimitExceeded
}

type AIUsageGovernanceConfig struct {
	MaxConcurrentRequests int
	MaxGlobalWindowCalls  int
	MaxUserWindowCalls    int
	Window                time.Duration
	RunningTTL            time.Duration
}

type AIUsageReservationInput struct {
	UserID            string
	Username          string
	RoutePermissionID string
	Provider          string
	Model             string
	IP                string
	Stream            bool
	PromptRunes       int
	RequestBytes      int
}

type AIUsageCompletionInput struct {
	Status        string
	ErrorCode     string
	HTTPStatus    int
	ResponseBytes int
	DurationMs    int64
}

func LoadAIUsageGovernanceConfigFromEnv() AIUsageGovernanceConfig {
	return AIUsageGovernanceConfig{
		MaxConcurrentRequests: readPositiveEnvInt("AI_PROXY_MAX_CONCURRENT_REQUESTS", 6),
		MaxGlobalWindowCalls:  readPositiveEnvInt("AI_PROXY_GLOBAL_WINDOW_CALLS", 80),
		MaxUserWindowCalls:    readPositiveEnvInt("AI_PROXY_USER_WINDOW_CALLS", 20),
		Window:                time.Duration(readPositiveEnvInt("AI_PROXY_RATE_WINDOW_SECONDS", 60)) * time.Second,
		RunningTTL:            time.Duration(readPositiveEnvInt("AI_PROXY_RUNNING_TTL_SECONDS", 180)) * time.Second,
	}
}

func readPositiveEnvInt(key string, fallback int) int {
	raw := strings.TrimSpace(os.Getenv(key))
	if raw == "" {
		return fallback
	}
	value, err := strconv.Atoi(raw)
	if err != nil || value < 0 {
		return fallback
	}
	return value
}

func ReserveAIUsage(database *gorm.DB, input AIUsageReservationInput, cfg AIUsageGovernanceConfig) (*models.AIUsageLog, error) {
	if database == nil {
		return nil, gorm.ErrInvalidDB
	}
	now := time.Now().UTC()
	normalized := normalizeAIUsageReservationInput(input)

	if cfg.Window <= 0 {
		cfg.Window = time.Minute
	}
	if cfg.RunningTTL <= 0 {
		cfg.RunningTTL = 3 * time.Minute
	}

	if err := enforceAIUsageLimits(database, normalized, cfg, now); err != nil {
		if recordErr := recordRejectedAIUsage(database, normalized, err); recordErr != nil {
			log.Printf("[AI_USAGE][WARN] failed to record rejected usage: %v", recordErr)
		}
		return nil, err
	}

	log := &models.AIUsageLog{
		BaseModel: models.BaseModel{
			ID:        uuid.NewString(),
			CreatedAt: now,
			UpdatedAt: now,
		},
		UserID:            normalized.UserID,
		Username:          normalized.Username,
		RoutePermissionID: normalized.RoutePermissionID,
		Provider:          normalized.Provider,
		Model:             normalized.Model,
		Stream:            normalized.Stream,
		Status:            AIUsageStatusRunning,
		PromptRunes:       normalized.PromptRunes,
		RequestBytes:      normalized.RequestBytes,
		IP:                normalized.IP,
	}
	if err := database.Create(log).Error; err != nil {
		return nil, err
	}
	return log, nil
}

func CompleteAIUsage(database *gorm.DB, usageLogID string, input AIUsageCompletionInput) error {
	if database == nil {
		return gorm.ErrInvalidDB
	}
	usageLogID = strings.TrimSpace(usageLogID)
	if usageLogID == "" {
		return nil
	}
	now := time.Now().UTC()
	status := strings.TrimSpace(input.Status)
	if status == "" {
		status = ClassifyAIUsageStatus(input.HTTPStatus)
	}
	updates := map[string]any{
		"status":         status,
		"error_code":     strings.TrimSpace(input.ErrorCode),
		"http_status":    input.HTTPStatus,
		"response_bytes": input.ResponseBytes,
		"duration_ms":    input.DurationMs,
		"completed_at":   &now,
		"updated_at":     now,
	}
	return database.Model(&models.AIUsageLog{}).Where("id = ?", usageLogID).Updates(updates).Error
}

func ClassifyAIUsageStatus(httpStatus int) string {
	if httpStatus >= 200 && httpStatus < 300 {
		return AIUsageStatusSuccess
	}
	if httpStatus >= 400 {
		return AIUsageStatusUpstreamError
	}
	return AIUsageStatusFailed
}

func normalizeAIUsageReservationInput(input AIUsageReservationInput) AIUsageReservationInput {
	return AIUsageReservationInput{
		UserID:            strings.TrimSpace(input.UserID),
		Username:          strings.TrimSpace(input.Username),
		RoutePermissionID: strings.ToLower(strings.TrimSpace(input.RoutePermissionID)),
		Provider:          strings.ToLower(strings.TrimSpace(input.Provider)),
		Model:             strings.TrimSpace(input.Model),
		IP:                strings.TrimSpace(input.IP),
		Stream:            input.Stream,
		PromptRunes:       max(input.PromptRunes, 0),
		RequestBytes:      max(input.RequestBytes, 0),
	}
}

func enforceAIUsageLimits(database *gorm.DB, input AIUsageReservationInput, cfg AIUsageGovernanceConfig, now time.Time) error {
	if cfg.MaxConcurrentRequests > 0 {
		runningCutoff := now.Add(-cfg.RunningTTL)
		var runningCount int64
		if err := database.Model(&models.AIUsageLog{}).
			Where("status = ? AND created_at >= ?", AIUsageStatusRunning, runningCutoff).
			Count(&runningCount).Error; err != nil {
			return err
		}
		if runningCount >= int64(cfg.MaxConcurrentRequests) {
			return &AIUsageLimitError{
				Code:    "AI_PROXY_CONCURRENCY_LIMIT",
				Message: "AI concurrent request limit exceeded",
			}
		}
	}

	windowCutoff := now.Add(-cfg.Window)
	if cfg.MaxGlobalWindowCalls > 0 {
		var globalCount int64
		if err := database.Model(&models.AIUsageLog{}).
			Where("status <> ? AND created_at >= ?", AIUsageStatusRejected, windowCutoff).
			Count(&globalCount).Error; err != nil {
			return err
		}
		if globalCount >= int64(cfg.MaxGlobalWindowCalls) {
			return &AIUsageLimitError{
				Code:    "AI_PROXY_GLOBAL_RATE_LIMIT",
				Message: fmt.Sprintf("AI global request limit exceeded in %s", cfg.Window),
			}
		}
	}

	if cfg.MaxUserWindowCalls > 0 && input.UserID != "" {
		var userCount int64
		if err := database.Model(&models.AIUsageLog{}).
			Where("status <> ? AND user_id = ? AND created_at >= ?", AIUsageStatusRejected, input.UserID, windowCutoff).
			Count(&userCount).Error; err != nil {
			return err
		}
		if userCount >= int64(cfg.MaxUserWindowCalls) {
			return &AIUsageLimitError{
				Code:    "AI_PROXY_USER_RATE_LIMIT",
				Message: fmt.Sprintf("AI user request limit exceeded in %s", cfg.Window),
			}
		}
	}
	return nil
}

func recordRejectedAIUsage(database *gorm.DB, input AIUsageReservationInput, reserveErr error) error {
	now := time.Now().UTC()
	errorCode := "AI_PROXY_USAGE_REJECTED"
	var limitErr *AIUsageLimitError
	if errors.As(reserveErr, &limitErr) && strings.TrimSpace(limitErr.Code) != "" {
		errorCode = limitErr.Code
	}
	return database.Create(&models.AIUsageLog{
		BaseModel: models.BaseModel{
			ID:        uuid.NewString(),
			CreatedAt: now,
			UpdatedAt: now,
		},
		UserID:            input.UserID,
		Username:          input.Username,
		RoutePermissionID: input.RoutePermissionID,
		Provider:          input.Provider,
		Model:             input.Model,
		Stream:            input.Stream,
		Status:            AIUsageStatusRejected,
		ErrorCode:         errorCode,
		HTTPStatus:        429,
		PromptRunes:       input.PromptRunes,
		RequestBytes:      input.RequestBytes,
		IP:                input.IP,
		CompletedAt:       &now,
	}).Error
}
