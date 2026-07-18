package dependencies

import (
	"errors"
	"strings"
	"xdfc-server/authz"
	"xdfc-server/db"
	"xdfc-server/models"

	"gorm.io/gorm"
)

type EffectiveAccessProfile struct {
	Permissions []string
	EmployeeID  string
	RoleMissing bool
}

type EffectiveAccessService struct {
	tx *gorm.DB
}

func NewEffectiveAccessService() *EffectiveAccessService {
	return &EffectiveAccessService{}
}

func NewEffectiveAccessServiceWithDB(tx *gorm.DB) *EffectiveAccessService {
	return &EffectiveAccessService{tx: tx}
}

var defaultEffectiveAccessService = NewEffectiveAccessService()

func ResolveEffectiveAccessProfileForUser(user models.User) (EffectiveAccessProfile, error) {
	return defaultEffectiveAccessService.ResolveEffectiveAccessProfileForUser(user)
}

func ResolveEffectiveAccessProfileForUserWithDB(tx *gorm.DB, user models.User) (EffectiveAccessProfile, error) {
	return NewEffectiveAccessServiceWithDB(tx).ResolveEffectiveAccessProfileForUser(user)
}

func (s *EffectiveAccessService) database() *gorm.DB {
	if s != nil && s.tx != nil {
		return s.tx
	}
	return db.DB
}

func (s *EffectiveAccessService) ResolveEffectiveAccessProfileForUser(user models.User) (EffectiveAccessProfile, error) {
	tx := s.database()
	profile := EffectiveAccessProfile{
		EmployeeID:  strings.TrimSpace(user.EmployeeID),
		Permissions: []string{},
	}

	userID := strings.TrimSpace(user.ID)
	if tx == nil {
		return profile, gorm.ErrInvalidDB
	}
	if userID == "" {
		return profile, gorm.ErrInvalidValue
	}

	permissionIDs := make([]string, 0, 32)

	normalizedRoleID := strings.TrimSpace(user.Role)
	if normalizedRoleID != "" {
		var role models.Role
		err := tx.Select("permissions").Where("LOWER(role_id) = ?", strings.ToLower(normalizedRoleID)).First(&role).Error
		if err == nil {
			for _, permissionID := range authz.ParsePermissionIDs(role.Permissions) {
				if authz.IsSupportedPermissionID(permissionID) {
					permissionIDs = append(permissionIDs, permissionID)
				}
			}
		} else if errors.Is(err, gorm.ErrRecordNotFound) {
			profile.RoleMissing = true
		} else {
			return profile, err
		}
	}

	var rows []models.UserPermission
	if err := tx.Select("permission_id").
		Where("user_id = ?", userID).
		Where("deleted_at IS NULL").
		Order("permission_id asc").
		Find(&rows).Error; err != nil {
		return profile, err
	}

	for _, row := range rows {
		if authz.IsSupportedPermissionID(row.PermissionID) {
			permissionIDs = append(permissionIDs, row.PermissionID)
		}
	}
	profile.Permissions = authz.DeduplicatePermissionIDs(permissionIDs)
	return profile, nil
}
