package services

import (
	"testing"
	"xdfc-server/models"

	"github.com/glebarez/sqlite"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

type productBarcodeStateTestTxManager struct {
	db *gorm.DB
}

func (m productBarcodeStateTestTxManager) DB() *gorm.DB {
	return m.db
}

func (m productBarcodeStateTestTxManager) WithinTransaction(fn func(tx *gorm.DB) error) error {
	return m.db.Transaction(fn)
}

func newProductBarcodeStateTestService(t *testing.T) (*ProductBarcodeStateService, *gorm.DB) {
	t.Helper()

	database, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Silent),
	})
	require.NoError(t, err)
	createProductBarcodeStateTestSchema(t, database)

	return NewProductBarcodeStateService(productBarcodeStateTestTxManager{db: database}), database
}

func createProductBarcodeStateTestSchema(t *testing.T, database *gorm.DB) {
	t.Helper()
	require.NoError(t, database.Exec(`
		CREATE TABLE production_bom_branch_operations (
			id TEXT PRIMARY KEY,
			created_at DATETIME,
			updated_at DATETIME,
			deleted_at DATETIME,
			product_id TEXT NOT NULL,
			bom_owner_type TEXT NOT NULL,
			bom_owner_customer_id TEXT NOT NULL DEFAULT '',
			bom_version_level TEXT NOT NULL DEFAULT '',
			name TEXT NOT NULL,
		description TEXT,
		sort_order INTEGER NOT NULL DEFAULT 0,
			is_active BOOLEAN NOT NULL DEFAULT true
		)
	`).Error)

	require.NoError(t, database.Exec(`
		CREATE TABLE process_steps (
			id TEXT PRIMARY KEY,
			created_at DATETIME,
			updated_at DATETIME,
			deleted_at DATETIME,
			code TEXT NOT NULL,
			name TEXT NOT NULL,
			description TEXT,
			sort_order INTEGER,
			is_active BOOLEAN
		)
	`).Error)
	require.NoError(t, database.Exec(`
		CREATE TABLE production_routes (
			id TEXT PRIMARY KEY,
			created_at DATETIME,
			updated_at DATETIME,
			deleted_at DATETIME,
			code TEXT,
			name TEXT,
			product_id TEXT,
			product_sku TEXT,
			product_name TEXT,
			product_template_id TEXT,
			bom_owner_type TEXT,
			bom_owner_customer_id TEXT,
			bom_owner_customer_name TEXT,
			bom_version_level TEXT,
			description TEXT,
			version INTEGER,
			status TEXT
		)
	`).Error)
	require.NoError(t, database.Exec(`
		CREATE TABLE production_route_steps (
			id TEXT PRIMARY KEY,
			created_at DATETIME,
			updated_at DATETIME,
			deleted_at DATETIME,
			route_id TEXT,
			sequence INTEGER,
			branch_operation_id TEXT,
			execution_mode TEXT,
			quality_gate TEXT,
			quality_routing TEXT,
			estimated_minutes INTEGER,
			transfer_required BOOLEAN,
			description TEXT
		)
	`).Error)
	require.NoError(t, database.Exec(`
		CREATE TABLE product_barcode_states (
			id TEXT PRIMARY KEY,
			created_at DATETIME,
			updated_at DATETIME,
			deleted_at DATETIME,
			product_barcode TEXT NOT NULL UNIQUE,
			product_id TEXT,
			product_name TEXT,
			route_id TEXT,
			route_step_id TEXT,
			current_branch_operation_id TEXT,
			status TEXT,
			last_event_id TEXT,
			started_at DATETIME,
			completed_at DATETIME
		)
	`).Error)
	require.NoError(t, database.Exec(`
		CREATE TABLE product_barcode_state_events (
			id TEXT PRIMARY KEY,
			created_at DATETIME,
			updated_at DATETIME,
			deleted_at DATETIME,
			state_id TEXT NOT NULL,
			operation_id TEXT,
			product_barcode TEXT NOT NULL,
			event_type TEXT NOT NULL,
			from_branch_operation_id TEXT,
			to_branch_operation_id TEXT,
			route_id TEXT,
			route_step_id TEXT,
			operator TEXT,
			payload_snapshot TEXT,
			occurred_at DATETIME
		)
	`).Error)
	migrateProductionRouteRevisionTestSchema(t, database, false)
}

func seedProductBarcodeStateBranchOperation(t *testing.T, database *gorm.DB, id string, name string) {
	t.Helper()

	require.NoError(t, database.Create(&models.ProductionBOMBranchOperation{
		BaseModel:    models.BaseModel{ID: id},
		ProductID:    "product-1",
		Name:         name,
		BOMOwnerType: "INTERNAL",
		IsActive:     true,
	}).Error)
}

func seedProductBarcodeStateRoute(t *testing.T, database *gorm.DB, routeID string, processStepIDs ...string) []string {
	t.Helper()
	createProductionRouteRevisionTestRecord(t, database, models.ProductionRoute{
		BaseModel:    models.BaseModel{ID: routeID},
		Code:         "ROUTE-" + routeID,
		Name:         "Route " + routeID,
		ProductID:    "product-1",
		BOMOwnerType: "INTERNAL",
		Status:       "PUBLISHED",
	})

	routeStepIDs := make([]string, 0, len(processStepIDs))
	for index, processStepID := range processStepIDs {
		routeStepID := routeID + "-step-" + processStepID
		require.NoError(t, database.Create(&models.ProductionRouteStep{
			BaseModel:         models.BaseModel{ID: routeStepID},
			RouteID:           routeID,
			Sequence:          index + 1,
			BranchOperationID: processStepID,
			ExecutionMode:     "IN_HOUSE",
			QualityGate:       "NONE",
		}).Error)
		routeStepIDs = append(routeStepIDs, routeStepID)
	}
	return routeStepIDs
}

func TestInitializeProductBarcodeStateCreatesNotStartedStateAndEvent(t *testing.T) {
	service, database := newProductBarcodeStateTestService(t)
	seedProductBarcodeStateBranchOperation(t, database, "process-a", "首道工序")
	routeStepIDs := seedProductBarcodeStateRoute(t, database, "route-a", "process-a")

	state, err := service.InitializeProductBarcodeState(InitializeProductBarcodeStateRequest{
		ProductBarcode:    " abc-001 ",
		ProductID:         "product-1",
		ProductName:       "产品A",
		RouteID:           "route-a",
		RouteStepID:       routeStepIDs[0],
		BranchOperationID: "process-a",
		Operator:          "tester",
	})

	require.NoError(t, err)
	require.Equal(t, "ABC-001", state.ProductBarcode)
	require.Equal(t, ProductBarcodeStateStatusNotStarted, state.Status)
	require.Equal(t, "route-a", state.RouteID)
	require.Equal(t, routeStepIDs[0], state.RouteStepID)
	require.Equal(t, "process-a", state.CurrentBranchOperationID)
	require.NotNil(t, state.CurrentBranchOperation)
	require.Equal(t, "首道工序", state.CurrentBranchOperation.Name)
	require.Len(t, state.Events, 1)
	require.Equal(t, ProductBarcodeStateEventInitialized, state.Events[0].EventType)
	require.Empty(t, state.Events[0].OperationID)
	require.NotEmpty(t, state.LastEventID)
}

func TestInitializeProductBarcodeStateRejectsDuplicateWithoutOverwritingState(t *testing.T) {
	service, database := newProductBarcodeStateTestService(t)

	initial, err := service.InitializeProductBarcodeState(InitializeProductBarcodeStateRequest{
		ProductBarcode: "ABC-002",
		ProductID:      "product-1",
		ProductName:    "原始产品名",
	})
	require.NoError(t, err)

	_, err = service.InitializeProductBarcodeState(InitializeProductBarcodeStateRequest{
		ProductBarcode: "ABC-002",
		ProductID:      "product-2",
		ProductName:    "不应覆盖的产品名",
	})

	require.ErrorIs(t, err, ErrProductBarcodeStateAlreadyInitialized)

	state, err := service.GetProductBarcodeState("ABC-002")
	require.NoError(t, err)
	require.Equal(t, initial.ID, state.ID)
	require.Equal(t, "product-1", state.ProductID)
	require.Equal(t, "原始产品名", state.ProductName)
	require.Equal(t, ProductBarcodeStateStatusNotStarted, state.Status)
	require.Len(t, state.Events, 1)
	require.Equal(t, ProductBarcodeStateEventInitialized, state.Events[0].EventType)

	var stateCount int64
	require.NoError(t, database.Model(&models.ProductBarcodeState{}).Where("product_barcode = ?", "ABC-002").Count(&stateCount).Error)
	require.EqualValues(t, 1, stateCount)
}

func TestInitializeProductBarcodeStateRejectsExecutionStatuses(t *testing.T) {
	service, database := newProductBarcodeStateTestService(t)
	statuses := []string{
		ProductBarcodeStateStatusInProgress,
		ProductBarcodeStateStatusCompleted,
		ProductBarcodeStateStatusHold,
		ProductBarcodeStateStatusRework,
	}

	for _, status := range statuses {
		t.Run(status, func(t *testing.T) {
			_, err := service.InitializeProductBarcodeState(InitializeProductBarcodeStateRequest{
				ProductBarcode: "ABC-003-" + status,
				Status:         status,
			})
			require.ErrorIs(t, err, ErrInvalidProductBarcodeState)
		})
	}

	var stateCount int64
	require.NoError(t, database.Model(&models.ProductBarcodeState{}).Count(&stateCount).Error)
	require.Zero(t, stateCount)
	var eventCount int64
	require.NoError(t, database.Model(&models.ProductBarcodeStateEvent{}).Count(&eventCount).Error)
	require.Zero(t, eventCount)
}

func TestInitializeProductBarcodeStateRejectsMissingProcess(t *testing.T) {
	service, _ := newProductBarcodeStateTestService(t)

	_, err := service.InitializeProductBarcodeState(InitializeProductBarcodeStateRequest{
		ProductBarcode:    "ABC-004",
		BranchOperationID: "missing-process",
	})

	require.ErrorIs(t, err, ErrInvalidProductBarcodeState)
}

func TestInitializeProductBarcodeStateRejectsNonFirstRouteStep(t *testing.T) {
	service, database := newProductBarcodeStateTestService(t)
	seedProductBarcodeStateBranchOperation(t, database, "process-a", "首道工序")
	seedProductBarcodeStateBranchOperation(t, database, "process-b", "第二工序")
	routeStepIDs := seedProductBarcodeStateRoute(t, database, "route-a", "process-a", "process-b")

	_, err := service.InitializeProductBarcodeState(InitializeProductBarcodeStateRequest{
		ProductBarcode:    "ABC-005",
		RouteID:           "route-a",
		RouteStepID:       routeStepIDs[1],
		BranchOperationID: "process-b",
	})
	require.ErrorIs(t, err, ErrInvalidProductBarcodeState)

	var stateCount int64
	require.NoError(t, database.Model(&models.ProductBarcodeState{}).Count(&stateCount).Error)
	require.Zero(t, stateCount)
	var eventCount int64
	require.NoError(t, database.Model(&models.ProductBarcodeStateEvent{}).Count(&eventCount).Error)
	require.Zero(t, eventCount)
}

func TestInitializeProductBarcodeStateRejectsDraftRoute(t *testing.T) {
	service, database := newProductBarcodeStateTestService(t)
	seedProductBarcodeStateBranchOperation(t, database, "process-draft-route", "草稿路线工序")
	routeStepIDs := seedProductBarcodeStateRoute(t, database, "route-draft", "process-draft-route")
	require.NoError(t, database.Model(&models.ProductionRoute{}).
		Where("id = ?", "route-draft").
		Update("status", "DRAFT").Error)

	_, err := service.InitializeProductBarcodeState(InitializeProductBarcodeStateRequest{
		ProductBarcode:    "DRAFT-STATE-001",
		RouteID:           "route-draft",
		RouteStepID:       routeStepIDs[0],
		BranchOperationID: "process-draft-route",
	})
	require.ErrorIs(t, err, ErrInvalidProductBarcodeState)

	var stateCount int64
	require.NoError(t, database.Model(&models.ProductBarcodeState{}).
		Where("product_barcode = ?", "DRAFT-STATE-001").
		Count(&stateCount).Error)
	require.Zero(t, stateCount)
}
