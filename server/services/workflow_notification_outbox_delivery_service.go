package services

import (
	"context"
	"log"
	"time"
	"xdfc-server/db"
	"xdfc-server/models"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

func activeSystemNotificationInboxEntriesForDeliveryQuery(tx *gorm.DB, now time.Time) *gorm.DB {
	return tx.Model(&models.SystemNotificationInboxEntry{}).Where("resolved_at IS NULL AND archived_at IS NULL AND (expires_at IS NULL OR expires_at > ?)", now)
}

// DeliverCommittedWorkflowNotifications claims committed rows with SKIP LOCKED
// so multiple API instances can share the queue. A crash after publishing may
// deliver the same stable message ID again; approval creation is never retried.
func DeliverCommittedWorkflowNotifications(ctx context.Context, database *gorm.DB, now time.Time, limit int) (int, error) {
	delivered := 0
	for range limit {
		found := false
		err := database.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
			var entry models.WorkflowNotificationOutboxEntry
			activeReceipt := activeSystemNotificationInboxEntriesForDeliveryQuery(tx, now).Select("1").Where("id = workflow_notification_outbox_entries.inbox_entry_id")
			// Inactive receipts release paused or deferred tasks through the same cancellation path.
			query := tx.Clauses(clause.Locking{Strength: "UPDATE", Options: "SKIP LOCKED"}).
				Where("delivered_at IS NULL AND canceled_at IS NULL").
				Where("((failed_at IS NULL AND next_attempt_at <= ?) OR (inbox_entry_id IS NOT NULL AND NOT EXISTS (?)))", now, activeReceipt).
				Order("created_at asc, id asc").Limit(1).Find(&entry)
			if query.Error != nil {
				return query.Error
			}
			if query.RowsAffected == 0 {
				return nil
			}
			found = true
			if entry.InboxEntryID != nil {
				var active int64
				// This read deliberately takes no inbox row lock. Resolution locks
				// inbox then cancels outbox; hints contain no old business content.
				if err := activeSystemNotificationInboxEntriesForDeliveryQuery(tx, now).Where("id = ?", *entry.InboxEntryID).Count(&active).Error; err != nil {
					return err
				}
				if active == 0 {
					if err := tx.Model(&entry).Update("canceled_at", now).Error; err != nil {
						return err
					}
					if entry.ExecutionLogID != nil {
						return tx.Model(&models.RuleExecutionLog{}).Where("id = ?", *entry.ExecutionLogID).Updates(map[string]any{"execution_status": "skipped", "error_message": "notification no longer active"}).Error
					}
					return nil
				}
			}
			publishContext, cancel := context.WithTimeout(ctx, 5*time.Second)
			defer cancel()
			publishErr := publishNotificationPayload(publishContext, notificationChannel, string(entry.Payload))
			updates := map[string]any{"attempts": entry.Attempts + 1, "last_error": ""}
			status := "success"
			if publishErr == nil {
				updates["delivered_at"] = now
			} else {
				status = "failed"
				delay := min(time.Duration(entry.Attempts+1)*10*time.Second, 5*time.Minute)
				updates["next_attempt_at"] = now.Add(delay)
				updates["last_error"] = publishErr.Error()
				if entry.Attempts+1 >= 12 {
					updates["failed_at"] = now
				}
			}
			if err := tx.Model(&entry).Updates(updates).Error; err != nil {
				return err
			}
			if entry.ExecutionLogID != nil {
				if err := tx.Model(&models.RuleExecutionLog{}).Where("id = ?", *entry.ExecutionLogID).
					Updates(map[string]any{"execution_status": status, "error_message": updates["last_error"]}).Error; err != nil {
					return err
				}
			}
			if publishErr == nil {
				delivered++
			}
			return nil
		})
		if err != nil {
			return delivered, err
		}
		if !found {
			break
		}
	}
	return delivered, nil
}

func StartWorkflowNotificationOutboxDeliveryWorker(ctx context.Context) {
	go func() {
		ticker := time.NewTicker(2 * time.Second)
		nextCleanup := time.Now().UTC()
		defer ticker.Stop()
		for {
			select {
			case <-ctx.Done():
				return
			case now := <-ticker.C:
				if !now.Before(nextCleanup) {
					if err := PurgeRetainedSystemNotificationDeliveryAndInboxRecords(ctx, db.DB, now.UTC()); err != nil {
						log.Printf("[WARN] Notification retention cleanup failed: %v", err)
					}
					nextCleanup = now.Add(time.Hour)
				}
				// Unavailable Redis is a recorded transport failure; cancellation only needs PostgreSQL.
				if _, err := DeliverCommittedWorkflowNotifications(ctx, db.DB, now.UTC(), 50); err != nil {
					log.Printf("[WARN] Workflow notification outbox delivery failed: %v", err)
				}
			}
		}
	}()
}
