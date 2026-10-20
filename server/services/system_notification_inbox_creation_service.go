package services

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"net/url"
	"sort"
	"strings"
	"time"
	"xdfc-server/authz"
	"xdfc-server/models"

	"github.com/google/uuid"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type SystemNotificationInboxCreationInput struct {
	RecipientUserID, EventKey, PurposeKey, SourceCode, BusinessTargetID string
	ApprovalRequestID, RuleID, SegmentID, CommandID                     string
	NotificationType, Priority, Title, Content, ActionURL               string
	VisibilityPermission                                                string
	BusinessResolutionEntity                                            string
	ResolveOnStatusCodes                                                []string
	Metadata                                                            map[string]any
	RequiresAction                                                      bool
	ExecutionLogID                                                      *string
}

// ResolveSystemNotificationRecipientAccountIDsWithinTransaction freezes the
// actual active accounts at event time, rather than at browser connection time.
func ResolveSystemNotificationRecipientAccountIDsWithinTransaction(tx *gorm.DB, identifiers []string) ([]string, error) {
	result := []string{}
	for _, identifier := range trimStringList(identifiers) {
		var users []models.User
		if err := tx.Clauses(clause.Locking{Strength: "SHARE"}).Where("(CAST(id AS TEXT) = ? OR username = ?) AND status = ?", identifier, identifier, "active").Find(&users).Error; err != nil {
			return nil, err
		}
		if len(users) != 1 {
			return nil, domainValidationError("通知接收账号不存在、已停用或标识不唯一，请检查规则")
		}
		result = append(result, users[0].ID)
	}
	result = trimStringList(result)
	sort.Strings(result)
	return result, nil
}

func notificationVisibilityPermissionForBusinessSource(source string) string {
	switch source {
	case "QUALITY_STANDARD", "QUALITY_ALERT":
		return authz.MenuQuality
	case "SALES_ORDER":
		return authz.MenuTrading
	case "PURCHASE_ORDER":
		return authz.MenuPurchase
	case "BOM_ENGINEERING", "BOM_MANUFACTURING":
		return authz.MenuEngineering
	case "PRODUCTION_PLAN", "PRODUCTION_TASK", "PRODUCTION_OPERATION", "PRODUCTION_OUTSOURCE":
		return authz.MenuProdConfig
	case "SYSTEM_ALERT":
		return authz.PermissionManage
	case "APPROVAL":
		return authz.MenuApproval
	default:
		return ""
	}
}

func notificationTypeForBusinessSource(source string) string {
	switch source {
	case "QUALITY_STANDARD":
		return "QUALITY_STANDARD_EVENT"
	case "BOM_ENGINEERING", "BOM_MANUFACTURING":
		return "BOM_EVENT"
	case "PRODUCTION_TASK":
		return "TASK_ASSIGNED"
	case "APPROVAL", "SYSTEM_ALERT":
		return "SYSTEM_NOTICE"
	default:
		return "ORDER_EVENT"
	}
}

func validateSystemNotificationStationActionURL(actionURL string) error {
	if actionURL == "" {
		return nil
	}
	parsed, err := url.Parse(actionURL)
	if err != nil || !strings.HasPrefix(actionURL, "/") || strings.HasPrefix(actionURL, "//") || strings.Contains(actionURL, "\\") || parsed.IsAbs() || parsed.Host != "" {
		return domainValidationError("通知动作必须指向站内业务页面")
	}
	return nil
}

// CreateSystemNotificationInboxEntryWithinTransaction atomically stores receipt
// and queues a refresh hint. Retries preserve the original message and read state.
func CreateSystemNotificationInboxEntryWithinTransaction(tx *gorm.DB, input SystemNotificationInboxCreationInput) (models.SystemNotificationInboxEntry, error) {
	if tx == nil || strings.TrimSpace(input.RecipientUserID) == "" || strings.TrimSpace(input.EventKey) == "" || strings.TrimSpace(input.PurposeKey) == "" {
		return models.SystemNotificationInboxEntry{}, domainValidationError("通知必须具有事务、实际收件账号、业务事件和明确用途")
	}
	if err := validateSystemNotificationStationActionURL(input.ActionURL); err != nil {
		return models.SystemNotificationInboxEntry{}, err
	}
	resolutionStatuses := trimStringList(input.ResolveOnStatusCodes)
	resolutionEntity := ""
	if len(resolutionStatuses) > 0 && (strings.TrimSpace(input.BusinessResolutionEntity) == "" || input.SourceCode == "" || input.BusinessTargetID == "" || input.RuleID == "" || input.SegmentID == "") {
		return models.SystemNotificationInboxEntry{}, domainValidationError("业务通知解除条件必须明确实体、来源、业务目标、规则和段")
	}
	if len(resolutionStatuses) > 0 {
		resolutionEntity = strings.TrimSpace(input.BusinessResolutionEntity)
	}
	encodedResolutionStatuses, err := json.Marshal(resolutionStatuses)
	if err != nil {
		return models.SystemNotificationInboxEntry{}, err
	}
	var user models.User
	if err := tx.Clauses(clause.Locking{Strength: "SHARE"}).Where("id = ? AND status = ?", input.RecipientUserID, "active").First(&user).Error; err != nil {
		return models.SystemNotificationInboxEntry{}, fmt.Errorf("通知接收账号不可用: %w", err)
	}
	keyBytes, err := json.Marshal([]string{input.EventKey, input.PurposeKey, user.ID})
	if err != nil {
		return models.SystemNotificationInboxEntry{}, err
	}
	digest := sha256.Sum256(keyBytes)
	now := time.Now().UTC()
	metadata := input.Metadata
	if metadata == nil {
		metadata = map[string]any{}
	}
	encodedMetadata, err := json.Marshal(metadata)
	if err != nil {
		return models.SystemNotificationInboxEntry{}, err
	}
	entry := models.SystemNotificationInboxEntry{
		ID: uuid.NewString(), RecipientUserID: user.ID, DeduplicationKey: hex.EncodeToString(digest[:]),
		EventKey: input.EventKey, PurposeKey: input.PurposeKey, SourceCode: input.SourceCode, BusinessTargetID: input.BusinessTargetID,
		ApprovalRequestID: input.ApprovalRequestID, RuleID: input.RuleID, SegmentID: input.SegmentID, CommandID: input.CommandID,
		BusinessResolutionEntity: resolutionEntity, ResolveOnStatusCodes: encodedResolutionStatuses,
		NotificationType: input.NotificationType, Priority: input.Priority, Title: input.Title, Content: input.Content,
		ActionURL: input.ActionURL, VisibilityPermission: input.VisibilityPermission, Metadata: encodedMetadata,
		RequiresAction: input.RequiresAction, CreatedAt: now, UpdatedAt: now,
	}
	if entry.NotificationType == "" {
		entry.NotificationType = notificationTypeForBusinessSource(entry.SourceCode)
	}
	if entry.Priority == "" {
		entry.Priority = "info"
	}
	if entry.VisibilityPermission == "" {
		entry.VisibilityPermission = notificationVisibilityPermissionForBusinessSource(entry.SourceCode)
	}
	if !entry.RequiresAction && entry.Priority != "critical" && entry.Priority != "error" {
		expires := now.AddDate(0, 0, 90)
		entry.ExpiresAt = &expires
	}
	created := tx.Clauses(clause.OnConflict{Columns: []clause.Column{{Name: "deduplication_key"}}, DoNothing: true}).Create(&entry)
	if created.Error != nil {
		return models.SystemNotificationInboxEntry{}, created.Error
	}
	if created.RowsAffected == 0 {
		deduplicationKey := entry.DeduplicationKey
		entry = models.SystemNotificationInboxEntry{}
		if err := tx.Where("deduplication_key = ?", deduplicationKey).First(&entry).Error; err != nil {
			return entry, err
		}
		if input.ExecutionLogID != nil {
			return entry, tx.Model(&models.RuleExecutionLog{}).Where("id = ?", *input.ExecutionLogID).Updates(map[string]any{
				"execution_status": "skipped", "result": mustJSONRawMessage(map[string]string{"delivery": "outbox", "inboxEntryId": entry.ID, "reason": "duplicate business notification"}),
			}).Error
		}
		return entry, nil
	}
	if input.ExecutionLogID != nil {
		if err := tx.Model(&models.RuleExecutionLog{}).Where("id = ?", *input.ExecutionLogID).Updates(map[string]any{
			"execution_status": "pending", "result": mustJSONRawMessage(map[string]string{"delivery": "outbox", "inboxEntryId": entry.ID}),
		}).Error; err != nil {
			return entry, err
		}
	}
	return entry, enqueueSystemNotificationInboxRefreshWithinTransaction(tx, entry.RecipientUserID, &entry.ID, "CREATED", input.ExecutionLogID)
}

func enqueueSystemNotificationInboxRefreshWithinTransaction(tx *gorm.DB, recipientID string, inboxEntryID *string, change string, executionLogID *string) error {
	id := uuid.NewString()
	payload, err := json.Marshal(map[string]any{
		"id": id, "module": "NotificationInbox", "action": "CHANGED", "targetUser": recipientID,
		"payload": map[string]any{"notificationId": inboxEntryID, "change": change},
	})
	if err != nil {
		return err
	}
	return tx.Create(&models.WorkflowNotificationOutboxEntry{
		BaseModel: models.BaseModel{ID: id}, Payload: payload, InboxEntryID: inboxEntryID,
		ExecutionLogID: executionLogID, NextAttemptAt: time.Now().UTC(),
	}).Error
}
