package db

import (
	"fmt"

	"gorm.io/gorm"
)

func dropRetiredProductionTopologyTemplateStorage(database *gorm.DB) error {
	if database == nil || !database.Migrator().HasTable("production_topology_templates") {
		return nil
	}
	if err := database.Migrator().DropTable("production_topology_templates"); err != nil {
		return fmt.Errorf("drop retired production topology template table: %w", err)
	}
	return nil
}
