package db

import (
	"testing"
	"xdfc-server/audit"

	"github.com/glebarez/sqlite"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

func newProductionExecutionReplayIntegrityMigrationTestDatabase(t *testing.T) *gorm.DB {
	t.Helper()
	database, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{Logger: logger.Default.LogMode(logger.Silent)})
	require.NoError(t, err)
	connection, err := database.DB()
	require.NoError(t, err)
	t.Cleanup(func() { require.NoError(t, connection.Close()) })
	require.NoError(t, database.Exec(`CREATE TABLE production_operation_executions (id TEXT PRIMARY KEY, action TEXT)`).Error)
	require.NoError(t, database.Exec(`CREATE TABLE piecework_records (id TEXT PRIMARY KEY, total_amount REAL)`).Error)
	return database
}

func TestProductionExecutionReplayMigrationEnforcesUniqueCompletionRoundsWithoutPayrollSourceContract(t *testing.T) {
	database := newProductionExecutionReplayIntegrityMigrationTestDatabase(t)
	require.NoError(t, EnsureProductionExecutionRequestReplayIntegrity(database))
	require.NoError(t, EnsureProductionExecutionRequestReplayIntegrity(database))
	require.NoError(t, database.Exec(`INSERT INTO production_operation_executions (id, action, work_identity_key, execution_round) VALUES ('complete-1', 'COMPLETE', 'work-1', 1)`).Error)
	require.Error(t, database.Exec(`INSERT INTO production_operation_executions (id, action, work_identity_key, execution_round) VALUES ('duplicate-complete', 'COMPLETE', 'work-1', 1)`).Error)
	require.NoError(t, database.Exec(`INSERT INTO production_operation_executions (id, action, work_identity_key, execution_round) VALUES ('complete-round-2', 'COMPLETE', 'work-1', 2), ('complete-other-step', 'COMPLETE', 'work-2', 1)`).Error)
}

func TestProductionExecutionReplayMigrationLeavesHistoricalRoundsExplicitlyUnknown(t *testing.T) {
	database := newProductionExecutionReplayIntegrityMigrationTestDatabase(t)
	require.NoError(t, database.Exec(`INSERT INTO production_operation_executions (id, action) VALUES ('old-completion', 'COMPLETE'), ('old-rework', 'REWORK')`).Error)
	require.NoError(t, EnsureProductionExecutionRequestReplayIntegrity(database))
	require.NoError(t, EnsureProductionExecutionRequestReplayIntegrity(database))
	var historicalRounds []int64
	require.NoError(t, database.Table("production_operation_executions").Order("id").Pluck("execution_round", &historicalRounds).Error)
	require.Equal(t, []int64{0, 0}, historicalRounds)
	var historicalIdentityCount int64
	require.NoError(t, database.Table("production_operation_executions").Where("work_identity_key <> ''").Count(&historicalIdentityCount).Error)
	require.Zero(t, historicalIdentityCount)
}

func TestProductionExecutionReplayMigrationPreservesPreviouslyAppliedScanEffectsIncludingFinalSteps(t *testing.T) {
	database := newProductionExecutionReplayIntegrityMigrationTestDatabase(t)
	require.NoError(t, database.Exec(`CREATE TABLE product_barcode_transfer_events (operation_id TEXT)`).Error)
	require.NoError(t, database.Exec(`CREATE TABLE audit_logs (target_id TEXT, module TEXT, action TEXT)`).Error)
	require.NoError(t, database.Exec(`INSERT INTO production_operation_executions (id, action) VALUES ('manual-final', 'COMPLETE'), ('scan-final', 'COMPLETE'), ('scan-advance', 'COMPLETE')`).Error)
	require.NoError(t, database.Exec(`INSERT INTO product_barcode_transfer_events (operation_id) VALUES ('scan-advance')`).Error)
	require.NoError(t, database.Exec(`INSERT INTO audit_logs (target_id, module, action) VALUES ('scan-final', ?, ?)`, string(audit.AuditEntityProductionOperation), string(audit.AuditActionCreate)).Error)
	require.NoError(t, EnsureProductionExecutionRequestReplayIntegrity(database))
	var appliedOperations []string
	require.NoError(t, database.Table("production_operation_executions").Where("scan_command_effects_applied = ?", true).Order("id").Pluck("id", &appliedOperations).Error)
	require.Equal(t, []string{"scan-advance", "scan-final"}, appliedOperations)
}

func TestProductionRequestReplayMigrationDoesNotRequirePayrollTablesOrAddPayrollOwnership(t *testing.T) {
	database := newProductionExecutionReplayIntegrityMigrationTestDatabase(t)
	require.NoError(t, database.Migrator().DropTable("piecework_records"))
	require.NoError(t, EnsureProductionExecutionRequestReplayIntegrity(database))
	require.NoError(t, EnsureProductionExecutionRequestReplayIntegrity(database))
	require.False(t, database.Migrator().HasTable("piecework_records"))
	for _, column := range []string{"employee_id", "team_id", "piecework_attribution_type"} {
		require.False(t, database.Migrator().HasColumn("production_operation_executions", column))
	}
}
