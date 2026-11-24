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
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/stdlib"
	"github.com/stretchr/testify/require"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
	"gorm.io/gorm/logger"
)

type productionPlanMBOMBranchPostgresFixture struct {
	database       *gorm.DB
	plan           models.ProductionPlan
	route          models.ProductionRoute
	workLocationID string
}

func createProductionPlanMBOMBranchPostgresFixture(t *testing.T) productionPlanMBOMBranchPostgresFixture {
	t.Helper()
	dsn := strings.TrimSpace(os.Getenv("PRODUCTION_MBOM_BRANCH_TEST_POSTGRES_DSN"))
	if dsn == "" {
		t.Skip("set PRODUCTION_MBOM_BRANCH_TEST_POSTGRES_DSN for isolated PostgreSQL plan branch locking and scan tests")
	}
	admin, err := gorm.Open(postgres.Open(dsn), &gorm.Config{Logger: logger.Default.LogMode(logger.Silent)})
	require.NoError(t, err)
	adminConnection, err := admin.DB()
	require.NoError(t, err)
	t.Cleanup(func() { require.NoError(t, adminConnection.Close()) })
	schemaName := "production_plan_branch_" + strings.ReplaceAll(uuid.NewString(), "-", "")
	require.NoError(t, admin.Exec("CREATE SCHEMA "+schemaName).Error)
	t.Cleanup(func() { require.NoError(t, admin.Exec("DROP SCHEMA "+schemaName+" CASCADE").Error) })
	config, err := pgx.ParseConfig(dsn)
	require.NoError(t, err)
	config.RuntimeParams["search_path"] = schemaName
	config.RuntimeParams["statement_timeout"] = "15000"
	connection := stdlib.OpenDB(*config)
	connection.SetMaxOpenConns(12)
	t.Cleanup(func() { require.NoError(t, connection.Close()) })
	database, err := gorm.Open(postgres.New(postgres.Config{Conn: connection}), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Silent), IgnoreRelationshipsWhenMigrating: true,
	})
	require.NoError(t, err)
	for _, statement := range []string{
		`CREATE TABLE products (id uuid PRIMARY KEY, sku text, name text, status text, deleted_at timestamptz)`,
		`CREATE TABLE customers (id uuid PRIMARY KEY, name text, deleted_at timestamptz)`,
		`CREATE TABLE boms (id uuid PRIMARY KEY, product_id uuid NOT NULL, bom_type text, status text, owner_type text,
			owner_customer_id varchar(36) NOT NULL DEFAULT '', version_level text, effective_from timestamptz, effective_to timestamptz, deleted_at timestamptz)`,
		`CREATE TABLE audit_logs (id uuid PRIMARY KEY, module text, target_id text, action text, diff text, operator text, ip text, created_at timestamptz)`,
	} {
		require.NoError(t, database.Exec(statement).Error)
	}
	require.NoError(t, database.AutoMigrate(&models.ProductionPlan{}, &models.ProductionTask{}, &models.ProductionExecutionLot{},
		&models.ProcessStep{}, &models.ProductionBOMBranchOperation{}, &models.ProductionBOMBranchOperationProcessLibrarySelection{},
		&models.ProductionRouteFamily{}, &models.ProductionRoute{}, &models.ProductionRouteStep{}, &models.ProductionWorkLocation{},
		&models.ProductBarcodeState{}, &models.ProductBarcodeStateEvent{}, &models.ProductBarcodeTransferEvent{}, &models.ProductionOperationExecution{}))
	require.NoError(t, db.EnsureProductionExecutionRequestReplayIntegrity(database))
	productID := uuid.NewString()
	require.NoError(t, database.Exec(`INSERT INTO products (id, sku, name, status) VALUES (?, 'MBOM-TEST', '测试产品', 'ACTIVE')`, productID).Error)
	for _, performanceVersion := range []string{"standard", "lightweight"} {
		require.NoError(t, database.Exec(`INSERT INTO boms (id, product_id, bom_type, status, owner_type, version_level)
			VALUES (?, ?, 'MBOM', 'RELEASED', 'INTERNAL', ?)`, uuid.NewString(), productID, performanceVersion).Error)
	}
	processLibrary := models.ProcessStep{Code: "PLAN-BRANCH-CUT", Name: "裁切", IsActive: true}
	require.NoError(t, database.Create(&processLibrary).Error)
	operation := models.ProductionBOMBranchOperation{
		ProductID: productID, BOMOwnerType: "INTERNAL", BOMVersionLevel: "standard", Name: "裁切", IsActive: true,
		ProcessLibraryID: processLibrary.ID,
	}
	require.NoError(t, database.Create(&operation).Error)
	require.NoError(t, database.Create(&models.ProductionBOMBranchOperationProcessLibrarySelection{
		ProductID: productID, BOMOwnerType: "INTERNAL", BOMVersionLevel: "standard",
		BranchOperationID: operation.ID, ProcessLibraryID: processLibrary.ID,
	}).Error)
	routeFamily := models.ProductionRouteFamily{
		BaseModel:       models.BaseModel{ID: uuid.NewString()},
		Code:            "PLAN-BRANCH-ROUTE",
		ProductID:       productID,
		BOMOwnerType:    "INTERNAL",
		BOMVersionLevel: "standard",
	}
	require.NoError(t, database.Create(&routeFamily).Error)
	route := models.ProductionRoute{
		BaseModel:     models.BaseModel{ID: uuid.NewString()},
		RouteFamilyID: routeFamily.ID, RevisionNo: 1,
		Code: "PLAN-BRANCH-ROUTE", Name: "计划分支路线", ProductID: productID,
		BOMOwnerType: "INTERNAL", BOMVersionLevel: "standard", Status: "PUBLISHED",
	}
	require.NoError(t, database.Create(&route).Error)
	for sequence := 1; sequence <= 2; sequence++ {
		step := models.ProductionRouteStep{RouteID: route.ID, Sequence: sequence, BranchOperationID: operation.ID}
		require.NoError(t, database.Create(&step).Error)
		route.Steps = append(route.Steps, step)
	}
	require.NoError(t, database.Model(&routeFamily).Update("current_revision_id", route.ID).Error)
	plan := models.ProductionPlan{
		OrderNo: "ISOLATED-MBOM-PLAN", ProductID: productID, ProductName: "测试产品", BOMOwnerType: "INTERNAL",
		BOMVersionLevel: "standard", ProductionRouteRevisionID: route.ID, ProductionRouteRevisionNo: route.RevisionNo,
		Status: "SCHEDULED", Quantity: 1,
	}
	require.NoError(t, database.Omit("OrderID", "SalesOrder", "Tasks").Create(&plan).Error)
	location := models.ProductionWorkLocation{Code: "TEST-LOCATION", Name: "测试地点", IsActive: true}
	require.NoError(t, database.Create(&location).Error)
	return productionPlanMBOMBranchPostgresFixture{database: database, plan: plan, route: route, workLocationID: location.ID}
}

func waitForProductionPlanPostgresTransactionToBlock(t *testing.T, database *gorm.DB, blockedPID int) {
	t.Helper()
	require.Eventually(t, func() bool {
		var isBlocked bool
		err := database.Raw("SELECT cardinality(pg_blocking_pids(?)) > 0", blockedPID).Scan(&isBlocked).Error
		return err == nil && isBlocked
	}, 5*time.Second, 10*time.Millisecond, "the second transaction must wait on the production plan row lock")
}

func TestProductionPlanMBOMBranchPostgresLotRegistrationPreventsConcurrentBranchChange(t *testing.T) {
	fixture := createProductionPlanMBOMBranchPostgresFixture(t)
	database := fixture.database
	locked := database.Begin()
	require.NoError(t, locked.Error)
	t.Cleanup(func() { locked.Rollback() })
	var previous models.ProductionPlan
	require.NoError(t, locked.Clauses(clause.Locking{Strength: "UPDATE"}).First(&previous, "id = ?", fixture.plan.ID).Error)
	lot := models.ProductionExecutionLot{ProductBarcode: "PG-LOT-FIRST", ProductID: previous.ProductID, PlanID: previous.ID}
	require.NoError(t, locked.Omit("TaskID").Create(&lot).Error)
	blockedPID := make(chan int, 1)
	finished := make(chan error, 1)
	go func() {
		finished <- database.Transaction(func(transaction *gorm.DB) error {
			var pid int
			if err := transaction.Raw("SELECT pg_backend_pid()").Scan(&pid).Error; err != nil {
				return err
			}
			blockedPID <- pid
			var plan models.ProductionPlan
			if err := transaction.Clauses(clause.Locking{Strength: "UPDATE"}).First(&plan, "id = ?", previous.ID).Error; err != nil {
				return err
			}
			updated := plan
			updated.BOMVersionLevel = "lightweight"
			return ValidateProductionPlanBOMBranchTx(transaction, &updated, &plan)
		})
	}()
	waitForProductionPlanPostgresTransactionToBlock(t, database, <-blockedPID)
	require.NoError(t, locked.Commit().Error)
	require.ErrorIs(t, <-finished, ErrInvalidProductionPlanBOMBranch)
}

func TestProductionPlanMBOMBranchPostgresLotRevalidatesProductAfterWaitingForPlanUpdate(t *testing.T) {
	for _, suppliesProduct := range []bool{false, true} {
		t.Run(fmt.Sprintf("client_supplies_product=%t", suppliesProduct), func(t *testing.T) {
			fixture := createProductionPlanMBOMBranchPostgresFixture(t)
			database := fixture.database
			newProductID := uuid.NewString()
			require.NoError(t, database.Exec(`INSERT INTO products (id, sku, name, status) VALUES (?, 'UPDATED-PRODUCT', '更新后的产品', 'ACTIVE')`, newProductID).Error)
			require.NoError(t, database.Exec(`INSERT INTO boms (id, product_id, bom_type, status, owner_type, version_level)
				VALUES (?, ?, 'MBOM', 'RELEASED', 'INTERNAL', 'standard')`, uuid.NewString(), newProductID).Error)
			clientProductID := ""
			if suppliesProduct {
				clientProductID = fixture.plan.ProductID
			}
			locked := database.Begin()
			require.NoError(t, locked.Error)
			t.Cleanup(func() { locked.Rollback() })
			require.NoError(t, locked.Model(&models.ProductionPlan{}).Where("id = ?", fixture.plan.ID).
				Updates(map[string]any{"product_id": newProductID, "product_name": "更新后的产品"}).Error)
			blockedPID := make(chan int, 1)
			manager := productionPlanPostgresObservedTransactionManager{database: database, transactionPID: blockedPID}
			service := NewProductionExecutionLotService(manager)
			type outcome struct {
				lot ProductionExecutionLotResponse
				err error
			}
			finished := make(chan outcome, 1)
			go func() {
				lot, err := service.SaveProductionExecutionLot(SaveProductionExecutionLotRequest{
					ProductBarcode: "PG-PLAN-FIRST-" + uuid.NewString(), PlanID: fixture.plan.ID, ProductID: clientProductID,
				})
				finished <- outcome{lot: lot, err: err}
			}()
			waitForProductionPlanPostgresTransactionToBlock(t, database, <-blockedPID)
			require.NoError(t, locked.Commit().Error)
			result := <-finished
			if clientProductID != "" {
				require.ErrorIs(t, result.err, ErrInvalidProductionExecutionLot)
				return
			}
			require.NoError(t, result.err)
			require.Equal(t, newProductID, result.lot.ProductID)
			require.Equal(t, "更新后的产品", result.lot.ProductName)
		})
	}
}

func TestProductionPlanMBOMBranchPostgresScanRejectsInvalidBranchOrUnpublishedRouteWithoutFacts(t *testing.T) {
	for _, condition := range []string{"inactive_product", "expired_mbom", "no_published_route", "inactive_operation"} {
		t.Run(condition, func(t *testing.T) {
			fixture := createProductionPlanMBOMBranchPostgresFixture(t)
			database := fixture.database
			lot := models.ProductionExecutionLot{ProductBarcode: "PG-INVALID-PLAN", ProductID: fixture.plan.ProductID, PlanID: fixture.plan.ID}
			require.NoError(t, database.Omit("TaskID").Create(&lot).Error)
			switch condition {
			case "inactive_product":
				require.NoError(t, database.Exec(`UPDATE products SET status = 'INACTIVE'`).Error)
			case "expired_mbom":
				require.NoError(t, database.Exec(`UPDATE boms SET effective_to = CURRENT_TIMESTAMP - interval '1 day'`).Error)
			case "no_published_route":
				require.NoError(t, database.Model(&models.ProductionRoute{}).Where("id = ?", fixture.route.ID).Update("status", "DRAFT").Error)
			case "inactive_operation":
				require.NoError(t, database.Model(&models.ProductionBOMBranchOperation{}).Where("id = ?", fixture.route.Steps[0].BranchOperationID).Update("is_active", false).Error)
			}
			service := NewProductionScanCommandService(productionOperationExecutionTestTxManager{db: database})
			_, err := service.ExecuteProductionScanCommand(ExecuteProductionScanCommandRequest{
				IdempotencyKey: "invalid-plan", ProductBarcode: lot.ProductBarcode, Action: ProductionOperationActionStart,
				ProductionWorkLocationID: fixture.workLocationID,
			})
			require.ErrorIs(t, err, ErrInvalidProductionScanCommand)
			for _, tableName := range []string{"product_barcode_states", "production_operation_executions", "production_execution_command_request_receipts"} {
				var count int64
				require.NoError(t, database.Table(tableName).Count(&count).Error)
				require.Zero(t, count, tableName)
			}
		})
	}
}

func TestProductionPlanMBOMBranchPostgresScanUsesPlanBoundRevisionAfterNewRevisionPublication(t *testing.T) {
	fixture := createProductionPlanMBOMBranchPostgresFixture(t)
	database := fixture.database
	newRevision := fixture.route
	newRevision.ID = uuid.NewString()
	newRevision.RevisionNo = 2
	newRevision.BasedOnRouteID = productionRouteBasedOnRevisionIDPointer(fixture.route.ID)
	newRevision.Steps = nil
	require.NoError(t, database.Create(&newRevision).Error)
	newRevisionStep := fixture.route.Steps[0]
	newRevisionStep.ID = uuid.NewString()
	newRevisionStep.RouteID = newRevision.ID
	require.NoError(t, database.Create(&newRevisionStep).Error)
	require.NoError(t, database.Model(&models.ProductionRouteFamily{}).
		Where("id = ?", fixture.route.RouteFamilyID).
		Update("current_revision_id", newRevision.ID).Error)
	lot := models.ProductionExecutionLot{ProductBarcode: "PG-PLAN-BOUND-REVISION", ProductID: fixture.plan.ProductID, PlanID: fixture.plan.ID}
	require.NoError(t, database.Omit("TaskID").Create(&lot).Error)

	service := NewProductionScanCommandService(productionOperationExecutionTestTxManager{db: database})
	response, err := service.ExecuteProductionScanCommand(ExecuteProductionScanCommandRequest{
		IdempotencyKey: "plan-bound-route-revision", ProductBarcode: lot.ProductBarcode,
		Action: ProductionOperationActionStart, ProductionWorkLocationID: fixture.workLocationID,
	})

	require.NoError(t, err)
	require.Equal(t, fixture.route.ID, response.Operation.RouteID)
	require.Equal(t, fixture.route.Steps[0].ID, response.Operation.RouteStepID)
}

func TestProductionPlanMBOMBranchPostgresInitializedBarcodePreventsBranchChangeAfterLotSoftDelete(t *testing.T) {
	fixture := createProductionPlanMBOMBranchPostgresFixture(t)
	database := fixture.database
	lot := models.ProductionExecutionLot{ProductBarcode: "PG-INITIALIZED-PLAN", ProductID: fixture.plan.ProductID, PlanID: fixture.plan.ID}
	require.NoError(t, database.Omit("TaskID").Create(&lot).Error)
	state := models.ProductBarcodeState{
		ProductBarcode: lot.ProductBarcode, RouteID: fixture.route.ID, RouteStepID: fixture.route.Steps[0].ID,
		CurrentBranchOperationID: fixture.route.Steps[0].BranchOperationID,
	}
	require.NoError(t, database.Omit("LastEventID").Create(&state).Error)
	require.NoError(t, database.Delete(&lot).Error)
	updated := fixture.plan
	updated.BOMVersionLevel = "lightweight"
	err := database.Transaction(func(transaction *gorm.DB) error {
		return ValidateProductionPlanBOMBranchTx(transaction, &updated, &fixture.plan)
	})
	require.ErrorIs(t, err, ErrInvalidProductionPlanBOMBranch)
	require.ErrorContains(t, err, "cannot change its MBOM branch")
}

type productionPlanPostgresObservedTransactionManager struct {
	database       *gorm.DB
	transactionPID chan<- int
}

func (manager productionPlanPostgresObservedTransactionManager) DB() *gorm.DB {
	return manager.database
}

func (manager productionPlanPostgresObservedTransactionManager) WithinTransaction(execute func(*gorm.DB) error) error {
	return manager.database.Transaction(func(transaction *gorm.DB) error {
		var pid int
		if err := transaction.Raw("SELECT pg_backend_pid()").Scan(&pid).Error; err != nil {
			return err
		}
		manager.transactionPID <- pid
		return execute(transaction)
	})
}

func TestProductionPlanMBOMBranchPostgresBarcodeScanResolvesRouteAndReplaysConcurrentCompletion(t *testing.T) {
	fixture := createProductionPlanMBOMBranchPostgresFixture(t)
	database := fixture.database
	lot := models.ProductionExecutionLot{ProductBarcode: "PG-PLAN-SCAN", ProductID: fixture.plan.ProductID, PlanID: fixture.plan.ID}
	require.NoError(t, database.Omit("TaskID").Create(&lot).Error)
	service := NewProductionScanCommandService(productionOperationExecutionTestTxManager{db: database})
	request := ExecuteProductionScanCommandRequest{
		IdempotencyKey: "plan-scan-start", ProductBarcode: lot.ProductBarcode, Action: ProductionOperationActionStart,
		ProductionWorkLocationID: fixture.workLocationID,
	}
	started, err := service.ExecuteProductionScanCommandWithContext(context.Background(), request)
	require.NoError(t, err)
	require.Equal(t, fixture.route.ID, started.Operation.RouteID)
	require.Equal(t, fixture.route.Steps[0].ID, started.Operation.RouteStepID)
	request.Action, request.IdempotencyKey = ProductionOperationActionComplete, "plan-scan-concurrent-complete"
	results := make(chan error, 8)
	for index := 0; index < 8; index++ {
		go func() {
			result, err := service.ExecuteProductionScanCommand(request)
			if err == nil && result.State.RouteStepID != fixture.route.Steps[1].ID {
				err = fmt.Errorf("replayed completion did not preserve the plan route's second step")
			}
			results <- err
		}()
	}
	for index := 0; index < 8; index++ {
		require.NoError(t, <-results)
	}
	var completions, transfers int64
	require.NoError(t, database.Model(&models.ProductionOperationExecution{}).Where("action = 'COMPLETE'").Count(&completions).Error)
	require.NoError(t, database.Model(&models.ProductBarcodeTransferEvent{}).Where("transfer_type = 'ROUTE_ADVANCE'").Count(&transfers).Error)
	require.EqualValues(t, 1, completions)
	require.EqualValues(t, 1, transfers)
}
