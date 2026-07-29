package services

import (
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"
	"xdfc-server/db"
	"xdfc-server/models"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

var (
	ErrRuleExecutionLogNotFound     = errors.New("rule execution log not found")
	ErrRuleExecutionLogNotRetryable = errors.New("rule execution log is not retryable")
)

const (
	ProductionOutsourceNotificationAutoRetryLockKey = "production-outsource-notification-auto-retry"
	ProductionOutsourceNotificationAutoRetryLockTTL = 9 * time.Minute
)

type RuleExecutionNotificationAutoRetryPolicy struct {
	SourceCode  string
	MaxAttempts int
	Limit       int
	MinAge      time.Duration
}

type RuleExecutionNotificationAutoRetryItem struct {
	OriginalLogID string `json:"originalLogId"`
	RetryLogID    string `json:"retryLogId"`
	Status        string `json:"status"`
	Attempts      int    `json:"attempts"`
	ErrorMessage  string `json:"errorMessage"`
}

type RuleExecutionNotificationAutoRetryResult struct {
	Scanned   int                                      `json:"scanned"`
	Retried   int                                      `json:"retried"`
	Succeeded int                                      `json:"succeeded"`
	Failed    int                                      `json:"failed"`
	Skipped   int                                      `json:"skipped"`
	Errors    int                                      `json:"errors"`
	Items     []RuleExecutionNotificationAutoRetryItem `json:"items"`
}

func CreateRuleExecutionLog(logEntry models.RuleExecutionLog) (models.RuleExecutionLog, error) {
	logEntry.EventKey = strings.TrimSpace(logEntry.EventKey)
	logEntry.Entity = strings.TrimSpace(logEntry.Entity)
	logEntry.SourceCode = strings.TrimSpace(logEntry.SourceCode)
	logEntry.ActionCode = strings.TrimSpace(logEntry.ActionCode)
	logEntry.StatusCode = strings.TrimSpace(logEntry.StatusCode)
	logEntry.RuleID = strings.TrimSpace(logEntry.RuleID)
	logEntry.RuleName = strings.TrimSpace(logEntry.RuleName)
	logEntry.SegmentID = strings.TrimSpace(logEntry.SegmentID)
	logEntry.SegmentTitle = strings.TrimSpace(logEntry.SegmentTitle)
	logEntry.ExecutionType = strings.TrimSpace(strings.ToLower(logEntry.ExecutionType))
	logEntry.ExecutionStatus = strings.TrimSpace(strings.ToLower(logEntry.ExecutionStatus))
	logEntry.CommandID = strings.TrimSpace(logEntry.CommandID)
	logEntry.Title = strings.TrimSpace(logEntry.Title)
	logEntry.Content = strings.TrimSpace(logEntry.Content)
	logEntry.ActionURL = strings.TrimSpace(logEntry.ActionURL)
	logEntry.ErrorMessage = strings.TrimSpace(logEntry.ErrorMessage)

	if err := db.DB.Create(&logEntry).Error; err != nil {
		return models.RuleExecutionLog{}, err
	}
	return logEntry, nil
}

func ListRuleExecutionLogs(queryInput RuleExecutionLogListQuery) ([]models.RuleExecutionLog, int64, error) {
	page := queryInput.Page
	if page < 1 {
		page = 1
	}
	pageSize := queryInput.PageSize
	if pageSize < 1 {
		pageSize = 20
	}

	query := db.DB.Model(&models.RuleExecutionLog{})
	if queryInput.EventKey != "" {
		query = query.Where("event_key = ?", strings.TrimSpace(queryInput.EventKey))
	}
	if queryInput.Entity != "" {
		query = query.Where("entity = ?", strings.TrimSpace(queryInput.Entity))
	}
	if queryInput.SourceCode != "" {
		query = query.Where("source_code = ?", strings.TrimSpace(queryInput.SourceCode))
	}
	if queryInput.ActionCode != "" {
		query = query.Where("action_code = ?", strings.TrimSpace(queryInput.ActionCode))
	}
	if queryInput.StatusCode != "" {
		query = query.Where("status_code = ?", strings.TrimSpace(queryInput.StatusCode))
	}
	if queryInput.RuleID != "" {
		query = query.Where("rule_id = ?", strings.TrimSpace(queryInput.RuleID))
	}
	if queryInput.SegmentID != "" {
		query = query.Where("segment_id = ?", strings.TrimSpace(queryInput.SegmentID))
	}
	if queryInput.ExecutionType != "" {
		query = query.Where("execution_type = ?", strings.TrimSpace(strings.ToLower(queryInput.ExecutionType)))
	}
	if queryInput.ExecutionStatus != "" {
		query = query.Where("execution_status = ?", strings.TrimSpace(strings.ToLower(queryInput.ExecutionStatus)))
	}

	var total int64
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	var items []models.RuleExecutionLog
	if err := query.
		Order("triggered_at desc").
		Order("created_at desc").
		Offset((page - 1) * pageSize).
		Limit(pageSize).
		Find(&items).Error; err != nil {
		return nil, 0, err
	}

	return items, total, nil
}

func RetryProductionOutsourceFailedNotifications() (RuleExecutionNotificationAutoRetryResult, error) {
	return RetryFailedRuleExecutionNotificationsWithDB(db.DB, RuleExecutionNotificationAutoRetryPolicy{
		SourceCode: businessEventSourceProductionOutsource,
	})
}

func RetryFailedRuleExecutionNotificationsWithDB(database *gorm.DB, policy RuleExecutionNotificationAutoRetryPolicy) (RuleExecutionNotificationAutoRetryResult, error) {
	normalized := normalizeRuleExecutionNotificationAutoRetryPolicy(policy)
	if database == nil {
		return RuleExecutionNotificationAutoRetryResult{}, fmt.Errorf("database is required")
	}

	var notifyLogs []models.RuleExecutionLog
	query := database.Where("execution_type = ?", "notify")
	if normalized.SourceCode != "" {
		query = query.Where("source_code = ?", normalized.SourceCode)
	}
	if err := query.Order("triggered_at ASC, created_at ASC").Find(&notifyLogs).Error; err != nil {
		return RuleExecutionNotificationAutoRetryResult{}, err
	}

	recoveredOriginals := map[string]struct{}{}
	attemptsByOriginal := map[string]int{}
	failedOriginals := make([]models.RuleExecutionLog, 0)
	for _, logEntry := range notifyLogs {
		retryOfLogID := decodeRuleExecutionRetryOfLogID(logEntry.Result)
		if retryOfLogID != "" {
			attemptsByOriginal[retryOfLogID]++
			if strings.EqualFold(strings.TrimSpace(logEntry.ExecutionStatus), "success") {
				recoveredOriginals[retryOfLogID] = struct{}{}
			}
			continue
		}
		if strings.EqualFold(strings.TrimSpace(logEntry.ExecutionStatus), "failed") {
			failedOriginals = append(failedOriginals, logEntry)
		}
	}

	now := time.Now().UTC()
	result := RuleExecutionNotificationAutoRetryResult{
		Scanned: len(failedOriginals),
		Items:   []RuleExecutionNotificationAutoRetryItem{},
	}
	for _, original := range failedOriginals {
		if result.Retried >= normalized.Limit {
			break
		}
		if _, recovered := recoveredOriginals[original.ID]; recovered {
			continue
		}
		attempts := attemptsByOriginal[original.ID]
		if attempts >= normalized.MaxAttempts {
			continue
		}
		if normalized.MinAge > 0 && now.Sub(ruleExecutionLogEffectiveTriggeredAt(original)) < normalized.MinAge {
			continue
		}

		retryLog, err := RetryRuleExecutionNotificationLogWithDB(database, original.ID)
		if err != nil {
			result.Errors++
			result.Items = append(result.Items, RuleExecutionNotificationAutoRetryItem{
				OriginalLogID: original.ID,
				Status:        "error",
				Attempts:      attempts + 1,
				ErrorMessage:  err.Error(),
			})
			continue
		}
		result.Retried++
		item := RuleExecutionNotificationAutoRetryItem{
			OriginalLogID: original.ID,
			RetryLogID:    retryLog.ID,
			Status:        retryLog.ExecutionStatus,
			Attempts:      attempts + 1,
			ErrorMessage:  retryLog.ErrorMessage,
		}
		result.Items = append(result.Items, item)
		switch strings.ToLower(strings.TrimSpace(retryLog.ExecutionStatus)) {
		case "success":
			result.Succeeded++
		case "skipped":
			result.Skipped++
		case "failed":
			result.Failed++
		default:
			result.Errors++
		}
	}

	return result, nil
}

func RetryRuleExecutionNotificationLog(id string) (models.RuleExecutionLog, error) {
	return RetryRuleExecutionNotificationLogWithDB(db.DB, id)
}

func RetryRuleExecutionNotificationLogWithDB(database *gorm.DB, id string) (models.RuleExecutionLog, error) {
	trimmedID := strings.TrimSpace(id)
	if database == nil {
		return models.RuleExecutionLog{}, fmt.Errorf("database is required")
	}
	if trimmedID == "" {
		return models.RuleExecutionLog{}, ErrRuleExecutionLogNotFound
	}

	var original models.RuleExecutionLog
	if err := database.First(&original, "id = ?", trimmedID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return models.RuleExecutionLog{}, ErrRuleExecutionLogNotFound
		}
		return models.RuleExecutionLog{}, err
	}
	if strings.TrimSpace(strings.ToLower(original.ExecutionType)) != "notify" ||
		strings.TrimSpace(strings.ToLower(original.ExecutionStatus)) != "failed" {
		return models.RuleExecutionLog{}, ErrRuleExecutionLogNotRetryable
	}

	targets := decodeRuleExecutionLogTargets(original.Targets)
	status := "success"
	errorMessage := ""
	if len(targets) == 0 {
		status = "skipped"
		errorMessage = "notification target is empty"
	} else {
		for _, target := range targets {
			if err := PublishNotification("Workflow", strings.TrimSpace(original.ActionCode), original.Title, target, retryRuleExecutionNotificationPayload(original)); err != nil {
				status = "failed"
				errorMessage = err.Error()
			}
		}
	}

	retryLog := models.RuleExecutionLog{
		BaseModel:       models.BaseModel{ID: uuid.NewString()},
		EventKey:        strings.TrimSpace(original.EventKey),
		Entity:          strings.TrimSpace(original.Entity),
		SourceCode:      strings.TrimSpace(original.SourceCode),
		ActionCode:      strings.TrimSpace(original.ActionCode),
		StatusCode:      strings.TrimSpace(original.StatusCode),
		RuleID:          strings.TrimSpace(original.RuleID),
		RuleName:        strings.TrimSpace(original.RuleName),
		SegmentID:       strings.TrimSpace(original.SegmentID),
		SegmentTitle:    strings.TrimSpace(original.SegmentTitle),
		ExecutionType:   "notify",
		ExecutionStatus: status,
		CommandID:       strings.TrimSpace(original.CommandID),
		Title:           strings.TrimSpace(original.Title),
		Content:         strings.TrimSpace(original.Content),
		ActionURL:       strings.TrimSpace(original.ActionURL),
		Targets:         mustJSONRawMessage(targets),
		Metadata:        normalizeRuleExecutionRawJSON(original.Metadata, `{}`),
		Result:          mustJSONRawMessage(map[string]string{"retryOfLogId": original.ID}),
		ErrorMessage:    errorMessage,
		TriggeredAt:     time.Now().UTC(),
	}
	if err := database.Create(&retryLog).Error; err != nil {
		return models.RuleExecutionLog{}, err
	}
	return retryLog, nil
}

func retryRuleExecutionNotificationPayload(original models.RuleExecutionLog) map[string]any {
	return map[string]any{
		"eventKey":     strings.TrimSpace(original.EventKey),
		"status":       strings.TrimSpace(original.StatusCode),
		"actionUrl":    strings.TrimSpace(original.ActionURL),
		"commandId":    strings.TrimSpace(original.CommandID),
		"ruleId":       strings.TrimSpace(original.RuleID),
		"segmentId":    strings.TrimSpace(original.SegmentID),
		"sourceCode":   strings.TrimSpace(original.SourceCode),
		"metadata":     decodeRuleExecutionLogMetadata(original.Metadata),
		"retryOfLogId": strings.TrimSpace(original.ID),
	}
}

func decodeRuleExecutionLogTargets(raw json.RawMessage) []string {
	var values []string
	if err := json.Unmarshal(raw, &values); err != nil {
		return []string{}
	}
	result := make([]string, 0, len(values))
	seen := make(map[string]struct{}, len(values))
	for _, value := range values {
		trimmed := strings.TrimSpace(value)
		if trimmed == "" {
			continue
		}
		if _, exists := seen[trimmed]; exists {
			continue
		}
		seen[trimmed] = struct{}{}
		result = append(result, trimmed)
	}
	return result
}

func decodeRuleExecutionLogMetadata(raw json.RawMessage) map[string]any {
	var metadata map[string]any
	if err := json.Unmarshal(raw, &metadata); err != nil || metadata == nil {
		return map[string]any{}
	}
	return metadata
}

func decodeRuleExecutionRetryOfLogID(raw json.RawMessage) string {
	var payload map[string]any
	if err := json.Unmarshal(raw, &payload); err != nil {
		return ""
	}
	value, ok := payload["retryOfLogId"]
	if !ok || value == nil {
		return ""
	}
	return strings.TrimSpace(fmt.Sprint(value))
}

func normalizeRuleExecutionRawJSON(raw json.RawMessage, fallback string) json.RawMessage {
	trimmed := strings.TrimSpace(string(raw))
	if trimmed == "" || !json.Valid([]byte(trimmed)) {
		return json.RawMessage(fallback)
	}
	return json.RawMessage(trimmed)
}

func normalizeRuleExecutionNotificationAutoRetryPolicy(policy RuleExecutionNotificationAutoRetryPolicy) RuleExecutionNotificationAutoRetryPolicy {
	policy.SourceCode = strings.TrimSpace(policy.SourceCode)
	if policy.MaxAttempts <= 0 {
		policy.MaxAttempts = 3
	}
	if policy.Limit <= 0 {
		policy.Limit = 20
	}
	if policy.MinAge < 0 {
		policy.MinAge = 0
	}
	if policy.MinAge == 0 {
		policy.MinAge = 2 * time.Minute
	}
	return policy
}

func ruleExecutionLogEffectiveTriggeredAt(logEntry models.RuleExecutionLog) time.Time {
	if !logEntry.TriggeredAt.IsZero() {
		return logEntry.TriggeredAt.UTC()
	}
	if !logEntry.CreatedAt.IsZero() {
		return logEntry.CreatedAt.UTC()
	}
	return time.Time{}
}
