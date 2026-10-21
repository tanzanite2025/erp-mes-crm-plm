package services

import (
	"context"
	"errors"
	"github.com/google/uuid"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
	"time"
	"xdfc-server/models"
)

type SystemNotificationDeliveryQueueTaskSummary struct {
	ID            string     `json:"id"`
	InboxEntryID  *string    `json:"notificationId"`
	Attempts      int        `json:"attempts"`
	CreatedAt     time.Time  `json:"createdAt"`
	NextAttemptAt time.Time  `json:"nextAttemptAt"`
	FailedAt      *time.Time `json:"failedAt"`
	LastError     string     `json:"lastError"`
}

type SystemNotificationDeliveryQueueDiagnostics struct {
	PendingCount    int64                                        `json:"pendingCount"`
	FailedCount     int64                                        `json:"failedCount"`
	OldestPendingAt *time.Time                                   `json:"oldestPendingAt"`
	RecentFailures  []SystemNotificationDeliveryQueueTaskSummary `json:"recentFailures"`
}

func GetSystemNotificationDeliveryQueueDiagnostics(ctx context.Context, database *gorm.DB) (SystemNotificationDeliveryQueueDiagnostics, error) {
	result := SystemNotificationDeliveryQueueDiagnostics{RecentFailures: []SystemNotificationDeliveryQueueTaskSummary{}}
	pending := func() *gorm.DB {
		return database.WithContext(ctx).Model(&models.WorkflowNotificationOutboxEntry{}).Where("delivered_at IS NULL AND canceled_at IS NULL")
	}
	if err := pending().Where("failed_at IS NULL").Count(&result.PendingCount).Error; err != nil {
		return result, err
	}
	if err := pending().Where("failed_at IS NOT NULL").Count(&result.FailedCount).Error; err != nil {
		return result, err
	}
	var oldest struct{ OldestPendingAt *time.Time }
	if err := pending().Select("MIN(created_at) AS oldest_pending_at").Scan(&oldest).Error; err != nil {
		return result, err
	}
	result.OldestPendingAt = oldest.OldestPendingAt
	err := pending().Where("last_error <> ''").Order("updated_at DESC").Limit(30).Find(&result.RecentFailures).Error
	return result, err
}

// Retry resets the original task, never recreates the business notification.
// Lock order is inbox then outbox, the same order as business resolution.
func RetryOriginalSystemNotificationDeliveryQueueTask(ctx context.Context, database *gorm.DB, taskID string) error {
	if uuid.Validate(taskID) != nil {
		return ErrSystemNotificationInboxInputInvalid
	}
	return database.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var task models.WorkflowNotificationOutboxEntry
		if err := tx.First(&task, "id = ?", taskID).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return ErrRuleExecutionLogNotRetryable
			}
			return err
		}
		now := time.Now().UTC()
		if task.InboxEntryID != nil {
			var receipt models.SystemNotificationInboxEntry
			if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&receipt, "id = ?", *task.InboxEntryID).Error; err != nil {
				if errors.Is(err, gorm.ErrRecordNotFound) {
					return ErrRuleExecutionLogNotRetryable
				}
				return err
			}
			if receipt.ResolvedAt != nil || receipt.ArchivedAt != nil || receipt.ExpiresAt != nil && !receipt.ExpiresAt.After(now) {
				return ErrRuleExecutionLogNotRetryable
			}
		}
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&task, "id = ?", taskID).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return ErrRuleExecutionLogNotRetryable
			}
			return err
		}
		if task.DeliveredAt != nil || task.CanceledAt != nil || task.Attempts == 0 {
			return ErrRuleExecutionLogNotRetryable
		}
		if err := tx.Model(&task).Updates(map[string]any{"failed_at": nil, "next_attempt_at": now, "last_error": ""}).Error; err != nil {
			return err
		}
		if task.ExecutionLogID != nil {
			if err := tx.Model(&models.RuleExecutionLog{}).Where("id = ?", *task.ExecutionLogID).Updates(map[string]any{"execution_status": "pending", "error_message": ""}).Error; err != nil {
				return err
			}
		}
		return recordLegacyAuditEntryWithContext(ctx, tx, "SystemNotificationDelivery", task.ID, "retry_original_task", nil)
	})
}

// Bounded cleanup uses terminal timestamps. Active approvals and unresolved
// critical alerts have no automatic expiry and are never removed here.
func PurgeRetainedSystemNotificationDeliveryAndInboxRecords(ctx context.Context, database *gorm.DB, now time.Time) error {
	return database.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		// Match employee operations and manual recovery: inbox before outbox.
		// Locked records stay available for a later bounded cleanup batch.
		liveTasks := tx.Model(&models.WorkflowNotificationOutboxEntry{}).Select("1").Where("inbox_entry_id = system_notification_inbox_entries.id AND delivered_at IS NULL AND canceled_at IS NULL")
		var receipts []models.SystemNotificationInboxEntry
		if err := tx.Select("id").Clauses(clause.Locking{Strength: "UPDATE", Options: "SKIP LOCKED"}).Where("NOT EXISTS (?)", liveTasks).
			Where("archived_at < ? OR resolved_at < ? OR expires_at < ?", now.AddDate(0, 0, -180), now.AddDate(0, 0, -180), now.AddDate(0, 0, -180)).
			Order("id").Limit(500).Find(&receipts).Error; err != nil {
			return err
		}
		if len(receipts) > 0 {
			receiptIDs := make([]string, 0, len(receipts))
			for _, receipt := range receipts {
				receiptIDs = append(receiptIDs, receipt.ID)
			}
			if err := tx.Where("id IN ?", receiptIDs).Delete(&models.SystemNotificationInboxEntry{}).Error; err != nil {
				return err
			}
		}
		var tasks []models.WorkflowNotificationOutboxEntry
		if err := tx.Select("id").Clauses(clause.Locking{Strength: "UPDATE", Options: "SKIP LOCKED"}).
			Where("delivered_at < ? OR canceled_at < ?", now.AddDate(0, 0, -30), now.AddDate(0, 0, -30)).Order("id").Limit(500).Find(&tasks).Error; err != nil {
			return err
		}
		if len(tasks) == 0 {
			return nil
		}
		queueIDs := make([]string, 0, len(tasks))
		for _, task := range tasks {
			queueIDs = append(queueIDs, task.ID)
		}
		return tx.Unscoped().Where("id IN ?", queueIDs).Delete(&models.WorkflowNotificationOutboxEntry{}).Error
	})
}
