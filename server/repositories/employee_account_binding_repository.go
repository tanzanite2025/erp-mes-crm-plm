package repositories

import (
	"xdfc-server/models"

	"gorm.io/gorm"
)

func (GormOrgPersonnelRepository) DisableUsersByEmployeeIDs(database *gorm.DB, ids []string) error {
	return database.Model(&models.User{}).
		Where("employee_id IN ?", ids).
		Where("is_protected = ?", false).
		Where("LOWER(username) <> ?", "admin").
		Update("status", "inactive").Error
}
