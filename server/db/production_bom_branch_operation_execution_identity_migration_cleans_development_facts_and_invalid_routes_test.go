package db

import (
	"testing"

	"xdfc-server/models"

	"github.com/glebarez/sqlite"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

func TestPrepareProductionBOMBranchOperationExecutionIdentityMigrationCleansDevelopmentFactsAndInvalidRoutes(t *testing.T) {
	database, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Silent),
	})
	require.NoError(t, err)

	legacySchemaStatements := []string{
		`CREATE TABLE production_routes (
			id TEXT PRIMARY KEY,
			deleted_at DATETIME,
			status TEXT,
			product_id TEXT,
			bom_owner_type TEXT,
			bom_owner_customer_id TEXT,
			bom_version_level TEXT
		)`,
		`CREATE TABLE production_route_steps (
			id TEXT PRIMARY KEY,
			deleted_at DATETIME,
			route_id TEXT,
			branch_operation_id TEXT,
			segment_id TEXT,
			process_step_id TEXT
		)`,
		`CREATE TABLE production_bom_branch_operations (
			id TEXT PRIMARY KEY,
			product_id TEXT,
			bom_owner_type TEXT,
			bom_owner_customer_id TEXT,
			bom_version_level TEXT,
			is_active BOOLEAN
		)`,
		`CREATE TABLE product_barcode_states (id TEXT PRIMARY KEY, current_process_step_id TEXT)`,
		`CREATE TABLE product_barcode_state_events (
			id TEXT PRIMARY KEY,
			from_process_step_id TEXT,
			to_process_step_id TEXT
		)`,
		`CREATE TABLE product_barcode_transfer_events (
			id TEXT PRIMARY KEY,
			from_process_step_id TEXT,
			to_process_step_id TEXT
		)`,
		`CREATE TABLE production_operation_executions (id TEXT PRIMARY KEY, process_step_id TEXT)`,
		`CREATE TABLE production_execution_command_request_receipts (id TEXT PRIMARY KEY)`,
		`CREATE TABLE production_execution_lots (id TEXT PRIMARY KEY)`,
		`CREATE TABLE production_outsource_orders (id TEXT PRIMARY KEY, status TEXT)`,
		`CREATE TABLE production_outsource_order_lines (
			id TEXT PRIMARY KEY,
			status TEXT,
			sent_quantity REAL,
			returned_quantity REAL,
			accepted_quantity REAL,
			rejected_quantity REAL,
			rework_quantity REAL,
			scrap_quantity REAL,
			segment_id TEXT,
			segment_name TEXT,
			process_step_id TEXT,
			process_code TEXT,
			process_name TEXT
		)`,
		`CREATE TABLE production_outsource_transfers (id TEXT PRIMARY KEY, process_step_id TEXT)`,
		`CREATE TABLE production_outsource_inspections (id TEXT PRIMARY KEY, process_step_id TEXT)`,
		`CREATE TABLE line_segment_process_mappings (
			line_segment_id TEXT NOT NULL,
			process_step_id TEXT NOT NULL
		)`,
	}
	for _, statement := range legacySchemaStatements {
		require.NoError(t, database.Exec(statement).Error)
	}

	for _, statement := range []string{
		`INSERT INTO production_bom_branch_operations (id, product_id, bom_owner_type, bom_owner_customer_id, bom_version_level, is_active)
			VALUES ('operation-valid', 'product-1', 'INTERNAL', '', 'R1', 1), ('operation-inactive', 'product-1', 'INTERNAL', '', 'R1', 0)`,
		`INSERT INTO production_routes (id, status, product_id, bom_owner_type, bom_owner_customer_id, bom_version_level) VALUES
			('route-valid-draft', 'DRAFT', 'product-1', 'INTERNAL', '', 'R1'),
			('route-invalid-draft', 'DRAFT', 'product-1', 'INTERNAL', '', 'R1'),
			('route-published', 'PUBLISHED', 'product-1', 'INTERNAL', '', 'R1')`,
		`INSERT INTO production_route_steps (id, route_id, branch_operation_id, segment_id, process_step_id) VALUES
			('step-valid', 'route-valid-draft', 'operation-valid', 'legacy-segment', 'legacy-process'),
			('step-invalid', 'route-invalid-draft', 'operation-inactive', 'legacy-segment', 'legacy-process'),
			('step-published', 'route-published', 'operation-valid', 'legacy-segment', 'legacy-process')`,
		`INSERT INTO product_barcode_states (id, current_process_step_id) VALUES ('state-1', 'legacy-process')`,
		`INSERT INTO product_barcode_state_events (id, from_process_step_id, to_process_step_id) VALUES ('state-event-1', 'legacy-process', 'legacy-process')`,
		`INSERT INTO product_barcode_transfer_events (id, from_process_step_id, to_process_step_id) VALUES ('transfer-event-1', 'legacy-process', 'legacy-process')`,
		`INSERT INTO production_operation_executions (id, process_step_id) VALUES ('execution-1', 'legacy-process')`,
		`INSERT INTO production_execution_command_request_receipts (id) VALUES ('receipt-1')`,
		`INSERT INTO production_execution_lots (id) VALUES ('lot-1')`,
		`INSERT INTO production_outsource_orders (id, status) VALUES ('outsource-order-1', 'SENT')`,
		`INSERT INTO production_outsource_order_lines (id, status, sent_quantity, returned_quantity, accepted_quantity, rejected_quantity, rework_quantity, scrap_quantity, segment_id, segment_name, process_step_id, process_code, process_name)
			VALUES ('outsource-line-1', 'SENT', 8, 4, 3, 1, 1, 0, 'legacy-segment', 'Legacy segment', 'legacy-process', 'LEGACY', 'Legacy process')`,
		`INSERT INTO production_outsource_transfers (id, process_step_id) VALUES ('outsource-transfer-1', 'legacy-process')`,
		`INSERT INTO production_outsource_inspections (id, process_step_id) VALUES ('outsource-inspection-1', 'legacy-process')`,
		`INSERT INTO line_segment_process_mappings (line_segment_id, process_step_id) VALUES ('legacy-segment', 'legacy-process')`,
	} {
		require.NoError(t, database.Exec(statement).Error)
	}

	require.NoError(t, PrepareProductionBOMBranchOperationExecutionIdentityMigration(database))

	var retainedRouteCount int64
	require.NoError(t, database.Model(&models.ProductionRoute{}).Where("id = ?", "route-valid-draft").Count(&retainedRouteCount).Error)
	require.EqualValues(t, 1, retainedRouteCount)
	for _, routeID := range []string{"route-invalid-draft", "route-published"} {
		var routeCount int64
		require.NoError(t, database.Model(&models.ProductionRoute{}).Where("id = ?", routeID).Count(&routeCount).Error)
		require.Zero(t, routeCount)
	}
	var retainedStepCount int64
	require.NoError(t, database.Model(&models.ProductionRouteStep{}).Where("id = ?", "step-valid").Count(&retainedStepCount).Error)
	require.EqualValues(t, 1, retainedStepCount)
	var deletedStepCount int64
	require.NoError(t, database.Model(&models.ProductionRouteStep{}).Where("id <> ?", "step-valid").Count(&deletedStepCount).Error)
	require.Zero(t, deletedStepCount)

	for _, table := range []string{
		"product_barcode_states",
		"product_barcode_state_events",
		"product_barcode_transfer_events",
		"production_operation_executions",
		"production_execution_command_request_receipts",
		"production_execution_lots",
		"production_outsource_transfers",
		"production_outsource_inspections",
	} {
		var recordCount int64
		require.NoError(t, database.Table(table).Count(&recordCount).Error)
		require.Zero(t, recordCount, table)
	}

	var orderStatus string
	require.NoError(t, database.Table("production_outsource_orders").Select("status").Where("id = ?", "outsource-order-1").Scan(&orderStatus).Error)
	require.Equal(t, "DRAFT", orderStatus)
	var line struct {
		Status           string
		SentQuantity     float64
		ReturnedQuantity float64
		AcceptedQuantity float64
		RejectedQuantity float64
		ReworkQuantity   float64
		ScrapQuantity    float64
	}
	require.NoError(t, database.Table("production_outsource_order_lines").Where("id = ?", "outsource-line-1").Take(&line).Error)
	require.Equal(t, "DRAFT", line.Status)
	require.Zero(t, line.SentQuantity)
	require.Zero(t, line.ReturnedQuantity)
	require.Zero(t, line.AcceptedQuantity)
	require.Zero(t, line.RejectedQuantity)
	require.Zero(t, line.ReworkQuantity)
	require.Zero(t, line.ScrapQuantity)

	for _, legacyColumn := range productionBOMBranchOperationLegacyColumns {
		if database.Migrator().HasTable(legacyColumn.table) {
			require.False(t, database.Migrator().HasColumn(legacyColumn.table, legacyColumn.column), legacyColumn.table+"."+legacyColumn.column)
		}
	}
	require.False(t, database.Migrator().HasTable("line_segment_process_mappings"))
}
