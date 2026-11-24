package db

import (
	"fmt"

	"xdfc-server/models"

	"gorm.io/gorm"
)

// PrepareProductionLineSegmentProductBindingSchemaMigration removes obsolete
// legacy segments before product_id becomes required.
func PrepareProductionLineSegmentProductBindingSchemaMigration(database *gorm.DB) error {
	if database == nil || !database.Migrator().HasTable("line_segments") {
		return nil
	}

	return database.Transaction(func(tx *gorm.DB) error {
		if tx.Dialector.Name() == "postgres" {
			if err := tx.Exec("SELECT pg_advisory_xact_lock(2026111602)").Error; err != nil {
				return err
			}
		}

		hasProductID := tx.Migrator().HasColumn("line_segments", "product_id")
		obsoleteSegments := tx.Unscoped().Table("line_segments")
		if hasProductID {
			obsoleteSegments = obsoleteSegments.Where("product_id IS NULL OR deleted_at IS NOT NULL")
		} else {
			obsoleteSegments = obsoleteSegments.Where("1 = 1")
		}

		result := obsoleteSegments.Delete(&models.LineSegment{})
		if result.Error != nil {
			return fmt.Errorf("remove obsolete production line segments: %w", result.Error)
		}
		if hasProductID && tx.Dialector.Name() == "postgres" {
			if err := tx.Exec("ALTER TABLE line_segments ALTER COLUMN product_id SET NOT NULL").Error; err != nil {
				return fmt.Errorf("require product identity for production line segments: %w", err)
			}
		}
		return nil
	})
}
