package services

import (
	"strings"
	"xdfc-server/db"
	"xdfc-server/models"
)

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
