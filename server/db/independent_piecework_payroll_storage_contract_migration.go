package db

import (
	"fmt"
	"gorm.io/gorm"
	"xdfc-server/models"
)

// Only independent pay items and rates are stored. Calculation creates no salary tables or rows.
func EnsureIndependentPieceworkPayrollStorageContract(database *gorm.DB) error {
	return database.Transaction(func(tx *gorm.DB) error {
		if tx.Migrator().HasTable("piecework_rates") {
			if tx.Dialector.Name() == "postgres" {
				if err := tx.Exec("LOCK TABLE piecework_rates IN ACCESS EXCLUSIVE MODE").Error; err != nil {
					return err
				}
			}
			var count int64
			if err := tx.Table("piecework_rates").Count(&count).Error; err != nil {
				return err
			}
			if count > 0 {
				for _, column := range []string{"pay_item_id", "pay_item_code", "pay_item_name", "unit", "unit_price", "currency", "effective_from", "effective_to", "status", "version"} {
					if !tx.Migrator().HasColumn("piecework_rates", column) {
						return fmt.Errorf("piecework_rates requires explicit conversion before removing old fields: missing %s", column)
					}
				}
				var invalid int64
				if err := tx.Table("piecework_rates").Where(`pay_item_id IS NULL OR COALESCE(pay_item_code,'') = '' OR COALESCE(pay_item_name,'') = '' OR COALESCE(unit,'') = '' OR currency IS NULL OR LENGTH(currency) <> 3 OR unit_price IS NULL OR unit_price < 0 OR unit_price > 999999.9999 OR unit_price <> ROUND(CAST(unit_price AS NUMERIC),4) OR effective_from IS NULL OR effective_to <= effective_from OR status IS NULL OR status NOT IN ('active','inactive') OR version IS NULL OR version <= 0`).Count(&invalid).Error; err != nil {
					return err
				}
				if invalid > 0 {
					return fmt.Errorf("piecework_rates has %d rows requiring explicit conversion", invalid)
				}
			}
			if tx.Dialector.Name() == "postgres" {
				for _, name := range []string{"ex_piecework_rates_process_interval", "ex_piecework_rates_route_interval", "chk_piecework_rates_effective_interval"} {
					if err := tx.Exec("ALTER TABLE piecework_rates DROP CONSTRAINT IF EXISTS " + name).Error; err != nil {
						return err
					}
				}
			}
			for _, column := range []string{"product_id", "process_step_id", "route_step_id", "process_code", "process_name", "piece_price", "effective_at"} {
				if tx.Migrator().HasColumn("piecework_rates", column) {
					if err := tx.Exec("ALTER TABLE piecework_rates DROP COLUMN " + column).Error; err != nil {
						return err
					}
				}
			}
		}
		if tx.Dialector.Name() == "sqlite" {
			if err := tx.Table("piecework_pay_items").AutoMigrate(&struct {
				models.PieceworkPayItem `gorm:"embedded"`
				ID                      string `gorm:"primaryKey;type:uuid"`
			}{}); err != nil {
				return err
			}
			if err := tx.Table("piecework_rates").AutoMigrate(&struct {
				models.PieceworkRate `gorm:"embedded"`
				ID                   string `gorm:"primaryKey;type:uuid"`
			}{}); err != nil {
				return err
			}
			return nil
		}
		if err := tx.AutoMigrate(&models.PieceworkPayItem{}, &models.PieceworkRate{}); err != nil {
			return err
		}
		if tx.Dialector.Name() != "postgres" {
			return nil
		}
		for _, column := range []string{"pay_item_id", "pay_item_code", "pay_item_name", "unit", "unit_price", "currency", "effective_from", "status", "version"} {
			if err := tx.Exec("ALTER TABLE piecework_rates ALTER COLUMN " + column + " SET NOT NULL").Error; err != nil {
				return err
			}
		}
		for _, statement := range []string{
			`CREATE EXTENSION IF NOT EXISTS btree_gist`,
			`ALTER TABLE piecework_rates DROP CONSTRAINT IF EXISTS chk_piecework_rates_payroll_contract`,
			`ALTER TABLE piecework_rates ADD CONSTRAINT chk_piecework_rates_payroll_contract CHECK (pay_item_code <> '' AND pay_item_name <> '' AND unit <> '' AND currency ~ '^[A-Z]{3}$' AND unit_price BETWEEN 0 AND 999999.9999 AND effective_from IS NOT NULL AND (effective_to IS NULL OR effective_to > effective_from) AND version > 0 AND status IN ('active','inactive'))`,
			`ALTER TABLE piecework_rates DROP CONSTRAINT IF EXISTS ex_piecework_rates_payroll_item_interval`,
			`ALTER TABLE piecework_rates ADD CONSTRAINT ex_piecework_rates_payroll_item_interval EXCLUDE USING gist (pay_item_id WITH =, unit WITH =, tstzrange(effective_from,effective_to,'[)') WITH &&) WHERE (deleted_at IS NULL AND status='active')`,
			`ALTER TABLE piecework_rates DROP CONSTRAINT IF EXISTS fk_piecework_rates_independent_payroll_item`,
			`ALTER TABLE piecework_rates ADD CONSTRAINT fk_piecework_rates_independent_payroll_item FOREIGN KEY(pay_item_id) REFERENCES piecework_pay_items(id)`,
		} {
			if err := tx.Exec(statement).Error; err != nil {
				return err
			}
		}
		return nil
	})
}
