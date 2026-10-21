package db

import (
	"gorm.io/gorm"
	"time"
	"xdfc-server/models"
)

// Cancel replaced payloads without inventing historical receipts. New outbox
// entries contain only account-specific NotificationInbox refresh hints.
func cancelReplacedWorkflowNotificationPayloadTasks(database *gorm.DB) error {
	return database.Transaction(func(tx *gorm.DB) error {
		previousTasks := tx.Model(&models.WorkflowNotificationOutboxEntry{}).Select("id").Where("inbox_entry_id IS NULL AND delivered_at IS NULL AND canceled_at IS NULL AND COALESCE(payload ->> 'module','') <> ?", "NotificationInbox")
		var tasks []models.WorkflowNotificationOutboxEntry
		if err := tx.Where("id IN (?)", previousTasks).Find(&tasks).Error; err != nil {
			return err
		}
		for _, task := range tasks {
			if err := tx.Model(&task).Updates(map[string]any{"canceled_at": time.Now().UTC(), "last_error": "replaced by durable account inbox; historical receipts are not reconstructed"}).Error; err != nil {
				return err
			}
			if task.ExecutionLogID != nil {
				if err := tx.Model(&models.RuleExecutionLog{}).Where("id = ?", *task.ExecutionLogID).Updates(map[string]any{"execution_status": "skipped", "error_message": "旧直接通知任务已停止，不补造历史收件"}).Error; err != nil {
					return err
				}
			}
		}
		return nil
	})
}
