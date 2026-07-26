package access

import (
	"errors"
	"strings"
	"xdfc-server/authz"
	"xdfc-server/db"
	"xdfc-server/models"

	"gorm.io/gorm"
)

type EffectiveAccessProfile struct {
	PermissionPresetID      string
	PresetPermissionIDs     []string
	DirectPermissionIDs     []string
	Permissions             []string
	EmployeeID              string
	PermissionPresetMissing bool
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
		PermissionPresetID:  strings.ToLower(strings.TrimSpace(user.PermissionPresetID)),
		PresetPermissionIDs: []string{},
		DirectPermissionIDs: []string{},
		Permissions:         []string{},
		EmployeeID:          strings.TrimSpace(user.EmployeeID),
	}

	userID := strings.TrimSpace(user.ID)
	if tx == nil {
		return profile, gorm.ErrInvalidDB
	}
	if userID == "" {
		return profile, gorm.ErrInvalidValue
	}

	presetPermissionIDs := make([]string, 0, 32)

	normalizedPermissionPresetID := profile.PermissionPresetID
	if normalizedPermissionPresetID != "" {
		var permissionPreset models.PermissionPreset
		err := tx.Select("permissions").Where("LOWER(permission_preset_id) = ?", strings.ToLower(normalizedPermissionPresetID)).First(&permissionPreset).Error
		if err == nil {
			for _, permissionID := range authz.ParsePermissionIDs(permissionPreset.Permissions) {
				if authz.IsSupportedPermissionID(permissionID) {
					presetPermissionIDs = append(presetPermissionIDs, permissionID)
				}
			}
		} else if errors.Is(err, gorm.ErrRecordNotFound) {
			profile.PermissionPresetMissing = true
		} else {
			return profile, err
		}
	}

	directPermissionIDs := make([]string, 0, 32)
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
			directPermissionIDs = append(directPermissionIDs, row.PermissionID)
		}
	}
	profile.PresetPermissionIDs = authz.DeduplicatePermissionIDs(presetPermissionIDs)
	profile.DirectPermissionIDs = authz.DeduplicatePermissionIDs(directPermissionIDs)
	profile.Permissions = authz.DeduplicatePermissionIDs(append(
		append([]string(nil), profile.PresetPermissionIDs...),
		profile.DirectPermissionIDs...,
	))
	return profile, nil
}
