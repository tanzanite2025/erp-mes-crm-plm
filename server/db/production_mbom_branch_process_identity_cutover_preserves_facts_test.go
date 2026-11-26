package db

import (
	"testing"
	"xdfc-server/models"

	"github.com/glebarez/sqlite"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

func TestEnsureProductionMBOMBranchProcessIdentityCutoverPreservesRoutePositionAndExecutionFacts(t *testing.T) {
	database, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{Logger: logger.Default.LogMode(logger.Silent)})
	require.NoError(t, err)
	require.NoError(t, database.Exec(`CREATE TABLE process_steps (
		id TEXT PRIMARY KEY, created_at DATETIME, updated_at DATETIME, deleted_at DATETIME,
		code TEXT NOT NULL, name TEXT NOT NULL, description TEXT, sort_order INTEGER NOT NULL DEFAULT 0, is_active BOOLEAN NOT NULL DEFAULT true
	)`).Error)
	require.NoError(t, database.Exec(`CREATE TABLE production_mbom_branch_process_associations (
		id TEXT PRIMARY KEY, created_at DATETIME, updated_at DATETIME, deleted_at DATETIME,
		product_id TEXT NOT NULL, bom_owner_type TEXT NOT NULL, bom_owner_customer_id TEXT NOT NULL DEFAULT '',
		bom_version_level TEXT NOT NULL DEFAULT '', process_step_id TEXT NOT NULL, sort_order INTEGER NOT NULL DEFAULT 0
	)`).Error)
	processStep := models.ProcessStep{BaseModel: models.BaseModel{ID: "process-step-a"}, Code: "CUT-A", Name: "裁切", IsActive: true}
	require.NoError(t, database.Exec(`INSERT INTO process_steps (id, code, name, is_active) VALUES (?, ?, ?, ?)`, processStep.ID, processStep.Code, processStep.Name, processStep.IsActive).Error)

	for _, statement := range []string{
		`CREATE TABLE production_bom_branch_operations (
			id TEXT PRIMARY KEY, created_at DATETIME, updated_at DATETIME, deleted_at DATETIME,
			product_id TEXT NOT NULL, bom_owner_type TEXT NOT NULL, bom_owner_customer_id TEXT NOT NULL DEFAULT '',
			bom_version_level TEXT NOT NULL DEFAULT '', name TEXT NOT NULL, description TEXT,
			sort_order INTEGER NOT NULL DEFAULT 0, is_active BOOLEAN NOT NULL DEFAULT true,
			process_library_id TEXT NOT NULL DEFAULT ''
		)`,
		`CREATE TABLE production_bom_branch_operation_process_library_selections (
			id TEXT PRIMARY KEY, created_at DATETIME, updated_at DATETIME, deleted_at DATETIME,
			product_id TEXT NOT NULL, bom_owner_type TEXT NOT NULL, bom_owner_customer_id TEXT NOT NULL DEFAULT '',
			bom_version_level TEXT NOT NULL DEFAULT '', branch_operation_id TEXT NOT NULL,
			process_library_id TEXT NOT NULL, sort_order INTEGER NOT NULL DEFAULT 0
		)`,
		`CREATE TABLE production_route_steps (
			id TEXT PRIMARY KEY, route_id TEXT NOT NULL, route_step_id TEXT,
			branch_operation_id TEXT, process_step_id TEXT,
			branch_operation_name_snapshot TEXT, process_name_snapshot TEXT,
			branch_operation_description_snapshot TEXT, process_description_snapshot TEXT
		)`,
		`CREATE TABLE product_barcode_states (id TEXT PRIMARY KEY, current_branch_operation_id TEXT, current_process_step_id TEXT)`,
		`CREATE TABLE product_barcode_state_events (id TEXT PRIMARY KEY, from_branch_operation_id TEXT, from_process_step_id TEXT, to_branch_operation_id TEXT, to_process_step_id TEXT)`,
		`CREATE TABLE product_barcode_transfer_events (id TEXT PRIMARY KEY, from_branch_operation_id TEXT, from_process_step_id TEXT, to_branch_operation_id TEXT, to_process_step_id TEXT)`,
		`CREATE TABLE production_operation_executions (id TEXT PRIMARY KEY, branch_operation_id TEXT, process_step_id TEXT)`,
		`CREATE TABLE production_outsource_transfers (id TEXT PRIMARY KEY, branch_operation_id TEXT, process_step_id TEXT)`,
		`CREATE TABLE production_outsource_inspections (id TEXT PRIMARY KEY, branch_operation_id TEXT, process_step_id TEXT)`,
		`INSERT INTO production_bom_branch_operations (id, product_id, bom_owner_type, bom_version_level, name, sort_order, is_active, process_library_id)
			VALUES ('branch-op-a', 'product-a', 'INTERNAL', 'standard', '旧工序副本', 4, true, 'process-step-a')`,
		`INSERT INTO production_bom_branch_operation_process_library_selections (id, product_id, bom_owner_type, bom_version_level, branch_operation_id, process_library_id, sort_order)
			VALUES ('selection-a', 'product-a', 'INTERNAL', 'standard', 'branch-op-a', 'process-step-a', 2)`,
		`INSERT INTO production_route_steps (id, route_id, route_step_id, branch_operation_id, process_step_id, branch_operation_name_snapshot, process_name_snapshot, branch_operation_description_snapshot, process_description_snapshot)
			VALUES ('route-step-row-a', 'route-a', 'position-a', 'branch-op-a', '', '发布工序快照', '', '发布说明快照', '')`,
		`INSERT INTO product_barcode_states VALUES ('state-a', 'branch-op-a', '')`,
		`INSERT INTO product_barcode_state_events VALUES ('state-event-a', 'branch-op-a', '', 'branch-op-a', '')`,
		`INSERT INTO product_barcode_transfer_events VALUES ('transfer-event-a', 'branch-op-a', '', 'branch-op-a', '')`,
		`INSERT INTO production_operation_executions VALUES ('execution-a', 'branch-op-a', '')`,
		`INSERT INTO production_outsource_transfers VALUES ('outsource-transfer-a', 'branch-op-a', '')`,
		`INSERT INTO production_outsource_inspections VALUES ('outsource-inspection-a', 'branch-op-a', '')`,
	} {
		require.NoError(t, database.Exec(statement).Error)
	}

	require.NoError(t, EnsureProductionMBOMBranchProcessIdentityCutover(database))
	require.NoError(t, EnsureProductionMBOMBranchProcessIdentityCutover(database), "the cutover must be restart-safe")

	var association models.ProductionMBOMBranchProcessAssociation
	require.NoError(t, database.Where("product_id = ? AND process_step_id = ?", "product-a", processStep.ID).First(&association).Error)
	require.Equal(t, 2, association.SortOrder)
	var routeStep map[string]any
	require.NoError(t, database.Table("production_route_steps").Where("id = ?", "route-step-row-a").Take(&routeStep).Error)
	require.Equal(t, "position-a", routeStep["route_step_id"])
	require.Equal(t, processStep.ID, routeStep["process_step_id"])
	require.Equal(t, "发布工序快照", routeStep["process_name_snapshot"])
	require.Equal(t, "发布说明快照", routeStep["process_description_snapshot"])

	for _, reference := range []struct{ table, column, id string }{
		{"product_barcode_states", "current_process_step_id", "state-a"},
		{"product_barcode_state_events", "from_process_step_id", "state-event-a"},
		{"product_barcode_state_events", "to_process_step_id", "state-event-a"},
		{"product_barcode_transfer_events", "from_process_step_id", "transfer-event-a"},
		{"product_barcode_transfer_events", "to_process_step_id", "transfer-event-a"},
		{"production_operation_executions", "process_step_id", "execution-a"},
		{"production_outsource_transfers", "process_step_id", "outsource-transfer-a"},
		{"production_outsource_inspections", "process_step_id", "outsource-inspection-a"},
	} {
		var processStepID string
		require.NoError(t, database.Table(reference.table).Select(reference.column).Where("id = ?", reference.id).Scan(&processStepID).Error)
		require.Equal(t, processStep.ID, processStepID, reference.table+"."+reference.column)
	}
	for _, table := range []string{"production_bom_branch_operations", "production_bom_branch_operation_process_library_selections"} {
		require.False(t, database.Migrator().HasTable(table), "old table %s must be removed", table)
	}
	for _, reference := range []struct{ table, column string }{
		{"production_route_steps", "branch_operation_id"},
		{"production_route_steps", "branch_operation_name_snapshot"},
		{"production_route_steps", "branch_operation_description_snapshot"},
		{"product_barcode_states", "current_branch_operation_id"},
		{"product_barcode_state_events", "from_branch_operation_id"},
		{"product_barcode_state_events", "to_branch_operation_id"},
		{"product_barcode_transfer_events", "from_branch_operation_id"},
		{"product_barcode_transfer_events", "to_branch_operation_id"},
		{"production_operation_executions", "branch_operation_id"},
		{"production_outsource_transfers", "branch_operation_id"},
		{"production_outsource_inspections", "branch_operation_id"},
	} {
		require.False(t, database.Migrator().HasColumn(reference.table, reference.column), "old column %s.%s must be removed", reference.table, reference.column)
	}
}
