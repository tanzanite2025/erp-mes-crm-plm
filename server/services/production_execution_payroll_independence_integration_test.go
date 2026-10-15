package services

import (
	"strconv"
	"testing"
	"xdfc-server/models"

	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
)

func removePayrollTablesFromProductionExecutionTestDatabase(t *testing.T, database *gorm.DB) {
	t.Helper()
	for _, table := range []string{"piecework_records", "piecework_rates", "employees", "teams", "users"} {
		require.NoError(t, database.Migrator().DropTable(table))
	}
}

func TestProductionExecutionAndRequestReplayWorkWithoutPayrollTablesOrEmployeeBinding(t *testing.T) {
	service, database := newProductionOperationExecutionTestService(t)
	seedProductionOperationProcess(t, database, "production-only-process")
	removePayrollTablesFromProductionExecutionTestDatabase(t, database)
	for index, action := range []string{ProductionOperationActionStart, ProductionOperationActionComplete, ProductionOperationActionHold, ProductionOperationActionRework, ProductionOperationActionComplete} {
		request := RecordProductionOperationExecutionRequest{
			ProductBarcode: "PRODUCTION-WITHOUT-PAYROLL", ProcessStepID: "production-only-process", Action: action,
			IdempotencyKey: action + "-" + strconv.Itoa(index),
		}
		original, err := service.RecordProductionOperationExecution(request)
		require.NoError(t, err)
		replayed, err := service.RecordProductionOperationExecution(request)
		require.NoError(t, err)
		require.Equal(t, original, replayed)
	}
	var operations int64
	require.NoError(t, database.Model(&models.ProductionOperationExecution{}).Count(&operations).Error)
	require.Equal(t, int64(5), operations)
}

func TestProductionScanRouteProgressAndReplayWorkWithoutPayrollTables(t *testing.T) {
	service, database := newProductionScanCommandTestService(t)
	steps := seedProductionScanRoute(t, database, "production-only-route", "production-step-one", "production-step-two")
	removePayrollTablesFromProductionExecutionTestDatabase(t, database)
	_, err := service.ExecuteProductionScanCommand(ExecuteProductionScanCommandRequest{
		IdempotencyKey: "production-only-start", ProductBarcode: "SCAN-WITHOUT-PAYROLL", RouteID: "production-only-route", Action: ProductionOperationActionStart,
	})
	require.NoError(t, err)
	request := ExecuteProductionScanCommandRequest{
		IdempotencyKey: "production-only-complete", ProductBarcode: "SCAN-WITHOUT-PAYROLL", Action: ProductionOperationActionComplete,
	}
	original, err := service.ExecuteProductionScanCommand(request)
	require.NoError(t, err)
	require.Equal(t, steps[1], original.State.RouteStepID)
	replayed, err := service.ExecuteProductionScanCommand(request)
	require.NoError(t, err)
	require.Equal(t, original, replayed)
	assertProductionScanReplaySideEffectCounts(t, database, 1, 2)
}

func TestProductionCompletionAndReworkNeverChangeExistingPayrollSnapshots(t *testing.T) {
	service, database := newProductionOperationExecutionTestService(t)
	seedProductionOperationProcess(t, database, "isolated-production-process")
	require.NoError(t, database.Exec(`CREATE TABLE audit_logs(id TEXT PRIMARY KEY,module TEXT,target_id TEXT,action TEXT,diff TEXT,operator TEXT,ip TEXT,created_at DATETIME)`).Error)
	_, err := NewPieceworkRateService(productionOperationExecutionTestTxManager{db: database}).CreatePieceworkRate(pieceworkRateTestContext(), pieceworkTestRateCommand())
	require.NoError(t, err)
	require.NoError(t, database.Exec("INSERT INTO piecework_records(id,work_date,total_amount) VALUES('historical-finance-row','2026-10-15',6)").Error)
	for _, action := range []string{ProductionOperationActionComplete, ProductionOperationActionRework, ProductionOperationActionComplete} {
		_, err := service.RecordProductionOperationExecution(RecordProductionOperationExecutionRequest{
			ProductBarcode: "PRODUCTION-PRESERVES-PAYROLL", ProcessStepID: "isolated-production-process", Action: action,
		})
		require.NoError(t, err)
	}
	var amount float64
	require.NoError(t, database.Table("piecework_records").Where("id = ?", "historical-finance-row").Select("total_amount").Scan(&amount).Error)
	require.Equal(t, 6.0, amount)
}
