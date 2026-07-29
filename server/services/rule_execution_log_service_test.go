package services

import (
	"errors"
	"testing"
	"time"
	"xdfc-server/models"

	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
)

func seedRetryableNotifyExecutionLog(t *testing.T, database *gorm.DB, status string, executionType string) models.RuleExecutionLog {
	t.Helper()

	logEntry := models.RuleExecutionLog{
		BaseModel:       models.BaseModel{ID: "log-retry-source"},
		EventKey:        "PRODUCTION_OUTSOURCE:target-1:STATUS_CHANGED:BEFORE_RELEASED:RELEASED",
		Entity:          businessEventEntitySystem,
		SourceCode:      businessEventSourceProductionOutsource,
		ActionCode:      businessEventActionStatusChange,
		StatusCode:      OutsourceOrderStatusReleased,
		RuleID:          "rule-outsource-event",
		RuleName:        "委外执行通知",
		SegmentID:       "segment-outsource-event",
		SegmentTitle:    "委外执行事件",
		ExecutionType:   executionType,
		ExecutionStatus: status,
		CommandID:       "cmd-outsource-event",
		Title:           "委外单 OSO-TEST-1 状态 RELEASED",
		Content:         "产品 产品一 / 条码 BC-001",
		ActionURL:       "/production-outsourcing/transfers?search=OSO-TEST-1",
		Targets:         mustJSONRawMessage([]string{"planner"}),
		Metadata: mustJSONRawMessage(map[string]any{
			"outsourceOrderNo": "OSO-TEST-1",
			"eventStatus":      OutsourceOrderStatusReleased,
		}),
		Result:      mustJSONRawMessage(map[string]any{}),
		TriggeredAt: time.Now().UTC(),
	}
	require.NoError(t, database.Create(&logEntry).Error)
	return logEntry
}

func TestRetryRuleExecutionNotificationLogPublishesAndAppendsSuccessLog(t *testing.T) {
	_, database := newOutsourceExecutionTestService(t)
	original := seedRetryableNotifyExecutionLog(t, database, "failed", "notify")
	published := captureNotificationPublisher(t, nil)

	retryLog, err := RetryRuleExecutionNotificationLogWithDB(database, original.ID)

	require.NoError(t, err)
	require.Equal(t, "notify", retryLog.ExecutionType)
	require.Equal(t, "success", retryLog.ExecutionStatus)
	require.Equal(t, original.EventKey, retryLog.EventKey)
	require.Equal(t, original.CommandID, retryLog.CommandID)
	require.Len(t, *published, 1)
	payload := decodeCapturedNotificationPayload(t, (*published)[0])
	require.Equal(t, "Workflow", payload["module"])
	require.Equal(t, businessEventActionStatusChange, payload["action"])
	require.Equal(t, "planner", payload["targetUser"])
	innerPayload, ok := payload["payload"].(map[string]any)
	require.True(t, ok)
	require.Equal(t, original.ID, innerPayload["retryOfLogId"])

	var total int64
	require.NoError(t, database.Model(&models.RuleExecutionLog{}).Where("event_key = ?", original.EventKey).Count(&total).Error)
	require.Equal(t, int64(2), total)
}

func TestRetryRuleExecutionNotificationLogAppendsFailedLogWhenPublisherFails(t *testing.T) {
	_, database := newOutsourceExecutionTestService(t)
	original := seedRetryableNotifyExecutionLog(t, database, "failed", "notify")
	published := captureNotificationPublisher(t, errors.New("redis still unavailable"))

	retryLog, err := RetryRuleExecutionNotificationLogWithDB(database, original.ID)

	require.NoError(t, err)
	require.Len(t, *published, 1)
	require.Equal(t, "failed", retryLog.ExecutionStatus)
	require.Equal(t, "redis still unavailable", retryLog.ErrorMessage)
}

func TestRetryRuleExecutionNotificationLogRejectsNonRetryableLogs(t *testing.T) {
	_, database := newOutsourceExecutionTestService(t)
	successLog := seedRetryableNotifyExecutionLog(t, database, "success", "notify")

	_, err := RetryRuleExecutionNotificationLogWithDB(database, successLog.ID)
	require.ErrorIs(t, err, ErrRuleExecutionLogNotRetryable)
}

func TestRetryFailedRuleExecutionNotificationsRetriesOriginalOnly(t *testing.T) {
	_, database := newOutsourceExecutionTestService(t)
	triggeredAt := time.Now().UTC().Add(-10 * time.Minute)
	original := createNotifyExecutionLogForAutoRetry(t, database, "notify-auto-source", "failed", "", triggeredAt)
	createNotifyExecutionLogForAutoRetry(t, database, "notify-auto-retry-failed", "failed", original.ID, triggeredAt.Add(time.Minute))
	published := captureNotificationPublisher(t, nil)

	result, err := RetryFailedRuleExecutionNotificationsWithDB(database, RuleExecutionNotificationAutoRetryPolicy{
		SourceCode:  businessEventSourceProductionOutsource,
		MaxAttempts: 2,
		Limit:       10,
		MinAge:      time.Second,
	})

	require.NoError(t, err)
	require.Equal(t, 1, result.Scanned)
	require.Equal(t, 1, result.Retried)
	require.Equal(t, 1, result.Succeeded)
	require.Len(t, result.Items, 1)
	require.Equal(t, original.ID, result.Items[0].OriginalLogID)
	require.Equal(t, 2, result.Items[0].Attempts)
	require.Len(t, *published, 1)

	var retryOfRetryCount int64
	require.NoError(t, database.Model(&models.RuleExecutionLog{}).
		Where("result LIKE ?", `%notify-auto-retry-failed%`).
		Count(&retryOfRetryCount).Error)
	require.Zero(t, retryOfRetryCount)
}

func TestRetryFailedRuleExecutionNotificationsSkipsRecoveredAndMaxAttempts(t *testing.T) {
	_, database := newOutsourceExecutionTestService(t)
	triggeredAt := time.Now().UTC().Add(-10 * time.Minute)
	recovered := createNotifyExecutionLogForAutoRetry(t, database, "notify-auto-recovered", "failed", "", triggeredAt)
	createNotifyExecutionLogForAutoRetry(t, database, "notify-auto-recovered-success", "success", recovered.ID, triggeredAt.Add(time.Minute))
	maxed := createNotifyExecutionLogForAutoRetry(t, database, "notify-auto-maxed", "failed", "", triggeredAt)
	createNotifyExecutionLogForAutoRetry(t, database, "notify-auto-maxed-retry-1", "failed", maxed.ID, triggeredAt.Add(time.Minute))
	createNotifyExecutionLogForAutoRetry(t, database, "notify-auto-maxed-retry-2", "failed", maxed.ID, triggeredAt.Add(2*time.Minute))
	published := captureNotificationPublisher(t, nil)

	result, err := RetryFailedRuleExecutionNotificationsWithDB(database, RuleExecutionNotificationAutoRetryPolicy{
		SourceCode:  businessEventSourceProductionOutsource,
		MaxAttempts: 2,
		Limit:       10,
		MinAge:      time.Second,
	})

	require.NoError(t, err)
	require.Equal(t, 2, result.Scanned)
	require.Zero(t, result.Retried)
	require.Empty(t, result.Items)
	require.Empty(t, *published)
}

func createNotifyExecutionLogForAutoRetry(t *testing.T, database *gorm.DB, id string, status string, retryOfLogID string, triggeredAt time.Time) models.RuleExecutionLog {
	t.Helper()

	result := mustJSONRawMessage(map[string]any{})
	if retryOfLogID != "" {
		result = mustJSONRawMessage(map[string]string{"retryOfLogId": retryOfLogID})
	}
	logEntry := models.RuleExecutionLog{
		BaseModel:       models.BaseModel{ID: id},
		EventKey:        "PRODUCTION_OUTSOURCE:" + id,
		Entity:          businessEventEntitySystem,
		SourceCode:      businessEventSourceProductionOutsource,
		ActionCode:      businessEventActionStatusChange,
		StatusCode:      OutsourceOrderStatusReleased,
		RuleID:          "rule-outsource-event",
		RuleName:        "委外执行通知",
		SegmentID:       "segment-outsource-event",
		SegmentTitle:    "委外执行事件",
		ExecutionType:   "notify",
		ExecutionStatus: status,
		CommandID:       "cmd-outsource-event",
		Title:           "委外单 OSO-TEST-1 状态 RELEASED",
		Content:         "产品 产品一 / 条码 BC-001",
		ActionURL:       "/production-outsourcing/transfers?search=OSO-TEST-1",
		Targets:         mustJSONRawMessage([]string{"planner"}),
		Metadata:        mustJSONRawMessage(map[string]any{"outsourceOrderNo": "OSO-TEST-1"}),
		Result:          result,
		TriggeredAt:     triggeredAt,
	}
	require.NoError(t, database.Create(&logEntry).Error)
	return logEntry
}
