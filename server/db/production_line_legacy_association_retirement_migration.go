package db

import (
	"fmt"

	"gorm.io/gorm"
)

func retireProductionLineLegacyAssociations(database *gorm.DB) error {
	if database == nil {
		return nil
	}

	if database.Migrator().HasTable("line_segments") {
		if database.Dialector.Name() == "postgres" {
			if err := database.Exec("ALTER TABLE IF EXISTS job_categories DROP CONSTRAINT IF EXISTS fk_line_segments_job_categories").Error; err != nil {
				return fmt.Errorf("remove retired category-to-line-segment constraint: %w", err)
			}
		}
		if err := database.Migrator().DropTable("line_segments"); err != nil {
			return fmt.Errorf("drop retired line segment storage: %w", err)
		}
	}
	if database.Migrator().HasTable("production_lines") && database.Migrator().HasColumn("production_lines", "product_template_id") {
		if err := database.Exec("ALTER TABLE production_lines DROP COLUMN product_template_id").Error; err != nil {
			return fmt.Errorf("remove product template binding from production lines: %w", err)
		}
	}
	return nil
}
