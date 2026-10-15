package services

import (
	"context"
	"os"
	"strings"
	"testing"
	"time"

	"xdfc-server/db"
	"xdfc-server/models"

	"github.com/google/uuid"
	"github.com/stretchr/testify/require"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

// PIECEWORK_TEST_POSTGRES_DSN must point to a migrated PostgreSQL database.
// The copied table definitions and every fixture are rolled back after the test.
func TestProductionCompletionPostgresDoesNotCreateWagesWithIndependentRatesPresent(t *testing.T) {
	database := newPieceworkRecordPostgresTransactionWithIsolatedProductionTableDefinitions(t)
	processStepID := uuid.NewString()
	productID := uuid.NewString()
	routeID := uuid.NewString()
	routeStepID := uuid.NewString()
	rateID := uuid.NewString()
	seedProductionOperationProcess(t, database, processStepID)
	require.NoError(t, database.Create(&models.ProductionRoute{
		BaseModel: models.BaseModel{ID: routeID},
		Code:      "POSTGRES-PIECEWORK-NULLABLE-IDENTITIES",
		Name:      "Postgres piecework nullable identities",
		ProductID: productID,
		Status:    "PUBLISHED",
	}).Error)
	require.NoError(t, database.Create(&models.ProductionRouteStep{
		BaseModel:     models.BaseModel{ID: routeStepID},
		RouteID:       routeID,
		Sequence:      10,
		SegmentID:     uuid.NewString(),
		ProcessStepID: processStepID,
	}).Error)
	start := time.Now().UTC().Add(-time.Hour)
	require.NoError(t, database.Create(&models.PieceworkRate{
		BaseModel:     models.BaseModel{ID: rateID},
		PayItemID:     pieceworkTestPayItemID,
		PayItemCode:   "PAY-001",
		PayItemName:   "Independent payroll item",
		Unit:          "PCS",
		UnitPrice:     2,
		Currency:      "CNY",
		EffectiveFrom: &start,
		Status:        "active",
		Version:       1,
	}).Error)

	for _, withRoute := range []bool{false, true} {
		testName := "production completion without route"
		if withRoute {
			testName = "production completion with route"
		}
		t.Run(testName, func(t *testing.T) {
			lot := models.ProductionExecutionLot{
				BaseModel:      models.BaseModel{ID: uuid.NewString()},
				ProductBarcode: "POSTGRES-PIECEWORK-" + strings.ToUpper(uuid.NewString()),
				ProductID:      productID,
				ProductName:    "Postgres piecework product",
				Quantity:       3,
				Status:         ProductionExecutionLotStatusActive,
			}
			require.NoError(t, database.Omit("plan_id", "task_id").Create(&lot).Error)
			request := RecordProductionOperationExecutionRequest{
				ProductBarcode: lot.ProductBarcode,
				ExecutionLotID: lot.ID,
				ProcessStepID:  processStepID,
				Action:         ProductionOperationActionComplete,
				Operator:       "postgres-integration-test",
			}
			if withRoute {
				request.RouteID = routeID
				request.RouteStepID = routeStepID
			}
			service := NewProductionOperationExecutionService(productionOperationExecutionTestTxManager{db: database})
			_, err := service.RecordProductionOperationExecutionWithContext(context.Background(), request)
			require.NoError(t, err)
			var wageRecordCount int64
			require.NoError(t, database.Table("piecework_records").Count(&wageRecordCount).Error)
			require.Zero(t, wageRecordCount)
			state, events, err := loadProductBarcodeStateWithEvents(database, lot.ProductBarcode)
			require.NoError(t, err)
			require.Equal(t, ProductBarcodeStateStatusCompleted, state.Status)
			require.Len(t, events, 1)
		})
	}
}

func newPieceworkRecordPostgresTransactionWithIsolatedProductionTableDefinitions(t *testing.T) *gorm.DB {
	t.Helper()
	dsn := strings.TrimSpace(os.Getenv("PIECEWORK_TEST_POSTGRES_DSN"))
	if dsn == "" {
		t.Skip("set PIECEWORK_TEST_POSTGRES_DSN to run against a migrated PostgreSQL database")
	}
	database, err := gorm.Open(postgres.Open(dsn), &gorm.Config{Logger: logger.Default.LogMode(logger.Silent)})
	require.NoError(t, err)
	connection, err := database.DB()
	require.NoError(t, err)
	t.Cleanup(func() { require.NoError(t, connection.Close()) })
	transaction := database.Begin()
	require.NoError(t, transaction.Error)
	t.Cleanup(func() { require.NoError(t, transaction.Rollback().Error) })
	schemaName := "piecework_record_postgres_test_" + strings.ReplaceAll(uuid.NewString(), "-", "")
	require.NoError(t, transaction.Exec("CREATE SCHEMA "+schemaName).Error)
	require.NoError(t, transaction.Exec("SET LOCAL search_path TO "+schemaName+", public").Error)
	for _, tableName := range []string{
		"employees", "teams", "users",
		"process_steps", "production_routes", "production_route_steps", "piecework_rates", "piecework_records",
		"production_execution_lots", "product_barcode_states", "product_barcode_state_events", "production_operation_executions",
	} {
		require.NoError(t, transaction.Exec("CREATE TABLE "+tableName+" (LIKE public."+tableName+" INCLUDING ALL)").Error)
	}
	require.NoError(t, transaction.Migrator().CreateTable(&models.ProductionExecutionCommandRequestReceipt{}))
	require.NoError(t, db.EnsureProductionExecutionRequestReplayIntegrity(transaction))
	require.NoError(t, db.EnsureIndependentPieceworkPayrollStorageContract(transaction))
	seedPieceworkAttributionTestIdentities(t, transaction)
	require.NoError(t, transaction.Create(&models.PieceworkPayItem{BaseModel: models.BaseModel{ID: pieceworkTestPayItemID}, Code: "PAY-001", Name: "Independent payroll item", Unit: "PCS", Status: "active", Version: 1}).Error)
	return transaction
}
