package services

import (
	"log"
	"strings"
	"time"
	"xdfc-server/models"
)

const (
	accountAccessRealtimeModule = "AccessControl"
	accountAccessRealtimeAction = "IDENTITY_SNAPSHOT_INVALIDATED"
)

type AccountAccessInvalidationReason string

const (
	AccountAccessInvalidationReasonAccountMutated                     AccountAccessInvalidationReason = "account_mutated"
	AccountAccessInvalidationReasonAccountDeleted                     AccountAccessInvalidationReason = "account_deleted"
	AccountAccessInvalidationReasonDirectPermissionsReplaced          AccountAccessInvalidationReason = "direct_permissions_replaced"
	AccountAccessInvalidationReasonPermissionPresetPermissionsChanged AccountAccessInvalidationReason = "permission_preset_permissions_changed"
	AccountAccessInvalidationReasonPermissionPresetDeleted            AccountAccessInvalidationReason = "permission_preset_deleted"
	AccountAccessInvalidationReasonEmployeeBindingChanged             AccountAccessInvalidationReason = "employee_binding_changed"
	AccountAccessInvalidationReasonAccountBulkSynced                  AccountAccessInvalidationReason = "account_bulk_synced"
	AccountAccessInvalidationReasonAccountBulkDeleted                 AccountAccessInvalidationReason = "account_bulk_deleted"
)

type AccountAccessSnapshotInvalidationPayload struct {
	AccountID          string `json:"accountId"`
	Username           string `json:"username,omitempty"`
	Reason             string `json:"reason"`
	PermissionPresetID string `json:"permissionPresetId,omitempty"`
	ChangedAt          string `json:"changedAt"`
}

type accountAccessRealtimeTarget struct {
	accountID string
	username  string
}

type accountAccessRealtimePublishFn func(module, action, title, targetUser string, data interface{}) error

var accountAccessRealtimePublisher accountAccessRealtimePublishFn = PublishNotification

func NotifyAccountAccessSnapshotInvalidatedForUser(user models.User, reason AccountAccessInvalidationReason) {
	notifyAccountAccessSnapshotInvalidated(accountAccessRealtimeTarget{
		accountID: strings.TrimSpace(user.ID),
		username:  strings.TrimSpace(user.Username),
	}, reason, "")
}

func NotifyAccountAccessSnapshotInvalidatedForUserID(userID string, reason AccountAccessInvalidationReason) {
	notifyAccountAccessSnapshotInvalidated(accountAccessRealtimeTarget{
		accountID: strings.TrimSpace(userID),
	}, reason, "")
}

func NotifyAccountAccessSnapshotInvalidatedForPermissionPresetAccounts(users []models.User, reason AccountAccessInvalidationReason, permissionPresetID string) {
	seen := make(map[string]struct{}, len(users))
	for _, user := range users {
		accountID := strings.TrimSpace(user.ID)
		if accountID == "" {
			continue
		}
		if _, exists := seen[accountID]; exists {
			continue
		}
		seen[accountID] = struct{}{}
		notifyAccountAccessSnapshotInvalidated(accountAccessRealtimeTarget{
			accountID: accountID,
			username:  strings.TrimSpace(user.Username),
		}, reason, permissionPresetID)
	}
}

func notifyAccountAccessSnapshotInvalidated(target accountAccessRealtimeTarget, reason AccountAccessInvalidationReason, permissionPresetID string) {
	accountID := strings.TrimSpace(target.accountID)
	if accountID == "" {
		return
	}

	payload := AccountAccessSnapshotInvalidationPayload{
		AccountID:          accountID,
		Username:           strings.TrimSpace(target.username),
		Reason:             string(reason),
		PermissionPresetID: strings.ToLower(strings.TrimSpace(permissionPresetID)),
		ChangedAt:          time.Now().UTC().Format(time.RFC3339),
	}

	if err := accountAccessRealtimePublisher(
		accountAccessRealtimeModule,
		accountAccessRealtimeAction,
		"账号权限快照已更新",
		accountID,
		payload,
	); err != nil {
		log.Printf("[ACCOUNT_ACCESS_REALTIME][WARN] publish snapshot invalidation failed accountId=%s reason=%s err=%v", accountID, reason, err)
	}
}
