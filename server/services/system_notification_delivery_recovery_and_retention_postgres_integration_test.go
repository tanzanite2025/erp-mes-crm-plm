package services

import (
	"context"
	"errors"
	"testing"
	"time"
	"xdfc-server/authz"
	"xdfc-server/db"
	"xdfc-server/models"

	"github.com/google/uuid"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

func createNotificationReceiptWithExecutionLogForDeliveryRetentionPostgresTest(t *testing.T, fixture qualityStandardWorkflowPostgresFixture, eventKey string) (models.SystemNotificationInboxEntry, models.WorkflowNotificationOutboxEntry) {
	t.Helper()
	logID := uuid.NewString()
	require.NoError(t, fixture.database.Create(&models.RuleExecutionLog{BaseModel: models.BaseModel{ID: logID}, ExecutionType: "notify", ExecutionStatus: "pending", TriggeredAt: time.Now().UTC()}).Error)
	var receipt models.SystemNotificationInboxEntry
	require.NoError(t, fixture.database.Transaction(func(tx *gorm.DB) error {
		var err error
		receipt, err = CreateSystemNotificationInboxEntryWithinTransaction(tx, SystemNotificationInboxCreationInput{RecipientUserID: fixture.reviewer.ID, EventKey: eventKey, PurposeKey: "retention-verification", SourceCode: "QUALITY_STANDARD", Title: "Original notification", Content: "Original content", ExecutionLogID: &logID})
		return err
	}))
	var task models.WorkflowNotificationOutboxEntry
	require.NoError(t, fixture.database.Where("inbox_entry_id = ?", receipt.ID).First(&task).Error)
	return receipt, task
}

func TestSystemNotificationDeliveryPostgresRecoveryPreservesStorageErrorsAndHonorsRequestCancellation(t *testing.T) {
	for _, blockedOperation := range []string{"queue-recovery-receipt-lock", "log-recovery-receipt-lock", "log-recovery-queue-query", "log-recovery-log-query"} {
		t.Run(blockedOperation, func(t *testing.T) {
			fixture := createIsolatedQualityStandardWorkflowPostgresFixture(t)
			receipt, task := createNotificationReceiptWithExecutionLogForDeliveryRetentionPostgresTest(t, fixture, blockedOperation)
			now := time.Now().UTC()
			require.NoError(t, fixture.database.Model(&task).Updates(map[string]any{"attempts": 12, "failed_at": now, "last_error": "original failure"}).Error)
			require.NoError(t, fixture.database.Model(&models.RuleExecutionLog{}).Where("id = ?", *task.ExecutionLogID).Update("execution_status", "failed").Error)
			blockingTransaction := fixture.database.Begin()
			require.NoError(t, blockingTransaction.Error)
			t.Cleanup(func() { _ = blockingTransaction.Rollback().Error })
			switch blockedOperation {
			case "log-recovery-queue-query":
				require.NoError(t, blockingTransaction.Exec("LOCK TABLE workflow_notification_outbox_entries IN ACCESS EXCLUSIVE MODE").Error)
			case "log-recovery-log-query":
				require.NoError(t, blockingTransaction.Exec("LOCK TABLE rule_execution_logs IN ACCESS EXCLUSIVE MODE").Error)
			default:
				require.NoError(t, blockingTransaction.Clauses(clause.Locking{Strength: "UPDATE"}).First(&models.SystemNotificationInboxEntry{}, "id = ?", receipt.ID).Error)
			}
			recoveryContext, cancel := context.WithTimeout(fixture.requestContext, 200*time.Millisecond)
			defer cancel()
			var err error
			if blockedOperation == "queue-recovery-receipt-lock" {
				err = RetryOriginalSystemNotificationDeliveryQueueTask(recoveryContext, fixture.database, task.ID)
			} else {
				_, err = RetryRuleExecutionNotificationLogWithContext(recoveryContext, fixture.database, *task.ExecutionLogID)
			}
			require.Error(t, err)
			require.ErrorIs(t, err, context.DeadlineExceeded, "all recovery reads and locks must honor the request deadline")
			require.NotErrorIs(t, err, ErrRuleExecutionLogNotRetryable, "storage failures must not be reported as an inactive task")
			require.ErrorIs(t, recoveryContext.Err(), context.DeadlineExceeded)
			require.NoError(t, blockingTransaction.Rollback().Error)
			var persistedTask models.WorkflowNotificationOutboxEntry
			require.NoError(t, fixture.database.First(&persistedTask, "id = ?", task.ID).Error)
			require.Equal(t, 12, persistedTask.Attempts)
			require.NotNil(t, persistedTask.FailedAt)
			require.Equal(t, "original failure", persistedTask.LastError)
			var logEntry models.RuleExecutionLog
			require.NoError(t, fixture.database.First(&logEntry, "id = ?", *task.ExecutionLogID).Error)
			require.Equal(t, "failed", logEntry.ExecutionStatus)
			var auditCount int64
			require.NoError(t, fixture.database.Model(&models.AuditLog{}).Count(&auditCount).Error)
			require.Zero(t, auditCount)
			_, err = RetryRuleExecutionNotificationLogWithContext(fixture.requestContext, fixture.database, *task.ExecutionLogID)
			require.NoError(t, err, "the same task can still be recovered after the storage lock is released")
		})
	}
}

func TestSystemNotificationDeliveryPostgresCancelsInactivePausedTasksAndPreservesRealPendingApproval(t *testing.T) {
	fixture := createIsolatedQualityStandardWorkflowPostgresFixture(t)
	createQualityStandardWorkflowIndependentApprovalPolicy(t, fixture, "")
	standard := saveQualityStandardWorkflowDraft(t, fixture)
	standard.Status = "PENDING_APPROVAL"
	require.NoError(t, SaveInspectionStandard(fixture.requestContext, &standard))
	var approvalReceipt models.SystemNotificationInboxEntry
	require.NoError(t, fixture.database.Where("approval_request_id = ? AND requires_action = ?", *standard.ApprovalRequestID, true).First(&approvalReceipt).Error)
	archivedReceipt, archivedTask := createNotificationReceiptWithExecutionLogForDeliveryRetentionPostgresTest(t, fixture, "will-be-archived")
	expiredReceipt, expiredTask := createNotificationReceiptWithExecutionLogForDeliveryRetentionPostgresTest(t, fixture, "will-expire")
	var criticalReceipt models.SystemNotificationInboxEntry
	require.NoError(t, fixture.database.Transaction(func(tx *gorm.DB) error {
		var err error
		criticalReceipt, err = CreateSystemNotificationInboxEntryWithinTransaction(tx, SystemNotificationInboxCreationInput{RecipientUserID: fixture.reviewer.ID, EventKey: "still-critical", PurposeKey: "retention-verification", SourceCode: "SYSTEM_ALERT", Priority: "critical", Title: "Still unresolved"})
		return err
	}))
	previousPublisher := currentNotificationPublisher
	currentNotificationPublisher = func(context.Context, string, string) error { return errors.New("isolated delivery failure") }
	t.Cleanup(func() { currentNotificationPublisher = previousPublisher })
	now := time.Now().UTC().Add(time.Second)
	for attempt := range 12 {
		_, err := DeliverCommittedWorkflowNotifications(context.Background(), fixture.database, now.Add(time.Duration(attempt)*10*time.Minute), 20)
		require.NoError(t, err)
	}
	diagnostics, err := GetSystemNotificationDeliveryQueueDiagnostics(context.Background(), fixture.database)
	require.NoError(t, err)
	require.EqualValues(t, 4, diagnostics.FailedCount)
	require.NoError(t, UpdateSystemNotificationInboxAccountState(context.Background(), fixture.database, fixture.reviewer.ID, []string{authz.MenuQuality}, []string{archivedReceipt.ID}, "archive"))
	require.NoError(t, fixture.database.Model(&expiredReceipt).Update("expires_at", now.Add(-time.Second)).Error)
	publications := 0
	currentNotificationPublisher = func(context.Context, string, string) error { publications++; return nil }
	delivered, err := DeliverCommittedWorkflowNotifications(context.Background(), fixture.database, now.Add(3*time.Hour), 20)
	require.NoError(t, err)
	require.Equal(t, 1, delivered, "only the account-state refresh is published; inactive and paused receipts are not republished")
	require.Equal(t, 1, publications)
	for _, task := range []models.WorkflowNotificationOutboxEntry{archivedTask, expiredTask} {
		var persisted models.WorkflowNotificationOutboxEntry
		require.NoError(t, fixture.database.First(&persisted, "id = ?", task.ID).Error)
		require.NotNil(t, persisted.CanceledAt, "inactive paused tasks must leave the recoverable queue")
		require.Nil(t, persisted.DeliveredAt)
		require.Equal(t, 12, persisted.Attempts)
		var log models.RuleExecutionLog
		require.NoError(t, fixture.database.First(&log, "id = ?", *task.ExecutionLogID).Error)
		require.Equal(t, "skipped", log.ExecutionStatus)
		require.ErrorIs(t, RetryOriginalSystemNotificationDeliveryQueueTask(fixture.requestContext, fixture.database, task.ID), ErrRuleExecutionLogNotRetryable)
	}
	diagnostics, err = GetSystemNotificationDeliveryQueueDiagnostics(context.Background(), fixture.database)
	require.NoError(t, err)
	require.EqualValues(t, 2, diagnostics.FailedCount, "the real pending approval and unresolved critical alert remain recoverable")
	var approvalTask models.WorkflowNotificationOutboxEntry
	require.NoError(t, fixture.database.Where("inbox_entry_id = ?", approvalReceipt.ID).First(&approvalTask).Error)
	require.NoError(t, RetryOriginalSystemNotificationDeliveryQueueTask(fixture.requestContext, fixture.database, approvalTask.ID))
	delivered, err = DeliverCommittedWorkflowNotifications(context.Background(), fixture.database, now.Add(4*time.Hour), 20)
	require.NoError(t, err)
	require.Equal(t, 1, delivered)
	require.NoError(t, fixture.database.First(&approvalTask, "id = ?", approvalTask.ID).Error)
	require.Equal(t, 13, approvalTask.Attempts)
	require.NotNil(t, approvalTask.DeliveredAt)

	require.NoError(t, PurgeRetainedSystemNotificationDeliveryAndInboxRecords(context.Background(), fixture.database, now.AddDate(0, 0, 400)))
	var receipts []models.SystemNotificationInboxEntry
	require.NoError(t, fixture.database.Order("id").Find(&receipts).Error)
	require.Len(t, receipts, 2, "expired and archived history is eventually purged, without purging active business reminders")
	for _, receipt := range receipts {
		require.Contains(t, []string{approvalReceipt.ID, criticalReceipt.ID}, receipt.ID)
		require.Nil(t, receipt.ReadAt)
		require.Nil(t, receipt.ResolvedAt)
	}
	require.NoError(t, fixture.database.First(&standard, "id = ?", standard.ID).Error)
	require.Equal(t, "PENDING_APPROVAL", standard.Status)
	var request models.ApprovalRequest
	require.NoError(t, fixture.database.First(&request, "id = ?", *standard.ApprovalRequestID).Error)
	require.Equal(t, "PENDING", request.Status, "delivery and retention never decide a real approval")
	var criticalTask models.WorkflowNotificationOutboxEntry
	require.NoError(t, fixture.database.Where("inbox_entry_id = ?", criticalReceipt.ID).First(&criticalTask).Error)
	require.NotNil(t, criticalTask.FailedAt)
	require.Nil(t, criticalTask.CanceledAt)
}

func TestSystemNotificationDeliveryPostgresInactiveCancellationRollsBackWhenExecutionLogUpdateFails(t *testing.T) {
	fixture := createIsolatedQualityStandardWorkflowPostgresFixture(t)
	receipt, task := createNotificationReceiptWithExecutionLogForDeliveryRetentionPostgresTest(t, fixture, "cancellation-rollback")
	now := time.Now().UTC()
	require.NoError(t, fixture.database.Model(&receipt).Update("expires_at", now.Add(-time.Second)).Error)
	require.NoError(t, fixture.database.Model(&task).Updates(map[string]any{"attempts": 12, "failed_at": now, "last_error": "isolated transport failure"}).Error)
	require.NoError(t, fixture.database.Model(&models.RuleExecutionLog{}).Where("id = ?", *task.ExecutionLogID).Update("execution_status", "failed").Error)
	require.NoError(t, fixture.database.Exec(`CREATE FUNCTION reject_inactive_notification_cancellation_log() RETURNS trigger AS $$ BEGIN IF NEW.execution_status = 'skipped' THEN RAISE EXCEPTION 'forced cancellation log failure'; END IF; RETURN NEW; END; $$ LANGUAGE plpgsql`).Error)
	require.NoError(t, fixture.database.Exec(`CREATE TRIGGER reject_inactive_notification_cancellation_log BEFORE UPDATE ON rule_execution_logs FOR EACH ROW EXECUTE FUNCTION reject_inactive_notification_cancellation_log()`).Error)
	previousPublisher := currentNotificationPublisher
	publications := 0
	currentNotificationPublisher = func(context.Context, string, string) error { publications++; return nil }
	t.Cleanup(func() { currentNotificationPublisher = previousPublisher })
	_, err := DeliverCommittedWorkflowNotifications(context.Background(), fixture.database, now.Add(time.Second), 10)
	require.ErrorContains(t, err, "forced cancellation log failure")
	require.NoError(t, fixture.database.First(&task, "id = ?", task.ID).Error)
	require.Nil(t, task.CanceledAt)
	require.NotNil(t, task.FailedAt)
	require.Equal(t, 12, task.Attempts)
	require.Zero(t, publications)
	require.NoError(t, fixture.database.Exec(`DROP TRIGGER reject_inactive_notification_cancellation_log ON rule_execution_logs`).Error)
	_, err = DeliverCommittedWorkflowNotifications(context.Background(), fixture.database, now.Add(time.Second), 10)
	require.NoError(t, err)
	require.NoError(t, fixture.database.First(&task, "id = ?", task.ID).Error)
	require.NotNil(t, task.CanceledAt)
	require.Zero(t, publications)
}

func TestSystemNotificationDeliveryPostgresUnavailableRedisDoesNotBlockInactiveTaskCancellation(t *testing.T) {
	fixture := createIsolatedQualityStandardWorkflowPostgresFixture(t)
	expiredReceipt, pausedTask := createNotificationReceiptWithExecutionLogForDeliveryRetentionPostgresTest(t, fixture, "expired-without-redis")
	activeReceipt, deferredTask := createNotificationReceiptWithExecutionLogForDeliveryRetentionPostgresTest(t, fixture, "deferred-without-redis")
	now := time.Now().UTC().Add(time.Second)
	require.NoError(t, fixture.database.Model(&expiredReceipt).Update("expires_at", now.Add(-time.Second)).Error)
	require.NoError(t, fixture.database.Model(&pausedTask).Updates(map[string]any{"attempts": 12, "failed_at": now, "next_attempt_at": now.Add(time.Hour)}).Error)
	previousPublisher, previousRedis := currentNotificationPublisher, db.RDB
	currentNotificationPublisher, db.RDB = publishNotificationToRedis, nil
	t.Cleanup(func() { currentNotificationPublisher, db.RDB = previousPublisher, previousRedis })
	delivered, err := DeliverCommittedWorkflowNotifications(context.Background(), fixture.database, now, 10)
	require.NoError(t, err)
	require.Zero(t, delivered)
	require.NoError(t, fixture.database.First(&pausedTask, "id = ?", pausedTask.ID).Error)
	require.NotNil(t, pausedTask.CanceledAt)
	require.Equal(t, 12, pausedTask.Attempts)
	require.NoError(t, fixture.database.First(&deferredTask, "id = ?", deferredTask.ID).Error)
	require.Equal(t, 1, deferredTask.Attempts)
	require.Contains(t, deferredTask.LastError, "Redis connection is unavailable")
	require.True(t, deferredTask.NextAttemptAt.After(now))
	require.NoError(t, UpdateSystemNotificationInboxAccountState(context.Background(), fixture.database, fixture.reviewer.ID, []string{authz.MenuQuality}, []string{activeReceipt.ID}, "archive"))
	delivered, err = DeliverCommittedWorkflowNotifications(context.Background(), fixture.database, now, 10)
	require.NoError(t, err)
	require.Zero(t, delivered)
	require.NoError(t, fixture.database.First(&deferredTask, "id = ?", deferredTask.ID).Error)
	require.NotNil(t, deferredTask.CanceledAt, "archiving cancels a deferred task before its next scheduled transport attempt")
	require.Equal(t, 1, deferredTask.Attempts)
}

func TestSystemNotificationDeliveryPostgresRetentionSkipsLockedReceiptsAndTasksThenPurgesAfterRelease(t *testing.T) {
	for _, lockedRecord := range []string{"receipt", "task"} {
		t.Run(lockedRecord, func(t *testing.T) {
			fixture := createIsolatedQualityStandardWorkflowPostgresFixture(t)
			receipt, task := createNotificationReceiptWithExecutionLogForDeliveryRetentionPostgresTest(t, fixture, "locked-retention-record")
			now := time.Now().UTC()
			longAgo := now.AddDate(0, 0, -200)
			require.NoError(t, fixture.database.Model(&receipt).Update("expires_at", longAgo).Error)
			require.NoError(t, fixture.database.Model(&task).Update("delivered_at", longAgo).Error)
			blockingTransaction := fixture.database.Begin()
			require.NoError(t, blockingTransaction.Error)
			t.Cleanup(func() { _ = blockingTransaction.Rollback().Error })
			if lockedRecord == "receipt" {
				require.NoError(t, blockingTransaction.Clauses(clause.Locking{Strength: "UPDATE"}).First(&models.SystemNotificationInboxEntry{}, "id = ?", receipt.ID).Error)
			} else {
				require.NoError(t, blockingTransaction.Clauses(clause.Locking{Strength: "UPDATE"}).First(&models.WorkflowNotificationOutboxEntry{}, "id = ?", task.ID).Error)
			}
			cleanupContext, cancel := context.WithTimeout(context.Background(), time.Second)
			defer cancel()
			require.NoError(t, PurgeRetainedSystemNotificationDeliveryAndInboxRecords(cleanupContext, fixture.database, now), "a concurrent employee operation, retry or worker must not stall the cleanup batch")
			var remaining int64
			lockedModel := any(&models.SystemNotificationInboxEntry{})
			if lockedRecord == "task" {
				lockedModel = &models.WorkflowNotificationOutboxEntry{}
			}
			require.NoError(t, fixture.database.Model(lockedModel).Count(&remaining).Error)
			require.EqualValues(t, 1, remaining)
			require.NoError(t, blockingTransaction.Rollback().Error)
			require.NoError(t, PurgeRetainedSystemNotificationDeliveryAndInboxRecords(context.Background(), fixture.database, now))
			for _, model := range []any{&models.SystemNotificationInboxEntry{}, &models.WorkflowNotificationOutboxEntry{}} {
				require.NoError(t, fixture.database.Model(model).Count(&remaining).Error)
				require.Zero(t, remaining)
			}
		})
	}
}

func TestSystemNotificationDeliveryPostgresRecoveryAuditFailurePreservesOriginalPausedTaskAndReceipt(t *testing.T) {
	fixture := createIsolatedQualityStandardWorkflowPostgresFixture(t)
	receipt, task := createNotificationReceiptWithExecutionLogForDeliveryRetentionPostgresTest(t, fixture, "recovery-audit-rollback")
	now := time.Now().UTC()
	nextAttemptAt := now.Add(time.Hour)
	require.NoError(t, fixture.database.Model(&task).Updates(map[string]any{"attempts": 12, "failed_at": now, "next_attempt_at": nextAttemptAt, "last_error": "original failure"}).Error)
	require.NoError(t, fixture.database.Model(&models.RuleExecutionLog{}).Where("id = ?", *task.ExecutionLogID).Update("execution_status", "failed").Error)
	require.NoError(t, fixture.database.Exec(`CREATE FUNCTION reject_notification_recovery_audit() RETURNS trigger AS $$ BEGIN IF NEW.module = 'SystemNotificationDelivery' THEN RAISE EXCEPTION 'forced recovery audit failure'; END IF; RETURN NEW; END; $$ LANGUAGE plpgsql`).Error)
	require.NoError(t, fixture.database.Exec(`CREATE TRIGGER reject_notification_recovery_audit BEFORE INSERT ON audit_logs FOR EACH ROW EXECUTE FUNCTION reject_notification_recovery_audit()`).Error)
	require.ErrorContains(t, RetryOriginalSystemNotificationDeliveryQueueTask(fixture.requestContext, fixture.database, task.ID), "forced recovery audit failure")
	require.NoError(t, fixture.database.First(&task, "id = ?", task.ID).Error)
	require.NotNil(t, task.FailedAt)
	require.Equal(t, 12, task.Attempts)
	require.WithinDuration(t, nextAttemptAt, task.NextAttemptAt, time.Microsecond)
	require.Equal(t, "original failure", task.LastError)
	var log models.RuleExecutionLog
	require.NoError(t, fixture.database.First(&log, "id = ?", *task.ExecutionLogID).Error)
	require.Equal(t, "failed", log.ExecutionStatus)
	require.NoError(t, fixture.database.Exec(`DROP TRIGGER reject_notification_recovery_audit ON audit_logs`).Error)
	require.NoError(t, RetryOriginalSystemNotificationDeliveryQueueTask(fixture.requestContext, fixture.database, task.ID))
	var recovered models.WorkflowNotificationOutboxEntry
	require.NoError(t, fixture.database.First(&recovered, "id = ?", task.ID).Error)
	require.Nil(t, recovered.FailedAt)
	require.Equal(t, 12, recovered.Attempts)
	require.Equal(t, receipt.ID, *recovered.InboxEntryID)
	var auditCount, receiptCount, taskCount int64
	require.NoError(t, fixture.database.Model(&models.AuditLog{}).Where("module = ? AND target_id = ? AND action = ?", "SystemNotificationDelivery", task.ID, "retry_original_task").Count(&auditCount).Error)
	require.EqualValues(t, 1, auditCount)
	require.NoError(t, fixture.database.Model(&models.SystemNotificationInboxEntry{}).Count(&receiptCount).Error)
	require.NoError(t, fixture.database.Model(&models.WorkflowNotificationOutboxEntry{}).Count(&taskCount).Error)
	require.EqualValues(t, 1, receiptCount)
	require.EqualValues(t, 1, taskCount)
	require.NoError(t, fixture.database.First(&receipt, "id = ?", receipt.ID).Error)
	require.Nil(t, receipt.ReadAt)
	require.Nil(t, receipt.ArchivedAt)
	require.Nil(t, receipt.ResolvedAt)
}

func TestSystemNotificationDeliveryPostgresRetentionEnforcesFiveHundredRecordLimitsForBothTables(t *testing.T) {
	fixture := createIsolatedQualityStandardWorkflowPostgresFixture(t)
	now := time.Now().UTC()
	longAgo := now.AddDate(0, 0, -200)
	receipts := make([]models.SystemNotificationInboxEntry, 501)
	tasks := make([]models.WorkflowNotificationOutboxEntry, len(receipts))
	for index := range receipts {
		receiptID := uuid.NewString()
		receipts[index] = models.SystemNotificationInboxEntry{ID: receiptID, RecipientUserID: fixture.reviewer.ID, DeduplicationKey: uuid.NewString(), EventKey: receiptID, PurposeKey: "bounded-retention", SourceCode: "QUALITY_STANDARD", NotificationType: "QUALITY_STANDARD_EVENT", Priority: "info", Metadata: mustJSONRawMessage(map[string]any{}), ExpiresAt: &longAgo, CreatedAt: longAgo}
		tasks[index] = models.WorkflowNotificationOutboxEntry{BaseModel: models.BaseModel{ID: uuid.NewString(), CreatedAt: longAgo, UpdatedAt: longAgo}, InboxEntryID: &receipts[index].ID, Payload: mustJSONRawMessage(map[string]any{}), DeliveredAt: &longAgo, NextAttemptAt: longAgo}
	}
	require.NoError(t, fixture.database.CreateInBatches(receipts, 100).Error)
	require.NoError(t, fixture.database.CreateInBatches(tasks, 100).Error)
	require.NoError(t, PurgeRetainedSystemNotificationDeliveryAndInboxRecords(context.Background(), fixture.database, now))
	for _, model := range []any{&models.SystemNotificationInboxEntry{}, &models.WorkflowNotificationOutboxEntry{}} {
		var remaining int64
		require.NoError(t, fixture.database.Model(model).Count(&remaining).Error)
		require.EqualValues(t, 1, remaining)
	}
	require.NoError(t, PurgeRetainedSystemNotificationDeliveryAndInboxRecords(context.Background(), fixture.database, now))
	for _, model := range []any{&models.SystemNotificationInboxEntry{}, &models.WorkflowNotificationOutboxEntry{}} {
		var remaining int64
		require.NoError(t, fixture.database.Model(model).Count(&remaining).Error)
		require.Zero(t, remaining)
	}
}

func TestSystemNotificationDeliveryPostgresRetentionRollsBackReceiptDeletionWhenQueueDeletionFails(t *testing.T) {
	fixture := createIsolatedQualityStandardWorkflowPostgresFixture(t)
	receipt, task := createNotificationReceiptWithExecutionLogForDeliveryRetentionPostgresTest(t, fixture, "retention-atomic-rollback")
	now := time.Now().UTC()
	longAgo := now.AddDate(0, 0, -200)
	require.NoError(t, fixture.database.Model(&receipt).Update("expires_at", longAgo).Error)
	require.NoError(t, fixture.database.Model(&task).Update("delivered_at", longAgo).Error)
	require.NoError(t, fixture.database.Exec(`CREATE FUNCTION reject_notification_retention_queue_deletion() RETURNS trigger AS $$ BEGIN RAISE EXCEPTION 'forced retention queue deletion failure'; END; $$ LANGUAGE plpgsql`).Error)
	require.NoError(t, fixture.database.Exec(`CREATE TRIGGER reject_notification_retention_queue_deletion BEFORE DELETE ON workflow_notification_outbox_entries FOR EACH ROW EXECUTE FUNCTION reject_notification_retention_queue_deletion()`).Error)
	require.ErrorContains(t, PurgeRetainedSystemNotificationDeliveryAndInboxRecords(context.Background(), fixture.database, now), "forced retention queue deletion failure")
	require.NoError(t, fixture.database.First(&receipt, "id = ?", receipt.ID).Error)
	require.NoError(t, fixture.database.First(&task, "id = ?", task.ID).Error)
	require.NoError(t, fixture.database.Exec(`DROP TRIGGER reject_notification_retention_queue_deletion ON workflow_notification_outbox_entries`).Error)
	require.NoError(t, PurgeRetainedSystemNotificationDeliveryAndInboxRecords(context.Background(), fixture.database, now))
	for _, model := range []any{&models.SystemNotificationInboxEntry{}, &models.WorkflowNotificationOutboxEntry{}} {
		var remaining int64
		require.NoError(t, fixture.database.Model(model).Count(&remaining).Error)
		require.Zero(t, remaining)
	}
}
