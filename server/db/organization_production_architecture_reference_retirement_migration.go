package db

import (
	"fmt"
	"xdfc-server/models"

	"gorm.io/gorm"
)

func retireOrganizationProductionArchitectureReferences(database *gorm.DB) error {
	if database == nil || !database.Migrator().HasTable(&models.OrgUnit{}) {
		return nil
	}
	if !database.Migrator().HasColumn(&models.OrgUnit{}, "metadata") {
		return nil
	}

	switch database.Dialector.Name() {
	case "postgres":
		return database.Exec(`
			UPDATE org_units
			SET metadata = COALESCE(metadata, '{}'::jsonb) - 'linkedArchitecture'
			WHERE jsonb_exists(COALESCE(metadata, '{}'::jsonb), 'linkedArchitecture')
		`).Error
	case "sqlite":
		return database.Exec(`
			UPDATE org_units
			SET metadata = json_remove(metadata, '$.linkedArchitecture')
			WHERE json_valid(metadata)
			  AND json_type(metadata, '$.linkedArchitecture') IS NOT NULL
		`).Error
	default:
		return fmt.Errorf("unsupported database dialect for organization link retirement: %s", database.Dialector.Name())
	}
}
