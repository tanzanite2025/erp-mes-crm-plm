package db

import (
	"testing"

	"github.com/glebarez/sqlite"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

func TestEnsureProductionBOMBranchOperationProcessLibraryIdentityBackfillsAndIsIdempotent(t *testing.T) {
	database, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{Logger: logger.Default.LogMode(logger.Silent)})
	require.NoError(t, err)
	require.NoError(t, database.Exec(`CREATE TABLE production_bom_branch_operations (
		id TEXT PRIMARY KEY, created_at DATETIME, updated_at DATETIME, deleted_at DATETIME,
		product_id TEXT NOT NULL, bom_owner_type TEXT NOT NULL, bom_owner_customer_id TEXT NOT NULL DEFAULT '',
		bom_version_level TEXT NOT NULL DEFAULT '', name TEXT NOT NULL, description TEXT,
		sort_order INTEGER NOT NULL DEFAULT 0, is_active BOOLEAN NOT NULL DEFAULT true, process_library_id TEXT
	)`).Error)
	require.NoError(t, database.Exec(`CREATE TABLE production_bom_branch_operation_process_library_selections (
		id TEXT PRIMARY KEY, created_at DATETIME, updated_at DATETIME, deleted_at DATETIME,
		product_id TEXT NOT NULL, bom_owner_type TEXT NOT NULL, bom_owner_customer_id TEXT NOT NULL DEFAULT '',
		bom_version_level TEXT NOT NULL DEFAULT '', branch_operation_id TEXT NOT NULL,
		process_library_id TEXT NOT NULL, sort_order INTEGER NOT NULL DEFAULT 0
	)`).Error)
	require.NoError(t, database.Exec(`INSERT INTO production_bom_branch_operations
		(id, product_id, bom_owner_type, name, is_active) VALUES
		('selected-operation', 'product-1', 'INTERNAL', 'Selected', true),
		('route-operation', 'product-1', 'INTERNAL', 'Route only', true)`).Error)
	require.NoError(t, database.Exec(`UPDATE production_bom_branch_operations SET process_library_id = 'process-2' WHERE id = 'route-operation'`).Error)
	require.NoError(t, database.Exec(`INSERT INTO production_bom_branch_operation_process_library_selections
		(id, product_id, bom_owner_type, branch_operation_id, process_library_id)
		VALUES ('selection-1', 'product-1', 'INTERNAL', 'selected-operation', 'process-1')`).Error)

	require.NoError(t, EnsureProductionBOMBranchOperationProcessLibraryIdentity(database))
	require.NoError(t, EnsureProductionBOMBranchOperationProcessLibraryIdentity(database))

	var selectedProcessLibraryID string
	require.NoError(t, database.Raw(`SELECT process_library_id FROM production_bom_branch_operations WHERE id = 'selected-operation'`).Scan(&selectedProcessLibraryID).Error)
	require.Equal(t, "process-1", selectedProcessLibraryID)
	var routeOnlyProcessLibraryID string
	require.NoError(t, database.Raw(`SELECT process_library_id FROM production_bom_branch_operations WHERE id = 'route-operation'`).Scan(&routeOnlyProcessLibraryID).Error)
	require.Equal(t, "process-2", routeOnlyProcessLibraryID)
	var selectionCount int64
	require.NoError(t, database.Raw(`SELECT COUNT(*) FROM production_bom_branch_operation_process_library_selections`).Scan(&selectionCount).Error)
	require.EqualValues(t, 2, selectionCount)
}

func TestEnsureProductionBOMBranchOperationProcessLibraryIdentityAddsMissingColumn(t *testing.T) {
	database, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{Logger: logger.Default.LogMode(logger.Silent)})
	require.NoError(t, err)
	require.NoError(t, database.Exec(`CREATE TABLE production_bom_branch_operations (
		id TEXT PRIMARY KEY, created_at DATETIME, updated_at DATETIME, deleted_at DATETIME,
		product_id TEXT NOT NULL, bom_owner_type TEXT NOT NULL, bom_owner_customer_id TEXT NOT NULL DEFAULT '',
		bom_version_level TEXT NOT NULL DEFAULT '', name TEXT NOT NULL, description TEXT,
		sort_order INTEGER NOT NULL DEFAULT 0, is_active BOOLEAN NOT NULL DEFAULT true
	)`).Error)
	require.NoError(t, database.Exec(`CREATE TABLE production_bom_branch_operation_process_library_selections (
		id TEXT PRIMARY KEY, created_at DATETIME, updated_at DATETIME, deleted_at DATETIME,
		product_id TEXT NOT NULL, bom_owner_type TEXT NOT NULL, bom_owner_customer_id TEXT NOT NULL DEFAULT '',
		bom_version_level TEXT NOT NULL DEFAULT '', branch_operation_id TEXT NOT NULL,
		process_library_id TEXT NOT NULL, sort_order INTEGER NOT NULL DEFAULT 0
	)`).Error)
	require.NoError(t, database.Exec(`INSERT INTO production_bom_branch_operations
		(id, product_id, bom_owner_type, name, is_active) VALUES ('selected-operation', 'product-1', 'INTERNAL', 'Selected', true)`).Error)
	require.NoError(t, database.Exec(`INSERT INTO production_bom_branch_operation_process_library_selections
		(id, product_id, bom_owner_type, branch_operation_id, process_library_id)
		VALUES ('selection-1', 'product-1', 'INTERNAL', 'selected-operation', 'process-1')`).Error)

	require.NoError(t, EnsureProductionBOMBranchOperationProcessLibraryIdentity(database))
	require.True(t, database.Migrator().HasColumn("production_bom_branch_operations", "process_library_id"))
	var processLibraryID string
	require.NoError(t, database.Raw(`SELECT process_library_id FROM production_bom_branch_operations WHERE id = 'selected-operation'`).Scan(&processLibraryID).Error)
	require.Equal(t, "process-1", processLibraryID)
}
