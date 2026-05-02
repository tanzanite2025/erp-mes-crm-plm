package services

import (
	"context"
	"encoding/json"
	"sort"
	"strings"
	"xdfc-server/authz"
	"xdfc-server/db"
	"xdfc-server/models"

	"github.com/google/uuid"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

func normalizeRolePermissionIDsForCommand(permissionIDs []string) []string {
	return authz.DeduplicatePermissionIDs(permissionIDs)
}

func sortedRolePermissionIDs(permissionIDs []string) []string {
	normalized := authz.DeduplicatePermissionIDs(permissionIDs)
	sort.Strings(normalized)
	return normalized
}

func serializeRolePermissionIDsForCommand(permissionIDs []string) string {
	payload, err := json.Marshal(normalizeRolePermissionIDsForCommand(permissionIDs))
	if err != nil {
		return "[]"
	}
	return string(payload)
}

func roleAuditSnapshot(role models.Role) map[string]any {
	return map[string]any{
		"id":          strings.TrimSpace(role.ID),
		"roleId":      strings.ToLower(strings.TrimSpace(role.RoleID)),
		"label":       strings.TrimSpace(role.Label),
		"color":       strings.TrimSpace(role.Color),
		"permissions": sortedRolePermissionIDs(authz.ParsePermissionIDs(role.Permissions)),
	}
}

func rolePermissionDelta(before []string, after []string) (added []string, removed []string) {
	beforeSet := make(map[string]struct{}, len(before))
	afterSet := make(map[string]struct{}, len(after))
	for _, permissionID := range before {
		beforeSet[strings.TrimSpace(permissionID)] = struct{}{}
	}
	for _, permissionID := range after {
		afterSet[strings.TrimSpace(permissionID)] = struct{}{}
	}
	for _, permissionID := range after {
		if _, ok := beforeSet[permissionID]; !ok {
			added = append(added, permissionID)
		}
	}
	for _, permissionID := range before {
		if _, ok := afterSet[permissionID]; !ok {
			removed = append(removed, permissionID)
		}
	}
	sort.Strings(added)
	sort.Strings(removed)
	return added, removed
}

func roleAuditDiff(before map[string]any, after map[string]any, action string, affectedUsers map[string]any) json.RawMessage {
	beforePermissions := []string{}
	afterPermissions := []string{}
	if before != nil {
		if value, ok := before["permissions"].([]string); ok {
			beforePermissions = append([]string(nil), value...)
		}
	}
	if after != nil {
		if value, ok := after["permissions"].([]string); ok {
			afterPermissions = append([]string(nil), value...)
		}
	}
	added, removed := rolePermissionDelta(beforePermissions, afterPermissions)
	diff, _ := json.Marshal(map[string]any{
		"before":             before,
		"after":              after,
		"action":             strings.TrimSpace(action),
		"beforePermissions":  beforePermissions,
		"afterPermissions":   afterPermissions,
		"addedPermissions":   added,
		"removedPermissions": removed,
		"affectedUsers":      affectedUsers,
	})
	return diff
}

func writeRoleAuditEntryWithContext(ctx context.Context, tx *gorm.DB, targetID string, action string, before map[string]any, after map[string]any, affectedUsers map[string]any) error {
	return recordLegacyAuditEntryWithContext(ctx, tx, "Role", strings.TrimSpace(targetID), strings.TrimSpace(action), roleAuditDiff(before, after, action, affectedUsers))
}

func UpsertRole(ctx context.Context, input models.Role) (models.Role, error) {
	normalizedRoleID := strings.ToLower(strings.TrimSpace(input.RoleID))
	payloadPermissions := normalizeRolePermissionIDsForCommand(authz.ParsePermissionIDs(input.Permissions))
	label := strings.TrimSpace(input.Label)
	color := strings.TrimSpace(input.Color)
	if color == "" {
		color = "bg-slate-500/10 text-slate-600 border-slate-200"
	}

	var saved models.Role
	err := db.DB.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var existing models.Role
		result := tx.Unscoped().Clauses(clause.Locking{Strength: "UPDATE"}).Where("LOWER(role_id) = ?", normalizedRoleID).First(&existing)
		if result.Error == nil {
			before := roleAuditSnapshot(existing)
			updates := map[string]any{
				"permissions": serializeRolePermissionIDsForCommand(payloadPermissions),
				"deleted_at":  nil,
			}
			if !strings.EqualFold(strings.TrimSpace(existing.RoleID), "admin") {
				updates["label"] = label
				updates["color"] = color
			}
			if err := tx.Unscoped().Model(&existing).Updates(updates).Error; err != nil {
				return err
			}
			if err := tx.Where("id = ?", existing.ID).First(&saved).Error; err != nil {
				return err
			}
			return writeRoleAuditEntryWithContext(ctx, tx, saved.ID, "UPSERT", before, roleAuditSnapshot(saved), nil)
		}
		if result.Error != nil && result.Error != gorm.ErrRecordNotFound {
			return result.Error
		}

		created := models.Role{
			RoleID:      normalizedRoleID,
			Label:       label,
			Color:       color,
			Permissions: serializeRolePermissionIDsForCommand(payloadPermissions),
		}
		if strings.TrimSpace(created.ID) == "" {
			created.ID = uuid.NewString()
		}
		if err := tx.Create(&created).Error; err != nil {
			return err
		}
		saved = created
		return writeRoleAuditEntryWithContext(ctx, tx, saved.ID, "CREATE", nil, roleAuditSnapshot(saved), nil)
	})
	if err != nil {
		return models.Role{}, err
	}
	return saved, nil
}

func DeleteRole(ctx context.Context, roleID string) error {
	normalizedID := strings.ToLower(strings.TrimSpace(roleID))
	return db.DB.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var role models.Role
		result := tx.Clauses(clause.Locking{Strength: "UPDATE"}).Where("LOWER(role_id) = ?", normalizedID).First(&role)
		if result.Error != nil {
			if result.Error == gorm.ErrRecordNotFound {
				return tx.Where("LOWER(role_id) = ?", normalizedID).Delete(&models.Role{}).Error
			}
			return result.Error
		}

		before := roleAuditSnapshot(role)
		var affected []models.User
		if err := tx.Select("username").Where("LOWER(role) = ?", normalizedID).Order("username asc").Limit(5).Find(&affected).Error; err != nil {
			return err
		}
		var affectedCount int64
		if err := tx.Model(&models.User{}).Where("LOWER(role) = ?", normalizedID).Count(&affectedCount).Error; err != nil {
			return err
		}
		if err := tx.Model(&models.User{}).Where("LOWER(role) = ?", normalizedID).Update("role", "").Error; err != nil {
			return err
		}
		if err := tx.Where("LOWER(role_id) = ?", normalizedID).Delete(&models.Role{}).Error; err != nil {
			return err
		}
		samples := make([]string, 0, len(affected))
		for _, user := range affected {
			samples = append(samples, strings.TrimSpace(user.Username))
		}
		return writeRoleAuditEntryWithContext(ctx, tx, role.ID, "DELETE", before, nil, map[string]any{
			"unboundUserCount":   affectedCount,
			"unboundUserSamples": samples,
		})
	})
}
