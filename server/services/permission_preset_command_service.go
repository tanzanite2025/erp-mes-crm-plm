package services

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"regexp"
	"sort"
	"strings"
	"xdfc-server/authz"
	"xdfc-server/db"
	"xdfc-server/models"

	"github.com/google/uuid"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

var (
	ErrPermissionPresetInvalidPayload    = errors.New("permission preset payload is invalid")
	ErrProtectedPermissionPresetMutation = errors.New("protected permission preset cannot be modified")
)

var permissionPresetIDPattern = regexp.MustCompile(`^[a-z0-9][a-z0-9_-]{0,99}$`)

func normalizePermissionPresetPermissionIDsForCommand(permissionIDs []string) []string {
	return authz.DeduplicatePermissionIDs(permissionIDs)
}

func validatePermissionPresetPermissionIDs(permissionIDs []string) ([]string, error) {
	normalized := normalizePermissionPresetPermissionIDsForCommand(permissionIDs)
	for _, permissionID := range normalized {
		if !authz.IsSupportedPermissionID(permissionID) {
			return nil, fmt.Errorf("%w: unsupported permission id %s", ErrPermissionPresetInvalidPayload, permissionID)
		}
	}
	return normalized, nil
}

func sortedPermissionPresetPermissionIDs(permissionIDs []string) []string {
	normalized := authz.DeduplicatePermissionIDs(permissionIDs)
	sort.Strings(normalized)
	return normalized
}

func serializePermissionPresetPermissionIDsForCommand(permissionIDs []string) string {
	payload, err := json.Marshal(normalizePermissionPresetPermissionIDsForCommand(permissionIDs))
	if err != nil {
		return "[]"
	}
	return string(payload)
}

func permissionPresetAuditSnapshot(permissionPreset models.PermissionPreset) map[string]any {
	return map[string]any{
		"id":                 strings.TrimSpace(permissionPreset.ID),
		"permissionPresetId": strings.ToLower(strings.TrimSpace(permissionPreset.PermissionPresetID)),
		"label":              strings.TrimSpace(permissionPreset.Label),
		"color":              strings.TrimSpace(permissionPreset.Color),
		"permissions":        sortedPermissionPresetPermissionIDs(authz.ParsePermissionIDs(permissionPreset.Permissions)),
	}
}

func permissionPresetPermissionDelta(before []string, after []string) (added []string, removed []string) {
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

func permissionPresetPermissionsChanged(before []string, after []string) bool {
	added, removed := permissionPresetPermissionDelta(before, after)
	return len(added) > 0 || len(removed) > 0
}

func listAccountAccessInvalidationTargetsByPermissionPreset(tx *gorm.DB, permissionPresetID string) ([]models.User, error) {
	normalizedPermissionPresetID := strings.ToLower(strings.TrimSpace(permissionPresetID))
	if tx == nil || normalizedPermissionPresetID == "" {
		return []models.User{}, nil
	}
	var users []models.User
	if err := tx.Select("id", "username").
		Where("LOWER(permission_preset_id) = ?", normalizedPermissionPresetID).
		Order("username asc").
		Find(&users).Error; err != nil {
		return nil, err
	}
	return users, nil
}

func permissionPresetAuditDiff(before map[string]any, after map[string]any, action string, affectedUsers map[string]any) json.RawMessage {
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
	added, removed := permissionPresetPermissionDelta(beforePermissions, afterPermissions)
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

func writePermissionPresetAuditEntryWithContext(ctx context.Context, tx *gorm.DB, targetID string, action string, before map[string]any, after map[string]any, affectedUsers map[string]any) error {
	return recordLegacyAuditEntryWithContext(ctx, tx, "PermissionPreset", strings.TrimSpace(targetID), strings.TrimSpace(action), permissionPresetAuditDiff(before, after, action, affectedUsers))
}

func UpsertPermissionPreset(ctx context.Context, input models.PermissionPreset) (models.PermissionPreset, error) {
	normalizedPermissionPresetID := strings.ToLower(strings.TrimSpace(input.PermissionPresetID))
	if !permissionPresetIDPattern.MatchString(normalizedPermissionPresetID) {
		return models.PermissionPreset{}, fmt.Errorf("%w: invalid permission preset id", ErrPermissionPresetInvalidPayload)
	}
	if normalizedPermissionPresetID == "admin" {
		return models.PermissionPreset{}, ErrProtectedPermissionPresetMutation
	}
	payloadPermissions, err := validatePermissionPresetPermissionIDs(authz.ParsePermissionIDs(input.Permissions))
	if err != nil {
		return models.PermissionPreset{}, err
	}
	label := strings.TrimSpace(input.Label)
	if label == "" {
		return models.PermissionPreset{}, fmt.Errorf("%w: permission preset label is required", ErrPermissionPresetInvalidPayload)
	}
	color := strings.TrimSpace(input.Color)
	if color == "" {
		color = "bg-slate-500/10 text-slate-600 border-slate-200"
	}

	var saved models.PermissionPreset
	var affectedAccounts []models.User
	shouldNotifyPermissionPresetAccounts := false
	err = db.DB.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var existing models.PermissionPreset
		result := tx.Unscoped().Clauses(clause.Locking{Strength: "UPDATE"}).Where("LOWER(permission_preset_id) = ?", normalizedPermissionPresetID).First(&existing)
		if result.Error == nil {
			before := permissionPresetAuditSnapshot(existing)
			beforePermissions := authz.ParsePermissionIDs(existing.Permissions)
			shouldNotifyPermissionPresetAccounts = permissionPresetPermissionsChanged(beforePermissions, payloadPermissions)
			if shouldNotifyPermissionPresetAccounts {
				var err error
				affectedAccounts, err = listAccountAccessInvalidationTargetsByPermissionPreset(tx, normalizedPermissionPresetID)
				if err != nil {
					return err
				}
			}
			updates := map[string]any{
				"permissions": serializePermissionPresetPermissionIDsForCommand(payloadPermissions),
				"deleted_at":  nil,
			}
			if !strings.EqualFold(strings.TrimSpace(existing.PermissionPresetID), "admin") {
				updates["label"] = label
				updates["color"] = color
			}
			if err := tx.Unscoped().Model(&existing).Updates(updates).Error; err != nil {
				return err
			}
			if err := tx.Where("id = ?", existing.ID).First(&saved).Error; err != nil {
				return err
			}
			return writePermissionPresetAuditEntryWithContext(ctx, tx, saved.ID, "UPSERT", before, permissionPresetAuditSnapshot(saved), nil)
		}
		if result.Error != nil && !errors.Is(result.Error, gorm.ErrRecordNotFound) {
			return result.Error
		}

		created := models.PermissionPreset{
			PermissionPresetID: normalizedPermissionPresetID,
			Label:              label,
			Color:              color,
			Permissions:        serializePermissionPresetPermissionIDsForCommand(payloadPermissions),
		}
		if strings.TrimSpace(created.ID) == "" {
			created.ID = uuid.NewString()
		}
		if err := tx.Create(&created).Error; err != nil {
			return err
		}
		saved = created
		return writePermissionPresetAuditEntryWithContext(ctx, tx, saved.ID, "CREATE", nil, permissionPresetAuditSnapshot(saved), nil)
	})
	if err != nil {
		return models.PermissionPreset{}, err
	}
	if shouldNotifyPermissionPresetAccounts {
		NotifyAccountAccessSnapshotInvalidatedForPermissionPresetAccounts(
			affectedAccounts,
			AccountAccessInvalidationReasonPermissionPresetPermissionsChanged,
			normalizedPermissionPresetID,
		)
	}
	return saved, nil
}

func DeletePermissionPreset(ctx context.Context, permissionPresetID string) error {
	normalizedID := strings.ToLower(strings.TrimSpace(permissionPresetID))
	if normalizedID == "admin" {
		return ErrProtectedPermissionPresetMutation
	}
	var affectedAccounts []models.User
	err := db.DB.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var permissionPreset models.PermissionPreset
		result := tx.Clauses(clause.Locking{Strength: "UPDATE"}).Where("LOWER(permission_preset_id) = ?", normalizedID).First(&permissionPreset)
		if result.Error != nil {
			if errors.Is(result.Error, gorm.ErrRecordNotFound) {
				return tx.Where("LOWER(permission_preset_id) = ?", normalizedID).Delete(&models.PermissionPreset{}).Error
			}
			return result.Error
		}

		before := permissionPresetAuditSnapshot(permissionPreset)
		var err error
		affectedAccounts, err = listAccountAccessInvalidationTargetsByPermissionPreset(tx, normalizedID)
		if err != nil {
			return err
		}
		if err := tx.Model(&models.User{}).Where("LOWER(permission_preset_id) = ?", normalizedID).Update("permission_preset_id", "").Error; err != nil {
			return err
		}
		if err := tx.Where("LOWER(permission_preset_id) = ?", normalizedID).Delete(&models.PermissionPreset{}).Error; err != nil {
			return err
		}
		samples := make([]string, 0, len(affectedAccounts))
		for _, user := range affectedAccounts {
			if len(samples) >= 5 {
				break
			}
			samples = append(samples, strings.TrimSpace(user.Username))
		}
		return writePermissionPresetAuditEntryWithContext(ctx, tx, permissionPreset.ID, "DELETE", before, nil, map[string]any{
			"unboundUserCount":   len(affectedAccounts),
			"unboundUserSamples": samples,
		})
	})
	if err != nil {
		return err
	}
	NotifyAccountAccessSnapshotInvalidatedForPermissionPresetAccounts(
		affectedAccounts,
		AccountAccessInvalidationReasonPermissionPresetDeleted,
		normalizedID,
	)
	return nil
}
