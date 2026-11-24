package db

import (
	"fmt"
	"xdfc-server/models"

	"gorm.io/gorm"
)

type productionBOMBranchOperationLegacyColumn struct {
	table  string
	column string
}

var productionBOMBranchOperationLegacyColumns = []productionBOMBranchOperationLegacyColumn{
	{table: "production_route_steps", column: "segment_id"},
	{table: "production_route_steps", column: "process_step_id"},
	{table: "product_barcode_states", column: "current_process_step_id"},
	{table: "product_barcode_state_events", column: "from_process_step_id"},
	{table: "product_barcode_state_events", column: "to_process_step_id"},
	{table: "product_barcode_transfer_events", column: "from_process_step_id"},
	{table: "product_barcode_transfer_events", column: "to_process_step_id"},
	{table: "production_operation_executions", column: "process_step_id"},
	{table: "production_outsource_order_lines", column: "segment_id"},
	{table: "production_outsource_order_lines", column: "segment_name"},
	{table: "production_outsource_order_lines", column: "process_step_id"},
	{table: "production_outsource_order_lines", column: "process_code"},
	{table: "production_outsource_order_lines", column: "process_name"},
	{table: "production_outsource_transfers", column: "process_step_id"},
	{table: "production_outsource_inspections", column: "process_step_id"},
}

// PrepareProductionBOMBranchOperationExecutionIdentityMigration removes development execution data that cannot satisfy the new identity contract.
func PrepareProductionBOMBranchOperationExecutionIdentityMigration(database *gorm.DB) error {
	if database == nil {
		return nil
	}

	return database.Transaction(func(tx *gorm.DB) error {
		if tx.Dialector.Name() == "postgres" {
			if err := tx.Exec("SELECT pg_advisory_xact_lock(2026111601)").Error; err != nil {
				return err
			}
		}

		hasLegacyIdentity := false
		for _, legacyColumn := range productionBOMBranchOperationLegacyColumns {
			if tx.Migrator().HasTable(legacyColumn.table) && tx.Migrator().HasColumn(legacyColumn.table, legacyColumn.column) {
				hasLegacyIdentity = true
				break
			}
		}
		if !hasLegacyIdentity {
			return nil
		}

		if err := clearProductionExecutionDataBeforeBranchOperationIdentityCutover(tx); err != nil {
			return err
		}
		if err := deleteProductionRoutesThatCannotUseBranchOperationIdentity(tx); err != nil {
			return err
		}

		for _, legacyColumn := range productionBOMBranchOperationLegacyColumns {
			if !tx.Migrator().HasTable(legacyColumn.table) || !tx.Migrator().HasColumn(legacyColumn.table, legacyColumn.column) {
				continue
			}
			if tx.Dialector.Name() == "postgres" {
				statement := fmt.Sprintf("ALTER TABLE %s DROP COLUMN IF EXISTS %s CASCADE", legacyColumn.table, legacyColumn.column)
				if err := tx.Exec(statement).Error; err != nil {
					return err
				}
				continue
			}
			if tx.Dialector.Name() == "sqlite" {
				statement := fmt.Sprintf("ALTER TABLE %s DROP COLUMN %s", legacyColumn.table, legacyColumn.column)
				if err := tx.Exec(statement).Error; err != nil {
					return err
				}
				continue
			}
			if err := tx.Migrator().DropColumn(legacyColumn.table, legacyColumn.column); err != nil {
				return err
			}
		}

		if tx.Migrator().HasTable("line_segment_process_mappings") {
			if err := tx.Migrator().DropTable("line_segment_process_mappings"); err != nil {
				return err
			}
		}
		return nil
	})
}

func clearProductionExecutionDataBeforeBranchOperationIdentityCutover(tx *gorm.DB) error {
	tables := []string{
		"production_outsource_inspections",
		"production_outsource_transfers",
		"product_barcode_transfer_events",
		"product_barcode_state_events",
		"production_operation_executions",
		"production_execution_command_request_receipts",
		"product_barcode_states",
		"production_execution_lots",
	}
	for _, table := range tables {
		if !tx.Migrator().HasTable(table) {
			continue
		}
		if err := tx.Exec("DELETE FROM " + table).Error; err != nil {
			return fmt.Errorf("clear development execution data from %s: %w", table, err)
		}
	}

	if tx.Migrator().HasTable("production_outsource_order_lines") {
		updates := map[string]any{}
		for column, value := range map[string]any{
			"status": "DRAFT", "sent_quantity": 0, "returned_quantity": 0,
			"accepted_quantity": 0, "rejected_quantity": 0, "rework_quantity": 0,
			"scrap_quantity": 0,
		} {
			if tx.Migrator().HasColumn("production_outsource_order_lines", column) {
				updates[column] = value
			}
		}
		if len(updates) > 0 {
			if err := tx.Table("production_outsource_order_lines").Where("1 = 1").Updates(updates).Error; err != nil {
				return fmt.Errorf("reset development outsource line summaries: %w", err)
			}
		}
	}
	if tx.Migrator().HasTable("production_outsource_orders") && tx.Migrator().HasColumn("production_outsource_orders", "status") {
		if err := tx.Table("production_outsource_orders").Where("1 = 1").Update("status", "DRAFT").Error; err != nil {
			return fmt.Errorf("reset development outsource order statuses: %w", err)
		}
	}
	return nil
}

func deleteProductionRoutesThatCannotUseBranchOperationIdentity(tx *gorm.DB) error {
	if !tx.Migrator().HasTable(&models.ProductionRoute{}) || !tx.Migrator().HasTable(&models.ProductionRouteStep{}) {
		return nil
	}

	canValidateBranchOperationRoutes := tx.Migrator().HasTable(&models.ProductionBOMBranchOperation{}) &&
		tx.Migrator().HasColumn(&models.ProductionRouteStep{}, "branch_operation_id") &&
		tx.Migrator().HasColumn(&models.ProductionRoute{}, "product_id") &&
		tx.Migrator().HasColumn(&models.ProductionRoute{}, "bom_owner_type") &&
		tx.Migrator().HasColumn(&models.ProductionRoute{}, "bom_owner_customer_id") &&
		tx.Migrator().HasColumn(&models.ProductionRoute{}, "bom_version_level")
	if !canValidateBranchOperationRoutes {
		if err := tx.Exec("DELETE FROM production_routes").Error; err != nil {
			return fmt.Errorf("remove routes without stable branch operation identity: %w", err)
		}
		return nil
	}

	if err := tx.Exec(`
		DELETE FROM production_routes
		WHERE UPPER(COALESCE(status, '')) <> 'DRAFT'
		   OR NOT EXISTS (
				SELECT 1 FROM production_route_steps route_step
				WHERE route_step.route_id = production_routes.id
		   )
		   OR EXISTS (
				SELECT 1
				FROM production_route_steps route_step
				LEFT JOIN production_bom_branch_operations branch_operation
				  ON branch_operation.id = route_step.branch_operation_id
				WHERE route_step.route_id = production_routes.id
				  AND (
						route_step.branch_operation_id IS NULL
						OR TRIM(CAST(route_step.branch_operation_id AS TEXT)) = ''
						OR branch_operation.id IS NULL
						OR COALESCE(branch_operation.is_active, false) = false
						OR CAST(branch_operation.product_id AS TEXT) <> production_routes.product_id
						OR branch_operation.bom_owner_type <> production_routes.bom_owner_type
						OR COALESCE(branch_operation.bom_owner_customer_id, '') <> COALESCE(production_routes.bom_owner_customer_id, '')
						OR COALESCE(branch_operation.bom_version_level, '') <> COALESCE(production_routes.bom_version_level, '')
				  )
		   )
	`).Error; err != nil {
		return fmt.Errorf("remove routes with invalid branch operation steps: %w", err)
	}
	if err := tx.Exec(`
		DELETE FROM production_route_steps
		WHERE route_id NOT IN (SELECT id FROM production_routes)
	`).Error; err != nil {
		return fmt.Errorf("remove orphaned production route steps: %w", err)
	}
	return nil
}
