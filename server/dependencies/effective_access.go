package dependencies

import (
	"strings"
	"xdfc-server/authz"
	"xdfc-server/db"
	"xdfc-server/models"

	"gorm.io/gorm"
)

type EffectiveAccessProfile struct {
	Permissions []string
	EmployeeID  string
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

func ResolveEffectiveAccessProfileForUser(user models.User) EffectiveAccessProfile {
	return defaultEffectiveAccessService.ResolveEffectiveAccessProfileForUser(user)
}

func ResolveEffectiveAccessProfileForUserWithDB(tx *gorm.DB, user models.User) EffectiveAccessProfile {
	return NewEffectiveAccessServiceWithDB(tx).ResolveEffectiveAccessProfileForUser(user)
}

func (s *EffectiveAccessService) database() *gorm.DB {
	if s != nil && s.tx != nil {
		return s.tx
	}
	return db.DB
}

func (s *EffectiveAccessService) ResolveEffectiveAccessProfileForUser(user models.User) EffectiveAccessProfile {
	tx := s.database()
	profile := EffectiveAccessProfile{
		EmployeeID:  strings.TrimSpace(user.EmployeeID),
		Permissions: []string{},
	}

	userID := strings.TrimSpace(user.ID)
	if tx == nil || userID == "" || !hasTable(tx, "user_permissions") {
		return profile
	}

	var rows []models.UserPermission
	if err := tx.Select("permission_id").
		Where("user_id = ?", userID).
		Where("deleted_at IS NULL").
		Order("permission_id asc").
		Find(&rows).Error; err != nil {
		return profile
	}

	permissionIDs := make([]string, 0, len(rows))
	for _, row := range rows {
		permissionIDs = append(permissionIDs, row.PermissionID)
	}
	profile.Permissions = authz.DeduplicatePermissionIDs(permissionIDs)
	return profile
}

func hasTable(tx *gorm.DB, tableName string) bool {
	if tx == nil || strings.TrimSpace(tableName) == "" {
		return false
	}
	return tx.Migrator().HasTable(tableName)
}
