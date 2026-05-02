package services

import (
	"context"
	"encoding/json"
	"errors"
	"sort"
	"strings"
	"xdfc-server/db"
	"xdfc-server/models"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

func userAuditSnapshot(user models.User) map[string]any {
	return map[string]any{
		"id":          strings.TrimSpace(user.ID),
		"username":    strings.TrimSpace(user.Username),
		"email":       strings.TrimSpace(user.Email),
		"phoneNumber": strings.TrimSpace(user.PhoneNumber),
		"firstName":   strings.TrimSpace(user.FirstName),
		"lastName":    strings.TrimSpace(user.LastName),
		"status":      strings.TrimSpace(user.Status),
		"role":        strings.TrimSpace(user.Role),
		"employeeId":  strings.TrimSpace(user.EmployeeID),
	}
}

func sanitizeUserAuditUpdates(updates map[string]interface{}) map[string]any {
	if len(updates) == 0 {
		return map[string]any{}
	}
	payload := make(map[string]any, len(updates))
	for key, value := range updates {
		switch key {
		case "password":
			payload["passwordChanged"] = true
		default:
			payload[key] = value
		}
	}
	return payload
}

func userAuditDiff(before map[string]any, after map[string]any, updates map[string]any, operation string) json.RawMessage {
	diff, _ := json.Marshal(map[string]any{
		"before":    before,
		"after":     after,
		"updates":   updates,
		"operation": strings.TrimSpace(operation),
	})
	return diff
}

func writeUserAuditEntryWithContext(ctx context.Context, tx *gorm.DB, targetID string, action string, before map[string]any, after map[string]any, updates map[string]any, operation string) error {
	return recordLegacyAuditEntryWithContext(ctx, tx, "User", strings.TrimSpace(targetID), strings.TrimSpace(action), userAuditDiff(before, after, updates, operation))
}

func CreateUser(ctx context.Context, user models.User) (models.User, error) {
	created := user
	if err := db.DB.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(&created).Error; err != nil {
			return err
		}
		updates := sanitizeUserAuditUpdates(map[string]interface{}{
			"username":       strings.TrimSpace(created.Username),
			"email":          strings.TrimSpace(created.Email),
			"phone_number":   strings.TrimSpace(created.PhoneNumber),
			"first_name":     strings.TrimSpace(created.FirstName),
			"last_name":      strings.TrimSpace(created.LastName),
			"status":         strings.TrimSpace(created.Status),
			"role":           strings.TrimSpace(created.Role),
			"employee_id":    strings.TrimSpace(created.EmployeeID),
			"password":       true,
		})
		return writeUserAuditEntryWithContext(ctx, tx, created.ID, "CREATE", nil, userAuditSnapshot(created), updates, "create")
	}); err != nil {
		return models.User{}, err
	}
	return created, nil
}

func updateUserWithAudit(ctx context.Context, userID string, updates map[string]interface{}, action string, operation string) (models.User, error) {
	var updated models.User
	err := db.DB.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var current models.User
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&current, "id = ?", strings.TrimSpace(userID)).Error; err != nil {
			return err
		}
		before := userAuditSnapshot(current)
		if err := tx.Model(&current).Updates(updates).Error; err != nil {
			return err
		}
		if err := tx.First(&updated, "id = ?", strings.TrimSpace(userID)).Error; err != nil {
			return err
		}
		return writeUserAuditEntryWithContext(ctx, tx, updated.ID, action, before, userAuditSnapshot(updated), sanitizeUserAuditUpdates(updates), operation)
	})
	if err != nil {
		return models.User{}, err
	}
	return updated, nil
}

func PatchUser(ctx context.Context, userID string, updates map[string]interface{}) (models.User, error) {
	return updateUserWithAudit(ctx, userID, updates, "PATCH", "patch")
}

func ReplaceUser(ctx context.Context, userID string, updates map[string]interface{}) (models.User, error) {
	return updateUserWithAudit(ctx, userID, updates, "REPLACE", "replace")
}

func DeleteUser(ctx context.Context, userID string) error {
	return db.DB.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var current models.User
		err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&current, "id = ?", strings.TrimSpace(userID)).Error
		if err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return tx.Delete(&models.User{}, "id = ?", strings.TrimSpace(userID)).Error
			}
			return err
		}
		before := userAuditSnapshot(current)
		if err := tx.Delete(&current).Error; err != nil {
			return err
		}
		return writeUserAuditEntryWithContext(ctx, tx, current.ID, "DELETE", before, nil, map[string]any{
			"deleted":  true,
			"username": strings.TrimSpace(current.Username),
			"status":   strings.TrimSpace(current.Status),
			"role":     strings.TrimSpace(current.Role),
		}, "delete")
	})
}

func normalizeUserPermissionIDsForAudit(permissionIDs []string) []string {
	if len(permissionIDs) == 0 {
		return []string{}
	}
	normalized := make([]string, 0, len(permissionIDs))
	for _, permissionID := range permissionIDs {
		trimmed := strings.TrimSpace(permissionID)
		if trimmed != "" {
			normalized = append(normalized, trimmed)
		}
	}
	sort.Strings(normalized)
	return normalized
}

func userPermissionsAuditDiff(before []string, after []string, result ReplaceUserPermissionsResult, input ReplaceUserPermissionsInput, user models.User) json.RawMessage {
	diff, _ := json.Marshal(map[string]any{
		"beforePermissions": normalizeUserPermissionIDsForAudit(before),
		"afterPermissions":  normalizeUserPermissionIDsForAudit(after),
		"added":             result.Added,
		"removed":           result.Removed,
		"unchanged":         result.Unchanged,
		"source":            strings.TrimSpace(input.Source),
		"reason":            strings.TrimSpace(input.Reason),
		"grantedBy":         strings.TrimSpace(input.GrantedBy),
		"target": map[string]any{
			"id":         strings.TrimSpace(user.ID),
			"username":   strings.TrimSpace(user.Username),
			"status":     strings.TrimSpace(user.Status),
			"employeeId": strings.TrimSpace(user.EmployeeID),
		},
	})
	return diff
}

func writeUserPermissionsAuditEntryWithContext(ctx context.Context, tx *gorm.DB, user models.User, before []string, result ReplaceUserPermissionsResult, input ReplaceUserPermissionsInput) error {
	return recordLegacyAuditEntryWithContext(ctx, tx, "UserPermission", strings.TrimSpace(user.ID), "REPLACE", userPermissionsAuditDiff(before, result.Permissions, result, input, user))
}
