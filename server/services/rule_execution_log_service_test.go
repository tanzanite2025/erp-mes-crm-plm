package services

import (
	"context"
	"errors"
	"github.com/google/uuid"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
	"testing"
	"time"
	"xdfc-server/models"
)

func TestRetryRuleExecutionNotificationReschedulesOriginalTaskWithoutNewReceiptOrDirectPublish(t *testing.T) {
	fixture := createIsolatedQualityStandardWorkflowPostgresFixture(t)
	logID := uuid.NewString()
	logEntry := models.RuleExecutionLog{BaseModel: models.BaseModel{ID: logID}, SourceCode: businessEventSourceProductionOutsource, ExecutionType: "notify", ExecutionStatus: "pending", TriggeredAt: time.Now().UTC()}
	require.NoError(t, fixture.database.Create(&logEntry).Error)
	var receipt models.SystemNotificationInboxEntry
	require.NoError(t, fixture.database.Transaction(func(tx *gorm.DB) error {
		var err error
		receipt, err = CreateSystemNotificationInboxEntryWithinTransaction(tx, SystemNotificationInboxCreationInput{RecipientUserID: fixture.reviewer.ID, EventKey: "retry-event", PurposeKey: "test", SourceCode: businessEventSourceProductionOutsource, ExecutionLogID: &logID})
		return err
	}))
	previousPublisher := currentNotificationPublisher
	attempts := 0
	currentNotificationPublisher = func(context.Context, string, string) error {
		attempts++
		return errors.New("isolated transport failure")
	}
	t.Cleanup(func() { currentNotificationPublisher = previousPublisher })
	now := time.Now().UTC().Add(time.Second)
	for attempt := range 12 {
		_, err := DeliverCommittedWorkflowNotifications(context.Background(), fixture.database, now.Add(time.Duration(attempt)*10*time.Minute), 10)
		require.NoError(t, err)
	}
	diagnostics, err := GetSystemNotificationDeliveryQueueDiagnostics(context.Background(), fixture.database)
	require.NoError(t, err)
	require.EqualValues(t, 1, diagnostics.FailedCount)
	require.Len(t, diagnostics.RecentFailures, 1)
	failedNotifications, err := loadOutsourceDiagnosticsUnresolvedNotificationFailures(fixture.database)
	require.NoError(t, err)
	require.Len(t, failedNotifications, 1)
	require.Equal(t, logID, failedNotifications[0].ID)
	taskID := diagnostics.RecentFailures[0].ID
	retried, err := RetryRuleExecutionNotificationLogWithDB(fixture.database, logID)
	require.NoError(t, err)
	require.Equal(t, logID, retried.ID)
	require.Equal(t, "pending", retried.ExecutionStatus)
	failedNotifications, err = loadOutsourceDiagnosticsUnresolvedNotificationFailures(fixture.database)
	require.NoError(t, err)
	require.Empty(t, failedNotifications)
	require.Equal(t, 12, attempts, "manual recovery only schedules the existing task")
	var count int64
	require.NoError(t, fixture.database.Model(&models.SystemNotificationInboxEntry{}).Count(&count).Error)
	require.EqualValues(t, 1, count)
	currentNotificationPublisher = func(context.Context, string, string) error { attempts++; return nil }
	delivered, err := DeliverCommittedWorkflowNotifications(context.Background(), fixture.database, now.Add(3*time.Hour), 10)
	require.NoError(t, err)
	require.Equal(t, 1, delivered)
	var task models.WorkflowNotificationOutboxEntry
	require.NoError(t, fixture.database.First(&task, "id = ?", taskID).Error)
	require.Equal(t, receipt.ID, *task.InboxEntryID)
	require.Equal(t, 13, task.Attempts)
	failedNotifications, err = loadOutsourceDiagnosticsUnresolvedNotificationFailures(fixture.database)
	require.NoError(t, err)
	require.Empty(t, failedNotifications)
	require.NoError(t, fixture.database.Model(&models.RuleExecutionLog{}).Count(&count).Error)
	require.EqualValues(t, 1, count, "recovery and diagnostics share the original execution log")
	_, err = RetryRuleExecutionNotificationLogWithDB(fixture.database, logID)
	require.ErrorIs(t, err, ErrRuleExecutionLogNotRetryable)
}

func TestRetryRuleExecutionNotificationRejectsHistoricalLogWithoutOriginalQueueTask(t *testing.T) {
	fixture := createIsolatedQualityStandardWorkflowPostgresFixture(t)
	logEntry := models.RuleExecutionLog{BaseModel: models.BaseModel{ID: uuid.NewString()}, ExecutionType: "notify", ExecutionStatus: "failed", TriggeredAt: time.Now().UTC()}
	require.NoError(t, fixture.database.Create(&logEntry).Error)
	_, err := RetryRuleExecutionNotificationLogWithDB(fixture.database, logEntry.ID)
	require.ErrorIs(t, err, ErrRuleExecutionLogNotRetryable)
}
