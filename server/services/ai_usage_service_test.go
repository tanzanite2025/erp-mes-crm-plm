package services

import (
	"errors"
	"strings"
	"testing"
	"time"
	"xdfc-server/models"

	"github.com/glebarez/sqlite"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

func openAIUsageServiceTestDB(t *testing.T) *gorm.DB {
	t.Helper()

	dsnName := strings.NewReplacer("/", "_", " ", "_").Replace(t.Name())
	database, err := gorm.Open(sqlite.Open("file:"+dsnName+"?mode=memory&cache=shared"), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Silent),
	})
	if err != nil {
		t.Fatalf("open ai usage test db: %v", err)
	}
	sqlDB, err := database.DB()
	if err != nil {
		t.Fatalf("open ai usage sql db: %v", err)
	}
	sqlDB.SetMaxOpenConns(1)
	t.Cleanup(func() {
		if err := sqlDB.Close(); err != nil {
			t.Errorf("close ai usage sql db: %v", err)
		}
	})
	if err := database.Exec(`CREATE TABLE ai_usage_logs (
		id text PRIMARY KEY,
		user_id text,
		username text,
		route_permission_id text,
		provider text,
		model text,
		stream boolean,
		status text,
		error_code text,
		http_status integer,
		prompt_runes integer,
		request_bytes integer,
		response_bytes integer,
		duration_ms integer,
		ip text,
		completed_at datetime,
		created_at datetime,
		updated_at datetime,
		deleted_at datetime
	)`).Error; err != nil {
		t.Fatalf("create ai usage logs schema: %v", err)
	}
	return database
}

func testAIUsageReservationInput(userID string) AIUsageReservationInput {
	return AIUsageReservationInput{
		UserID:            userID,
		Username:          "ai-user",
		RoutePermissionID: "page_ai_capability",
		Provider:          "openai",
		Model:             "gpt-4o-mini",
		IP:                "127.0.0.1",
		PromptRunes:       12,
		RequestBytes:      128,
	}
}

func TestReserveAIUsageCompletesLedgerRow(t *testing.T) {
	database := openAIUsageServiceTestDB(t)
	cfg := AIUsageGovernanceConfig{
		MaxConcurrentRequests: 2,
		MaxGlobalWindowCalls:  10,
		MaxUserWindowCalls:    10,
		Window:                time.Minute,
		RunningTTL:            time.Minute,
	}

	usageLog, err := ReserveAIUsage(database, testAIUsageReservationInput("user-1"), cfg)
	if err != nil {
		t.Fatalf("reserve ai usage: %v", err)
	}
	if err := CompleteAIUsage(database, usageLog.ID, AIUsageCompletionInput{
		Status:        AIUsageStatusSuccess,
		HTTPStatus:    200,
		ResponseBytes: 512,
		DurationMs:    43,
	}); err != nil {
		t.Fatalf("complete ai usage: %v", err)
	}

	var saved models.AIUsageLog
	if err := database.First(&saved, "id = ?", usageLog.ID).Error; err != nil {
		t.Fatalf("load completed ai usage log: %v", err)
	}
	if saved.Status != AIUsageStatusSuccess || saved.HTTPStatus != 200 {
		t.Fatalf("unexpected completion status: %+v", saved)
	}
	if saved.ResponseBytes != 512 || saved.DurationMs != 43 {
		t.Fatalf("unexpected completion metrics: %+v", saved)
	}
	if saved.CompletedAt == nil {
		t.Fatal("expected completed_at to be set")
	}
}

func TestReserveAIUsageRejectsConcurrentOverflow(t *testing.T) {
	database := openAIUsageServiceTestDB(t)
	cfg := AIUsageGovernanceConfig{
		MaxConcurrentRequests: 1,
		MaxGlobalWindowCalls:  10,
		MaxUserWindowCalls:    10,
		Window:                time.Minute,
		RunningTTL:            time.Minute,
	}

	if _, err := ReserveAIUsage(database, testAIUsageReservationInput("user-1"), cfg); err != nil {
		t.Fatalf("reserve first ai usage: %v", err)
	}
	_, err := ReserveAIUsage(database, testAIUsageReservationInput("user-2"), cfg)
	var limitErr *AIUsageLimitError
	if !errors.As(err, &limitErr) {
		t.Fatalf("expected ai usage limit error, got %v", err)
	}
	if limitErr.Code != "AI_PROXY_CONCURRENCY_LIMIT" {
		t.Fatalf("expected concurrency limit code, got %s", limitErr.Code)
	}

	var rejected models.AIUsageLog
	if err := database.First(&rejected, "status = ?", AIUsageStatusRejected).Error; err != nil {
		t.Fatalf("expected rejected ai usage log: %v", err)
	}
	if rejected.ErrorCode != "AI_PROXY_CONCURRENCY_LIMIT" || rejected.HTTPStatus != 429 {
		t.Fatalf("unexpected rejected usage log: %+v", rejected)
	}
}

func TestReserveAIUsageRejectsUserWindowOverflow(t *testing.T) {
	database := openAIUsageServiceTestDB(t)
	cfg := AIUsageGovernanceConfig{
		MaxConcurrentRequests: 10,
		MaxGlobalWindowCalls:  10,
		MaxUserWindowCalls:    1,
		Window:                time.Minute,
		RunningTTL:            time.Minute,
	}

	first, err := ReserveAIUsage(database, testAIUsageReservationInput("user-1"), cfg)
	if err != nil {
		t.Fatalf("reserve first ai usage: %v", err)
	}
	if err := CompleteAIUsage(database, first.ID, AIUsageCompletionInput{HTTPStatus: 200}); err != nil {
		t.Fatalf("complete first ai usage: %v", err)
	}

	_, err = ReserveAIUsage(database, testAIUsageReservationInput("user-1"), cfg)
	var limitErr *AIUsageLimitError
	if !errors.As(err, &limitErr) {
		t.Fatalf("expected ai usage limit error, got %v", err)
	}
	if limitErr.Code != "AI_PROXY_USER_RATE_LIMIT" {
		t.Fatalf("expected user rate limit code, got %s", limitErr.Code)
	}
}
