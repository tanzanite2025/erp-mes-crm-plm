package services

import (
	"errors"
	"strings"
	"xdfc-server/models"

	"gorm.io/gorm"
)

var (
	ErrUserRoleNotFound       = errors.New("assigned user role does not exist")
	ErrUserRoleInvalidPayload = errors.New("assigned user role is invalid")
)

func normalizeUserRoleAssignment(tx *gorm.DB, rawRole any) (string, error) {
	roleID, ok := rawRole.(string)
	if !ok {
		return "", ErrUserRoleInvalidPayload
	}

	normalizedRoleID := strings.ToLower(strings.TrimSpace(roleID))
	if normalizedRoleID == "" {
		return "", nil
	}

	var role models.Role
	err := tx.Select("role_id").Where("LOWER(role_id) = ?", normalizedRoleID).First(&role).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return "", ErrUserRoleNotFound
	}
	if err != nil {
		return "", err
	}
	return strings.ToLower(strings.TrimSpace(role.RoleID)), nil
}

func normalizeCreatedUserRole(tx *gorm.DB, user *models.User) error {
	if user == nil {
		return ErrUserRoleInvalidPayload
	}
	normalizedRoleID, err := normalizeUserRoleAssignment(tx, user.Role)
	if err != nil {
		return err
	}
	user.Role = normalizedRoleID
	return nil
}

func normalizeUserRoleUpdate(tx *gorm.DB, updates map[string]interface{}) error {
	rawRole, exists := updates["role"]
	if !exists {
		return nil
	}
	normalizedRoleID, err := normalizeUserRoleAssignment(tx, rawRole)
	if err != nil {
		return err
	}
	updates["role"] = normalizedRoleID
	return nil
}
