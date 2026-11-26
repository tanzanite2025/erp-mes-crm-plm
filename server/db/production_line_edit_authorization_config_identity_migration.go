package db

import (
	"errors"
	"fmt"

	"xdfc-server/models"

	"gorm.io/gorm"
)

const (
	legacyProductionLineEditAuthorizationConfigKey = "topology_auth_password"
	productionLineEditAuthorizationConfigKey       = "production_line_edit_auth_password"
	productionLineEditAuthorizationConfigLabel     = "Production Line Edit Authorization Code"
	productionLineEditAuthorizationConfigDesc      = "Password required to edit existing production line master data."
)

func MigrateProductionLineEditAuthorizationConfigIdentity(database *gorm.DB) error {
	if database == nil || !database.Migrator().HasTable(&models.SystemConfig{}) {
		return nil
	}

	return database.Transaction(func(tx *gorm.DB) error {
		var legacyConfig models.SystemConfig
		legacyErr := tx.Take(&legacyConfig, "key = ?", legacyProductionLineEditAuthorizationConfigKey).Error
		if legacyErr != nil && !errors.Is(legacyErr, gorm.ErrRecordNotFound) {
			return fmt.Errorf("read legacy production line authorization config: %w", legacyErr)
		}

		var currentConfig models.SystemConfig
		currentErr := tx.Take(&currentConfig, "key = ?", productionLineEditAuthorizationConfigKey).Error
		if currentErr != nil && !errors.Is(currentErr, gorm.ErrRecordNotFound) {
			return fmt.Errorf("read production line authorization config: %w", currentErr)
		}

		legacyExists := legacyErr == nil
		currentExists := currentErr == nil
		if legacyExists && currentExists {
			return fmt.Errorf("both legacy and current production line authorization configs exist")
		}

		updates := map[string]interface{}{
			"label":       productionLineEditAuthorizationConfigLabel,
			"description": productionLineEditAuthorizationConfigDesc,
		}
		if legacyExists {
			updates["key"] = productionLineEditAuthorizationConfigKey
			if err := tx.Model(&models.SystemConfig{}).
				Where("key = ?", legacyProductionLineEditAuthorizationConfigKey).
				Updates(updates).Error; err != nil {
				return fmt.Errorf("rename production line authorization config: %w", err)
			}
			return nil
		}

		if currentExists {
			if err := tx.Model(&currentConfig).Updates(updates).Error; err != nil {
				return fmt.Errorf("update production line authorization config description: %w", err)
			}
		}
		return nil
	})
}
