package db

import (
	"fmt"

	"xdfc-server/models"

	"gorm.io/gorm"
)

func DeleteRetiredProductionLineEditAuthorizationConfigs(database *gorm.DB) error {
	if database == nil || !database.Migrator().HasTable(&models.SystemConfig{}) {
		return nil
	}

	if err := database.
		Where("key IN ?", []string{
			"topology_auth_password",
			"production_line_edit_auth_password",
		}).
		Delete(&models.SystemConfig{}).Error; err != nil {
		return fmt.Errorf("delete retired production line authorization configs: %w", err)
	}
	return nil
}
