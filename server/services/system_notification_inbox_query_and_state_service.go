package services

import (
	"context"
	"database/sql"
	"encoding/base64"
	"encoding/json"
	"errors"
	"strings"
	"time"
	"xdfc-server/models"

	"github.com/google/uuid"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

var (
	ErrSystemNotificationInboxInputInvalid  = errors.New("通知查询或操作参数无效")
	ErrSystemNotificationInboxEntryNotFound = errors.New("通知不存在或当前账号无权访问")
)

type SystemNotificationInboxListQuery struct {
	RecipientUserID string
	PermissionIDs   []string
	Scope           string
	Cursor          string
	Limit           int
}

type SystemNotificationInboxMessageResponse struct {
	models.SystemNotificationInboxEntry
	IsRead     bool `json:"isRead"`
	IsArchived bool `json:"isArchived"`
	IsResolved bool `json:"isResolved"`
}

type SystemNotificationInboxListResponse struct {
	Items       []SystemNotificationInboxMessageResponse `json:"items"`
	UnreadCount int64                                    `json:"unreadCount"`
	Total       int64                                    `json:"total"`
	NextCursor  string                                   `json:"nextCursor,omitempty"`
}

type systemNotificationInboxHistoryCursor struct {
	CreatedAt time.Time `json:"createdAt"`
	ID        string    `json:"id"`
}

func authorizedSystemNotificationInboxQuery(database *gorm.DB, recipientID string, permissions []string) *gorm.DB {
	activeAccount := database.Model(&models.User{}).Select("1").Where("id = ? AND status = ?", recipientID, "active")
	query := database.Model(&models.SystemNotificationInboxEntry{}).Where("recipient_user_id = ? AND EXISTS (?)", recipientID, activeAccount)
	allowedPermissions := append([]string{""}, permissions...)
	return query.Where("visibility_permission IN ?", allowedPermissions)
}

func activeSystemNotificationInboxQuery(query *gorm.DB, now time.Time) *gorm.DB {
	return query.Where("archived_at IS NULL AND resolved_at IS NULL AND (expires_at IS NULL OR expires_at > ?)", now)
}

// ListSystemNotificationInboxForAccount reads messages and the badge from one
// database snapshot. The cursor paginates history; reconnect refreshes old states.
func ListSystemNotificationInboxForAccount(ctx context.Context, database *gorm.DB, input SystemNotificationInboxListQuery) (SystemNotificationInboxListResponse, error) {
	response := SystemNotificationInboxListResponse{Items: []SystemNotificationInboxMessageResponse{}}
	if input.RecipientUserID == "" || input.Limit < 1 || input.Limit > 100 || input.Scope != "active" && input.Scope != "history" {
		return response, ErrSystemNotificationInboxInputInvalid
	}
	var cursor systemNotificationInboxHistoryCursor
	if input.Cursor != "" {
		encoded, err := base64.RawURLEncoding.DecodeString(input.Cursor)
		if err != nil || json.Unmarshal(encoded, &cursor) != nil || cursor.CreatedAt.IsZero() || uuid.Validate(cursor.ID) != nil {
			return response, ErrSystemNotificationInboxInputInvalid
		}
	}
	now := time.Now().UTC()
	err := database.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		base := func() *gorm.DB {
			return authorizedSystemNotificationInboxQuery(tx, input.RecipientUserID, input.PermissionIDs)
		}
		if err := activeSystemNotificationInboxQuery(base(), now).Where("read_at IS NULL").Count(&response.UnreadCount).Error; err != nil {
			return err
		}
		query := base()
		if input.Scope == "active" {
			query = activeSystemNotificationInboxQuery(query, now)
		} else {
			query = query.Where("archived_at IS NOT NULL OR resolved_at IS NOT NULL OR expires_at <= ?", now)
		}
		if err := query.Session(&gorm.Session{}).Count(&response.Total).Error; err != nil {
			return err
		}
		if input.Cursor != "" {
			query = query.Where("created_at < ? OR (created_at = ? AND id < ?)", cursor.CreatedAt, cursor.CreatedAt, cursor.ID)
		}
		var entries []models.SystemNotificationInboxEntry
		if err := query.Order("created_at DESC, id DESC").Limit(input.Limit + 1).Find(&entries).Error; err != nil {
			return err
		}
		if len(entries) > input.Limit {
			entries = entries[:input.Limit]
			last := entries[len(entries)-1]
			encoded, err := json.Marshal(systemNotificationInboxHistoryCursor{CreatedAt: last.CreatedAt, ID: last.ID})
			if err != nil {
				return err
			}
			response.NextCursor = base64.RawURLEncoding.EncodeToString(encoded)
		}
		for _, entry := range entries {
			response.Items = append(response.Items, SystemNotificationInboxMessageResponse{
				SystemNotificationInboxEntry: entry, IsRead: entry.ReadAt != nil, IsArchived: entry.ArchivedAt != nil, IsResolved: entry.ResolvedAt != nil,
			})
		}
		return nil
	}, &sql.TxOptions{Isolation: sql.LevelRepeatableRead, ReadOnly: true})
	return response, err
}

// UpdateSystemNotificationInboxAccountState accepts exact IDs, so a bulk action
// cannot consume messages that arrive after the user's displayed selection.
func UpdateSystemNotificationInboxAccountState(ctx context.Context, database *gorm.DB, recipientID string, permissions []string, ids []string, action string) error {
	ids = trimStringList(ids)
	if recipientID == "" || len(ids) == 0 || len(ids) > 100 || action != "read" && action != "archive" {
		return ErrSystemNotificationInboxInputInvalid
	}
	for _, id := range ids {
		if uuid.Validate(id) != nil {
			return ErrSystemNotificationInboxInputInvalid
		}
	}
	return database.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var entries []models.SystemNotificationInboxEntry
		if err := authorizedSystemNotificationInboxQuery(tx, recipientID, permissions).Clauses(clause.Locking{Strength: "UPDATE"}).Where("id IN ?", ids).Order("id").Find(&entries).Error; err != nil {
			return err
		}
		if len(entries) != len(ids) {
			return ErrSystemNotificationInboxEntryNotFound
		}
		column := "read_at"
		if action == "archive" {
			column = "archived_at"
		}
		now := time.Now().UTC()
		updated := tx.Model(&models.SystemNotificationInboxEntry{}).Where("id IN ? AND "+column+" IS NULL", ids).Updates(map[string]any{column: now, "updated_at": now})
		if updated.Error != nil || updated.RowsAffected == 0 {
			return updated.Error
		}
		return enqueueSystemNotificationInboxRefreshWithinTransaction(tx, recipientID, nil, "UPDATED", nil)
	})
}

type SystemNotificationInboxResolutionFilter struct {
	SourceCode, BusinessTargetID, ApprovalRequestID, RuleID, SegmentID string
	InboxEntryIDs                                                      []string
}

// ResolveSystemNotificationInboxEntriesWithinTransaction persists business
// resolution even when every recipient is offline, then queues refresh hints.
func ResolveSystemNotificationInboxEntriesWithinTransaction(tx *gorm.DB, filter SystemNotificationInboxResolutionFilter) error {
	if strings.TrimSpace(filter.SourceCode) == "" || filter.BusinessTargetID == "" && filter.ApprovalRequestID == "" {
		return ErrSystemNotificationInboxInputInvalid
	}
	query := tx.Model(&models.SystemNotificationInboxEntry{}).Where("source_code = ? AND resolved_at IS NULL", filter.SourceCode)
	if filter.BusinessTargetID != "" {
		query = query.Where("business_target_id = ?", filter.BusinessTargetID)
	}
	if filter.ApprovalRequestID != "" {
		query = query.Where("approval_request_id = ? AND requires_action = ?", filter.ApprovalRequestID, true)
	}
	if filter.RuleID != "" {
		query = query.Where("rule_id = ?", filter.RuleID)
	}
	if filter.SegmentID != "" {
		query = query.Where("segment_id = ?", filter.SegmentID)
	}
	if len(filter.InboxEntryIDs) > 0 {
		query = query.Where("id IN ?", filter.InboxEntryIDs)
	}
	var entries []models.SystemNotificationInboxEntry
	if err := query.Clauses(clause.Locking{Strength: "UPDATE"}).Order("id").Find(&entries).Error; err != nil {
		return err
	}
	ids, recipients := []string{}, []string{}
	for _, entry := range entries {
		ids = append(ids, entry.ID)
		recipients = append(recipients, entry.RecipientUserID)
	}
	if len(ids) == 0 {
		return nil
	}
	now := time.Now().UTC()
	if err := tx.Model(&models.SystemNotificationInboxEntry{}).Where("id IN ?", ids).Updates(map[string]any{"resolved_at": now, "updated_at": now}).Error; err != nil {
		return err
	}
	// The worker reads inbox without locking it; no reverse inbox/outbox lock order.
	var pending []models.WorkflowNotificationOutboxEntry
	if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).Where("inbox_entry_id IN ? AND delivered_at IS NULL AND canceled_at IS NULL", ids).Order("id").Find(&pending).Error; err != nil {
		return err
	}
	for _, task := range pending {
		if err := tx.Model(&task).Update("canceled_at", now).Error; err != nil {
			return err
		}
		if task.ExecutionLogID != nil {
			if err := tx.Model(&models.RuleExecutionLog{}).Where("id = ?", *task.ExecutionLogID).Updates(map[string]any{"execution_status": "skipped", "error_message": "notification resolved before publication"}).Error; err != nil {
				return err
			}
		}
	}
	for _, recipient := range trimStringList(recipients) {
		if err := enqueueSystemNotificationInboxRefreshWithinTransaction(tx, recipient, nil, "UPDATED", nil); err != nil {
			return err
		}
	}
	return nil
}
