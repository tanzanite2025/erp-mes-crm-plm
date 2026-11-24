package db

import (
	"testing"

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
	require.NoError(t, database.Exec(`DROP INDEX uidx_production_work_completion_round_all`).Error)
	require.NoError(t, database.Exec(`CREATE UNIQUE INDEX uidx_production_work_completion_round
		ON production_operation_executions (work_identity_key, execution_round)
		WHERE action = 'COMPLETE' AND work_identity_key <> ''`).Error)
	require.NoError(t, EnsureProductionExecutionRequestReplayIntegrity(database))
	require.NoError(t, database.Exec(`INSERT INTO production_operation_executions (id, action, work_identity_key, execution_round) VALUES ('complete-1', 'COMPLETE', 'work-1', 1)`).Error)
	require.Error(t, database.Exec(`INSERT INTO production_operation_executions (id, action, work_identity_key, execution_round) VALUES ('duplicate-complete', 'COMPLETE', 'work-1', 1)`).Error)
	require.NoError(t, database.Exec(`INSERT INTO production_operation_executions (id, action, work_identity_key, execution_round) VALUES ('complete-round-2', 'COMPLETE', 'work-1', 2), ('complete-other-step', 'COMPLETE', 'work-2', 1)`).Error)
	require.NoError(t, database.Exec(`INSERT INTO production_operation_executions (id, action) VALUES ('complete-without-current-identity', 'COMPLETE')`).Error)
	require.Error(t, database.Exec(`INSERT INTO production_operation_executions (id, action) VALUES ('duplicate-without-current-identity', 'COMPLETE')`).Error)
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
