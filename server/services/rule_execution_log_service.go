package services

import (
	"context"
	"encoding/json"
	"errors"
	"strings"
	"xdfc-server/db"
	"xdfc-server/models"

	"gorm.io/gorm"
)

var (
	ErrRuleExecutionLogNotFound     = errors.New("rule execution log not found")
	ErrRuleExecutionLogNotRetryable = errors.New("rule execution log is not retryable")
)

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

func RetryRuleExecutionNotificationLogWithDB(database *gorm.DB, id string) (models.RuleExecutionLog, error) {
	return RetryRuleExecutionNotificationLogWithContext(context.Background(), database, id)
}

func RetryRuleExecutionNotificationLogWithContext(ctx context.Context, database *gorm.DB, id string) (models.RuleExecutionLog, error) {
	database = database.WithContext(ctx)
	var original models.RuleExecutionLog
	if err := database.First(&original, "id = ?", strings.TrimSpace(id)).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return original, ErrRuleExecutionLogNotFound
		}
		return original, err
	}
	if original.ExecutionType != "notify" || original.ExecutionStatus != "failed" || decodeRuleExecutionLogMetadata(original.Result)["delivery"] != "outbox" {
		return original, ErrRuleExecutionLogNotRetryable
	}
	var task models.WorkflowNotificationOutboxEntry
	if err := database.Where("execution_log_id = ?", original.ID).First(&task).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return original, ErrRuleExecutionLogNotRetryable
		}
		return original, err
	}
	if err := RetryOriginalSystemNotificationDeliveryQueueTask(ctx, database, task.ID); err != nil {
		return original, err
	}
	return original, database.First(&original, "id = ?", original.ID).Error
}

func decodeRuleExecutionLogMetadata(raw json.RawMessage) map[string]any {
	var metadata map[string]any
	if err := json.Unmarshal(raw, &metadata); err != nil || metadata == nil {
		return map[string]any{}
	}
	return metadata
}
