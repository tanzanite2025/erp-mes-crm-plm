package services

import (
	"errors"
	"strings"
	"xdfc-server/models"

	"gorm.io/gorm"
)

var (
	ErrAccountPermissionPresetNotFound       = errors.New("assigned account permission preset does not exist")
	ErrAccountPermissionPresetInvalidPayload = errors.New("assigned account permission preset is invalid")
)

func normalizeAccountPermissionPreset(tx *gorm.DB, rawPermissionPreset any) (string, error) {
	permissionPresetID, ok := rawPermissionPreset.(string)
	if !ok {
		return "", ErrAccountPermissionPresetInvalidPayload
	}

	normalizedPermissionPresetID := strings.ToLower(strings.TrimSpace(permissionPresetID))
	if normalizedPermissionPresetID == "" {
		return "", nil
	}

	var permissionPreset models.PermissionPreset
	err := tx.Select("permission_preset_id").Where("LOWER(permission_preset_id) = ?", normalizedPermissionPresetID).First(&permissionPreset).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return "", ErrAccountPermissionPresetNotFound
	}
	if err != nil {
		return "", err
	}
	return strings.ToLower(strings.TrimSpace(permissionPreset.PermissionPresetID)), nil
}

func normalizeCreatedAccountPermissionPreset(tx *gorm.DB, user *models.User) error {
	if user == nil {
		return ErrAccountPermissionPresetInvalidPayload
	}
	normalizedPermissionPresetID, err := normalizeAccountPermissionPreset(tx, user.PermissionPresetID)
	if err != nil {
		return err
	}
	user.PermissionPresetID = normalizedPermissionPresetID
	return nil
}

func normalizeAccountPermissionPresetUpdate(tx *gorm.DB, updates map[string]interface{}) error {
	rawPermissionPreset, exists := updates["permission_preset_id"]
	if !exists {
		return nil
	}
	normalizedPermissionPresetID, err := normalizeAccountPermissionPreset(tx, rawPermissionPreset)
	if err != nil {
		return err
	}
	updates["permission_preset_id"] = normalizedPermissionPresetID
	return nil
}
