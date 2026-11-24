package db

import (
	"fmt"
	"strings"
	"xdfc-server/models"

	"gorm.io/gorm"
)

func EnsureProductionRouteFamilyScopeIntegrity(database *gorm.DB) error {
	if database == nil || !database.Migrator().HasTable(&models.ProductionRouteFamily{}) {
		return nil
	}

	return database.Transaction(func(tx *gorm.DB) error {
		for _, field := range []string{"ScopeType", "SalesOrderLineID"} {
			if !tx.Migrator().HasColumn(&models.ProductionRouteFamily{}, field) {
				if err := tx.Migrator().AddColumn(&models.ProductionRouteFamily{}, field); err != nil {
					return fmt.Errorf("failed to add production route family scope column %s: %w", field, err)
				}
			}
		}
		if tx.Migrator().HasTable(&models.ProductionRoute{}) {
			for _, field := range []string{"ScopeType", "SalesOrderLineID"} {
				if !tx.Migrator().HasColumn(&models.ProductionRoute{}, field) {
					if err := tx.Migrator().AddColumn(&models.ProductionRoute{}, field); err != nil {
						return fmt.Errorf("failed to add production route scope column %s: %w", field, err)
					}
				}
			}
		}

		if err := tx.Model(&models.ProductionRouteFamily{}).
			Where("scope_type IS NULL OR TRIM(scope_type) = ''").
			Update("scope_type", "BRANCH_DEFAULT").Error; err != nil {
			return fmt.Errorf("failed to assign existing route families to the branch default scope: %w", err)
		}
		if tx.Migrator().HasTable(&models.ProductionRoute{}) {
			if err := tx.Model(&models.ProductionRoute{}).
				Where("scope_type IS NULL OR TRIM(scope_type) = ''").
				Update("scope_type", "BRANCH_DEFAULT").Error; err != nil {
				return fmt.Errorf("failed to assign existing route revisions to the branch default scope: %w", err)
			}
		}

		var invalidFamilyCount int64
		if err := tx.Model(&models.ProductionRouteFamily{}).
			Where("(scope_type = 'BRANCH_DEFAULT' AND sales_order_line_id IS NOT NULL) OR " +
				"(scope_type = 'SALES_ORDER_LINE' AND sales_order_line_id IS NULL) OR " +
				"scope_type NOT IN ('BRANCH_DEFAULT', 'SALES_ORDER_LINE')").
			Count(&invalidFamilyCount).Error; err != nil {
			return fmt.Errorf("failed to validate production route family scopes: %w", err)
		}
		if invalidFamilyCount > 0 {
			return fmt.Errorf("production route families contain %d invalid scope identities", invalidFamilyCount)
		}

		if tx.Migrator().HasIndex(&models.ProductionRouteFamily{}, "idx_production_route_family_branch") {
			if err := tx.Migrator().DropIndex(&models.ProductionRouteFamily{}, "idx_production_route_family_branch"); err != nil {
				return fmt.Errorf("failed to remove branch-only route family uniqueness: %w", err)
			}
		}
		if err := tx.Exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_production_route_family_default_scope_unique
		ON production_route_families (product_id, bom_owner_type, bom_owner_customer_id, bom_version_level)
		WHERE scope_type = 'BRANCH_DEFAULT' AND sales_order_line_id IS NULL AND deleted_at IS NULL`).Error; err != nil {
			return fmt.Errorf("failed to enforce unique branch default route families: %w", err)
		}
		if err := tx.Exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_production_route_family_sales_line_scope_unique
		ON production_route_families (product_id, bom_owner_type, bom_owner_customer_id, bom_version_level, sales_order_line_id)
		WHERE scope_type = 'SALES_ORDER_LINE' AND sales_order_line_id IS NOT NULL AND deleted_at IS NULL`).Error; err != nil {
			return fmt.Errorf("failed to enforce unique sales line route families: %w", err)
		}

		if tx.Dialector.Name() == "postgres" {
			if err := tx.Exec("ALTER TABLE production_route_families ALTER COLUMN scope_type SET NOT NULL").Error; err != nil {
				return fmt.Errorf("failed to require route family scope type: %w", err)
			}
			if tx.Migrator().HasTable(&models.ProductionRoute{}) {
				if err := tx.Exec("ALTER TABLE production_routes ALTER COLUMN scope_type SET NOT NULL").Error; err != nil {
					return fmt.Errorf("failed to require route revision scope type: %w", err)
				}
			}
		}
		return nil
	})
}

func productionRouteScopeTypeForMigration(scopeType string) string {
	scopeType = strings.ToUpper(strings.TrimSpace(scopeType))
	if scopeType == "" {
		return "BRANCH_DEFAULT"
	}
	return scopeType
}
