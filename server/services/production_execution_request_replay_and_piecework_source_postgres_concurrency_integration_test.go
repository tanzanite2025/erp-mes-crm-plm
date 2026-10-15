package services

import (
	"context"
	"fmt"
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

type productionExecutionReplayPostgresSchemaTransactionManager struct {
	database   *gorm.DB
	schemaName string
}

func (manager productionExecutionReplayPostgresSchemaTransactionManager) DB() *gorm.DB {
	return manager.database
}

func (manager productionExecutionReplayPostgresSchemaTransactionManager) WithinTransaction(execute func(*gorm.DB) error) error {
	return manager.database.Transaction(func(transaction *gorm.DB) error {
		if err := transaction.Exec("SET LOCAL search_path TO " + manager.schemaName + ", public").Error; err != nil {
			return err
		}
		return execute(transaction)
	})
}

type productionExecutionReplayPostgresWorkFixture struct {
	manager       productionExecutionReplayPostgresSchemaTransactionManager
	barcode       string
	productID     string
	processStepID string
	routeID       string
	routeStepIDs  []string
}

func newProductionExecutionReplayPostgresCommittedFixtureInDisposableSchema(t *testing.T) productionExecutionReplayPostgresWorkFixture {
	t.Helper()
	dsn := strings.TrimSpace(os.Getenv("PIECEWORK_TEST_POSTGRES_DSN"))
	if dsn == "" {
		t.Skip("set PIECEWORK_TEST_POSTGRES_DSN to test PostgreSQL concurrent request replay")
	}
	ctx, cancel := context.WithTimeout(context.Background(), 60*time.Second)
	t.Cleanup(cancel)
	database, err := gorm.Open(postgres.Open(dsn), &gorm.Config{Logger: logger.Default.LogMode(logger.Silent)})
	require.NoError(t, err)
	database = database.WithContext(ctx)
	connection, err := database.DB()
	require.NoError(t, err)
	connection.SetMaxOpenConns(12)
	t.Cleanup(func() { require.NoError(t, connection.Close()) })
	schemaName := "production_replay_test_" + strings.ReplaceAll(uuid.NewString(), "-", "")
	require.NoError(t, database.Exec("CREATE SCHEMA "+schemaName).Error)
	t.Cleanup(func() {
		require.NoError(t, database.WithContext(context.Background()).Exec("DROP SCHEMA "+schemaName+" CASCADE").Error)
	})
	fixture := productionExecutionReplayPostgresWorkFixture{
		manager: productionExecutionReplayPostgresSchemaTransactionManager{database: database, schemaName: schemaName},
		barcode: "PG-REPLAY-" + strings.ToUpper(uuid.NewString()), productID: uuid.NewString(), routeID: uuid.NewString(),
	}
	require.NoError(t, fixture.manager.WithinTransaction(func(transaction *gorm.DB) error {
		for _, tableName := range []string{
			"employees", "teams", "users",
			"process_steps", "production_routes", "production_route_steps", "piecework_rates", "piecework_records",
			"production_execution_lots", "product_barcode_states", "product_barcode_state_events", "production_operation_executions",
			"product_barcode_transfer_events", "audit_logs", "notification_rules", "rule_execution_logs",
		} {
			if err := transaction.Exec("CREATE TABLE " + tableName + " (LIKE public." + tableName + " INCLUDING ALL)").Error; err != nil {
				return err
			}
		}
		if err := transaction.Migrator().CreateTable(&models.ProductionExecutionCommandRequestReceipt{}); err != nil {
			return err
		}
		if err := db.EnsureProductionExecutionRequestReplayIntegrity(transaction); err != nil {
			return err
		}
		if err := db.EnsureIndependentPieceworkPayrollStorageContract(transaction); err != nil {
			return err
		}
		seedPieceworkAttributionTestIdentities(t, transaction)
		if err := transaction.Create(&models.ProductionRoute{
			BaseModel: models.BaseModel{ID: fixture.routeID}, Code: "POSTGRES-REPLAY-ROUTE", Name: "Postgres replay route", ProductID: fixture.productID, Status: "PUBLISHED",
		}).Error; err != nil {
			return err
		}
		start := time.Now().UTC().Add(-time.Hour)
		for sequence := 1; sequence <= 2; sequence++ {
			processID := uuid.NewString()
			stepID := uuid.NewString()
			if sequence == 1 {
				fixture.processStepID = processID
			}
			fixture.routeStepIDs = append(fixture.routeStepIDs, stepID)
			if err := transaction.Create(&models.ProcessStep{
				BaseModel: models.BaseModel{ID: processID}, Code: processID, Name: processID, IsActive: true,
			}).Error; err != nil {
				return err
			}
			if err := transaction.Create(&models.ProductionRouteStep{
				BaseModel: models.BaseModel{ID: stepID}, RouteID: fixture.routeID, Sequence: sequence,
				SegmentID: uuid.NewString(), ProcessStepID: processID,
			}).Error; err != nil {
				return err
			}
			payItemID := uuid.NewString()
			if err := transaction.Create(&models.PieceworkPayItem{BaseModel: models.BaseModel{ID: payItemID}, Code: "PAY-" + payItemID, Name: "Unrelated payroll item", Unit: "PCS", Status: "active", Version: 1}).Error; err != nil {
				return err
			}
			if err := transaction.Create(&models.PieceworkRate{
				BaseModel: models.BaseModel{ID: uuid.NewString()}, PayItemID: payItemID, PayItemCode: "PAY-" + payItemID, PayItemName: "Unrelated payroll item",
				Unit: "PCS", UnitPrice: 2, Currency: "CNY", EffectiveFrom: &start, Status: "active", Version: 1,
			}).Error; err != nil {
				return err
			}
		}
		return transaction.Omit("plan_id", "task_id").Create(&models.ProductionExecutionLot{
			BaseModel: models.BaseModel{ID: uuid.NewString()}, ProductBarcode: fixture.barcode,
			ProductID: fixture.productID, ProductName: "Postgres replay product", Quantity: 3,
		}).Error
	}))
	return fixture
}

func runConcurrentProductionReplayRequestsAndRequireOneResultIdentity(t *testing.T, execute func(int) (string, error)) string {
	t.Helper()
	type outcome struct {
		id  string
		err error
	}
	const concurrentRequests = 8
	results := make(chan outcome, concurrentRequests)
	start := make(chan struct{})
	for index := 0; index < concurrentRequests; index++ {
		go func(index int) {
			<-start
			id, err := execute(index)
			results <- outcome{id: id, err: err}
		}(index)
	}
	close(start)
	var identity string
	for index := 0; index < concurrentRequests; index++ {
		result := <-results
		require.NoError(t, result.err)
		require.NotEmpty(t, result.id)
		if identity == "" {
			identity = result.id
		}
		require.Equal(t, identity, result.id)
	}
	return identity
}

func TestProductionExecutionPostgresConcurrentCompletionKeysCreateOneProductionFactAndNoWages(t *testing.T) {
	for _, distinctKeys := range []bool{false, true} {
		t.Run(fmt.Sprintf("distinct_request_keys=%t", distinctKeys), func(t *testing.T) {
			fixture := newProductionExecutionReplayPostgresCommittedFixtureInDisposableSchema(t)
			service := NewProductionOperationExecutionService(fixture.manager)
			runConcurrentProductionReplayRequestsAndRequireOneResultIdentity(t, func(index int) (string, error) {
				key := "concurrent-completion"
				if distinctKeys {
					key = fmt.Sprintf("concurrent-completion-%d", index)
				}
				processID := fixture.processStepID
				if index%2 == 1 {
					processID = strings.ToUpper(processID)
				}
				result, err := service.RecordProductionOperationExecution(RecordProductionOperationExecutionRequest{
					IdempotencyKey: key, ProductBarcode: fixture.barcode, ProcessStepID: processID, Action: ProductionOperationActionComplete,
				})
				return result.ID, err
			})
			require.NoError(t, fixture.manager.WithinTransaction(func(transaction *gorm.DB) error {
				assertProductionExecutionReplayFactCounts(t, transaction, 1, 1, 0)
				return nil
			}))
		})
	}
}

func TestProductionScanPostgresConcurrentImplicitStepRetryPreservesOriginalRouteProgress(t *testing.T) {
	fixture := newProductionExecutionReplayPostgresCommittedFixtureInDisposableSchema(t)
	service := NewProductionScanCommandService(fixture.manager)
	_, err := service.ExecuteProductionScanCommand(ExecuteProductionScanCommandRequest{
		IdempotencyKey: "concurrent-scan-start", ProductBarcode: fixture.barcode, RouteID: fixture.routeID, Action: ProductionOperationActionStart,
	})
	require.NoError(t, err)
	runConcurrentProductionReplayRequestsAndRequireOneResultIdentity(t, func(_ int) (string, error) {
		result, err := service.ExecuteProductionScanCommand(ExecuteProductionScanCommandRequest{
			IdempotencyKey: "concurrent-implicit-completion", ProductBarcode: fixture.barcode, Action: ProductionOperationActionComplete,
		})
		return result.Operation.ID, err
	})
	require.NoError(t, fixture.manager.WithinTransaction(func(transaction *gorm.DB) error {
		assertProductionExecutionReplayFactCounts(t, transaction, 2, 3, 0)
		assertProductionScanReplaySideEffectCounts(t, transaction, 1, 2)
		state, _, err := loadProductBarcodeStateWithEvents(transaction, fixture.barcode)
		require.NoError(t, err)
		require.Equal(t, fixture.routeStepIDs[1], state.RouteStepID)
		require.Equal(t, ProductBarcodeStateStatusNotStarted, state.Status)
		return nil
	}))
}
