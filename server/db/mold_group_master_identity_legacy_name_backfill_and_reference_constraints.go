package db

import (
	"strings"
	"xdfc-server/models"

	"github.com/google/uuid"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

// BackfillMoldGroupMasterIdentities preserves mold and product-only legacy names.
// It is transactional and safe to run again after restart.
func BackfillMoldGroupMasterIdentities(database *gorm.DB) error {
	return database.Transaction(func(tx *gorm.DB) error {
		if tx.Dialector.Name() == "postgres" {
			if err := tx.Exec("SELECT pg_advisory_xact_lock(73912, 104)").Error; err != nil {
				return err
			}
		}
		for _, reference := range []struct{ table, nameColumn, idColumn string }{{"molds", "group_name", "group_id"}, {"products", "mold_group", "mold_group_id"}} {
			var records []struct {
				ID         string
				LegacyName string
			}
			if err := tx.Table(reference.table).Select("id, " + reference.nameColumn + " AS legacy_name").Where(reference.idColumn + " IS NULL").Scan(&records).Error; err != nil {
				return err
			}
			for _, record := range records {
				name := strings.TrimSpace(record.LegacyName)
				if name == "" {
					continue
				}
				group := models.MoldGroup{BaseModel: models.BaseModel{ID: uuid.NewString()}, Name: name, Active: true, Version: 1, CreatedBy: "legacy-migration", UpdatedBy: "legacy-migration"}
				if err := tx.Clauses(clause.OnConflict{Columns: []clause.Column{{Name: "name"}}, DoNothing: true}).Create(&group).Error; err != nil {
					return err
				}
				// Reset the generated ID before selecting an entry that already existed.
				group = models.MoldGroup{}
				if err := tx.Where("name = ?", name).First(&group).Error; err != nil {
					return err
				}
				if err := tx.Table(reference.table).Where("id = ?", record.ID).Updates(map[string]any{reference.idColumn: group.ID, reference.nameColumn: group.Name}).Error; err != nil {
					return err
				}
			}
		}
		if tx.Dialector.Name() == "postgres" {
			for _, reference := range []struct{ table, column, constraint string }{{"molds", "group_id", "fk_molds_mold_group_master"}, {"products", "mold_group_id", "fk_products_mold_group_master"}} {
				if !tx.Migrator().HasConstraint(reference.table, reference.constraint) {
					if err := tx.Exec("ALTER TABLE " + reference.table + " ADD CONSTRAINT " + reference.constraint + " FOREIGN KEY (" + reference.column + ") REFERENCES mold_groups(id) ON UPDATE RESTRICT ON DELETE RESTRICT").Error; err != nil {
						return err
					}
				}
			}
		}
		return nil
	})
}
