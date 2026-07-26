package services

import (
	"context"
	"errors"
	"strings"
	"xdfc-server/db"
	"xdfc-server/models"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

var (
	ErrUserBulkDeleteInvalidPayload = errors.New("bulk user delete payload is invalid")
	ErrUserBulkDeleteTargetNotFound = errors.New("bulk user delete target not found")
	ErrUserBulkDeleteSelf           = errors.New("current user cannot be deleted")
)

func normalizeBulkDeleteUserIDs(userIDs []string) ([]string, error) {
	seen := make(map[string]struct{}, len(userIDs))
	normalized := make([]string, 0, len(userIDs))
	for _, userID := range userIDs {
		trimmed := strings.TrimSpace(userID)
		if trimmed == "" {
			return nil, ErrUserBulkDeleteInvalidPayload
		}
		if _, exists := seen[trimmed]; exists {
			continue
		}
		seen[trimmed] = struct{}{}
		normalized = append(normalized, trimmed)
	}
	if len(normalized) == 0 {
		return nil, ErrUserBulkDeleteInvalidPayload
	}
	return normalized, nil
}

func BulkDeleteUsers(ctx context.Context, actorUserID string, userIDs []string) (int, error) {
	normalizedUserIDs, err := normalizeBulkDeleteUserIDs(userIDs)
	if err != nil {
		return 0, err
	}
	actorUserID = strings.TrimSpace(actorUserID)

	deletedCount := 0
	deletedUsers := make([]models.User, 0, len(normalizedUserIDs))
	err = db.DB.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var users []models.User
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
			Where("id IN ?", normalizedUserIDs).
			Find(&users).Error; err != nil {
			return err
		}
		if len(users) != len(normalizedUserIDs) {
			return ErrUserBulkDeleteTargetNotFound
		}

		for _, user := range users {
			if actorUserID != "" && strings.TrimSpace(user.ID) == actorUserID {
				return ErrUserBulkDeleteSelf
			}
			if user.IsSystemProtected() {
				return ErrProtectedUserMutation
			}
		}

		for _, user := range users {
			before := userAuditSnapshot(user)
			if err := tx.Delete(&user).Error; err != nil {
				return err
			}
			if err := writeUserAuditEntryWithContext(ctx, tx, user.ID, "DELETE", before, nil, map[string]any{
				"deleted":            true,
				"username":           strings.TrimSpace(user.Username),
				"status":             strings.TrimSpace(user.Status),
				"permissionPresetId": strings.TrimSpace(user.PermissionPresetID),
			}, "bulk_delete"); err != nil {
				return err
			}
			deletedCount++
			deletedUsers = append(deletedUsers, user)
		}
		return nil
	})
	if err != nil {
		return 0, err
	}
	for _, user := range deletedUsers {
		NotifyAccountAccessSnapshotInvalidatedForUser(user, AccountAccessInvalidationReasonAccountBulkDeleted)
	}
	return deletedCount, nil
}
