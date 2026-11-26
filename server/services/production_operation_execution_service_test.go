package services

import (
	"context"
	"strings"
	"testing"
	"time"
	"xdfc-server/db"
	"xdfc-server/models"

	"github.com/glebarez/sqlite"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

type productionOperationExecutionTestTxManager struct {
	db *gorm.DB
}

const productionOperationExecutionTestWorkLocationID = "production-test-work-location"

type productionOperationExecutionTestClient struct {
	service  *ProductionOperationExecutionService
	database *gorm.DB
}

func (client *productionOperationExecutionTestClient) RecordProductionOperationExecution(request RecordProductionOperationExecutionRequest) (ProductionOperationExecutionResponse, error) {
	return client.RecordProductionOperationExecutionWithContext(context.Background(), request)
}

func (client *productionOperationExecutionTestClient) RecordProductionOperationExecutionWithContext(ctx context.Context, request RecordProductionOperationExecutionRequest) (ProductionOperationExecutionResponse, error) {
	request = completeProductionOperationExecutionTestRequest(client.database, request)
	return client.service.RecordProductionOperationExecutionWithContext(ctx, request)
}

func (m productionOperationExecutionTestTxManager) DB() *gorm.DB {
	return m.db
}

func (m productionOperationExecutionTestTxManager) WithinTransaction(fn func(tx *gorm.DB) error) error {
	return m.db.Transaction(fn)
}

func newProductionOperationExecutionTestService(t *testing.T) (*productionOperationExecutionTestClient, *gorm.DB) {
	t.Helper()

	database, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Silent),
	})
	require.NoError(t, err)
	createProductionOperationExecutionTestSchema(t, database)

	return &productionOperationExecutionTestClient{
		service:  NewProductionOperationExecutionService(productionOperationExecutionTestTxManager{db: database}),
		database: database,
	}, database
}

func createProductionOperationExecutionTestSchema(t *testing.T, database *gorm.DB) {
	t.Helper()

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
			process_step_id TEXT,
			execution_mode TEXT,
			quality_gate TEXT,
			quality_routing TEXT,
			estimated_minutes INTEGER,
			transfer_required BOOLEAN,
			description TEXT
		)
	`).Error)
	require.NoError(t, database.Exec(`
		CREATE TABLE piecework_rates (
			id TEXT PRIMARY KEY,
			created_at DATETIME,
			updated_at DATETIME,
			deleted_at DATETIME,
			product_id TEXT NOT NULL,
			process_step_id TEXT,
			route_step_id TEXT,
			process_code TEXT,
			process_name TEXT,
			unit TEXT,
			unit_price REAL,
			currency TEXT,
			effective_at DATETIME,
			effective_from DATETIME,
			effective_to DATETIME,
			status TEXT,
			remarks TEXT,
			version INTEGER,
			operator TEXT
		)
	`).Error)
	require.NoError(t, database.Exec(`
		CREATE TABLE piecework_records (
			id TEXT PRIMARY KEY,
			created_at DATETIME,
			updated_at DATETIME,
			deleted_at DATETIME,
			work_date DATETIME NOT NULL,
			employee_id TEXT,
			team_id TEXT,
			product_id TEXT,
			product_name TEXT,
			route_id TEXT,
			route_step_id TEXT,
			process_step_id TEXT,
			process_code TEXT,
			process_name TEXT,
			rate_id TEXT,
			rate_version INTEGER,
			quantity REAL,
			unit TEXT,
			currency TEXT,
			unit_price REAL,
			total_amount REAL,
			source_execution_id TEXT,
			is_settled BOOLEAN
		)
	`).Error)
	require.NoError(t, database.Exec(`
		CREATE TABLE production_execution_lots (
			id TEXT PRIMARY KEY,
			created_at DATETIME,
			updated_at DATETIME,
			deleted_at DATETIME,
			product_barcode TEXT NOT NULL UNIQUE,
			product_id TEXT,
			product_name TEXT,
			plan_id TEXT,
			task_id TEXT,
			batch_no TEXT,
			quantity REAL,
			status TEXT,
			notes TEXT,
			operator TEXT
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
			current_process_step_id TEXT,
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
			from_process_step_id TEXT,
			to_process_step_id TEXT,
			route_id TEXT,
			route_step_id TEXT,
			operator TEXT,
			payload_snapshot TEXT,
			occurred_at DATETIME
		)
	`).Error)
	require.NoError(t, database.Exec(`
		CREATE TABLE production_operation_executions (
			id TEXT PRIMARY KEY,
			created_at DATETIME,
			updated_at DATETIME,
			deleted_at DATETIME,
			product_barcode TEXT NOT NULL,
			state_id TEXT,
			execution_lot_id TEXT,
			route_id TEXT,
			route_step_id TEXT,
			process_step_id TEXT NOT NULL,
			production_work_location_id TEXT NOT NULL,
			execution_mode TEXT,
			partner_id TEXT,
			action TEXT,
			status TEXT,
			result TEXT,
			operator TEXT,
			started_at DATETIME,
			completed_at DATETIME,
			notes TEXT
		)
	`).Error)
	require.NoError(t, database.Exec(`
		CREATE TABLE production_mbom_branch_process_associations (
			id TEXT PRIMARY KEY,
			created_at DATETIME,
			updated_at DATETIME,
			deleted_at DATETIME,
			product_id TEXT NOT NULL,
			bom_owner_type TEXT NOT NULL,
			bom_owner_customer_id TEXT NOT NULL DEFAULT '',
			bom_version_level TEXT NOT NULL DEFAULT '',
			process_step_id TEXT NOT NULL,
			sort_order INTEGER NOT NULL DEFAULT 0
		)
	`).Error)
	require.NoError(t, database.Exec(`
		CREATE TABLE production_work_locations (
			id TEXT PRIMARY KEY,
			created_at DATETIME,
			updated_at DATETIME,
			deleted_at DATETIME,
			code TEXT NOT NULL UNIQUE,
			name TEXT NOT NULL,
			description TEXT,
			is_active BOOLEAN NOT NULL DEFAULT true,
			version INTEGER NOT NULL DEFAULT 1
		)
	`).Error)
	migrateProductionRouteRevisionTestSchema(t, database, false)
	require.NoError(t, database.Create(&models.ProductionWorkLocation{
		BaseModel: models.BaseModel{ID: productionOperationExecutionTestWorkLocationID},
		Code:      "TEST-PRODUCTION-WORK-LOCATION",
		Name:      "Production test location",
		IsActive:  true,
		Version:   1,
	}).Error)
	require.NoError(t, db.EnsureProductionExecutionRequestReplayIntegrity(database))
	require.NoError(t, db.EnsureIndependentPieceworkPayrollStorageContract(database))
	seedPieceworkAttributionTestIdentities(t, database)
	require.NoError(t, database.Create(&models.PieceworkPayItem{BaseModel: models.BaseModel{ID: pieceworkTestPayItemID}, Code: "PAY-001", Name: "Independent payroll item", Unit: "PCS", Status: "active", Version: 1}).Error)
}

func seedProductionOperationBranch(t *testing.T, database *gorm.DB, processStepID string) {
	t.Helper()

	require.NoError(t, database.Create(&models.ProcessStep{
		BaseModel: models.BaseModel{ID: processStepID},
		Code:      processStepID,
		Name:      processStepID,
		IsActive:  true,
	}).Error)
}

func completeProductionOperationExecutionTestRequest(database *gorm.DB, request RecordProductionOperationExecutionRequest) RecordProductionOperationExecutionRequest {
	if strings.TrimSpace(request.ProductionWorkLocationID) == "" {
		request.ProductionWorkLocationID = productionOperationExecutionTestWorkLocationID
	}
	processStepID := strings.TrimSpace(request.ProcessStepID)
	if processStepID == "" {
		return request
	}
	if strings.TrimSpace(request.RouteID) == "" {
		request.RouteID = "production-test-route-" + processStepID
	}
	if strings.TrimSpace(request.RouteStepID) == "" {
		request.RouteStepID = "production-test-route-step-" + processStepID
	}
	var route models.ProductionRoute
	if err := database.First(&route, "id = ?", request.RouteID).Error; err != nil {
		var processStep models.ProcessStep
		if database.First(&processStep, "id = ?", processStepID).Error == nil {
			var err error
			route, err = saveProductionRouteRevisionTestRecord(database, models.ProductionRoute{
				BaseModel:       models.BaseModel{ID: request.RouteID},
				Code:            "TEST-" + request.RouteID,
				Name:            "Production test route",
				ProductID:       "production-operation-test-product",
				BOMOwnerType:    "INTERNAL",
				BOMVersionLevel: "standard",
				Version:         1,
				Status:          "PUBLISHED",
			})
			if err != nil {
				return request
			}
		}
	}
	var routeStep models.ProductionRouteStep
	if database.First(&routeStep, "id = ?", request.RouteStepID).Error != nil {
		_ = database.Create(&models.ProductionRouteStep{
			BaseModel:     models.BaseModel{ID: request.RouteStepID},
			RouteID:       request.RouteID,
			Sequence:      1,
			ProcessStepID: processStepID,
			ExecutionMode: ProductionOperationExecutionModeInHouse,
			QualityGate:   "NONE",
		}).Error
	}
	return request
}

func TestRecordProductionOperationExecutionCreatesOperationAndBarcodeState(t *testing.T) {
	service, database := newProductionOperationExecutionTestService(t)
	seedProductionOperationBranch(t, database, "process-a")

	operation, err := service.RecordProductionOperationExecution(RecordProductionOperationExecutionRequest{
		IdempotencyKey: "operation-start-basic",
		ProductBarcode: " abc-001 ",
		ProcessStepID:  "process-a",
		Action:         "start",
		Operator:       "tester",
	})

	require.NoError(t, err)
	require.Equal(t, "ABC-001", operation.ProductBarcode)
	require.Equal(t, ProductBarcodeStateStatusInProgress, operation.Status)
	require.NotEmpty(t, operation.StateID)
	require.NotEmpty(t, operation.StartedAt)

	state, events, err := loadProductBarcodeStateWithEvents(database, "ABC-001")
	require.NoError(t, err)
	require.Equal(t, "process-a", state.CurrentProcessStepID)
	require.Equal(t, ProductBarcodeStateStatusInProgress, state.Status)
	require.Len(t, events, 1)
	require.Equal(t, ProductBarcodeStateEventStart, events[0].EventType)
	require.Equal(t, operation.ID, events[0].OperationID)

	var pieceworkRecordCount int64
	require.NoError(t, database.Table("piecework_records").Count(&pieceworkRecordCount).Error)
	require.Zero(t, pieceworkRecordCount)
}

func TestRecordProductionOperationExecutionRejectsDraftRoute(t *testing.T) {
	service, database := newProductionOperationExecutionTestService(t)
	seedProductionOperationBranch(t, database, "process-draft-route")
	request := completeProductionOperationExecutionTestRequest(database, RecordProductionOperationExecutionRequest{
		IdempotencyKey: "operation-draft-route-denied",
		ProductBarcode: "DRAFT-OPERATION-001",
		ProcessStepID:  "process-draft-route",
		Action:         ProductionOperationActionStart,
		Operator:       "tester",
	})
	require.NoError(t, database.Model(&models.ProductionRoute{}).
		Where("id = ?", request.RouteID).
		Update("status", "DRAFT").Error)

	_, err := service.RecordProductionOperationExecution(request)
	require.ErrorIs(t, err, ErrInvalidProductionOperationExecution)

	var executionCount int64
	require.NoError(t, database.Model(&models.ProductionOperationExecution{}).
		Where("product_barcode = ?", "DRAFT-OPERATION-001").
		Count(&executionCount).Error)
	require.Zero(t, executionCount)
}

func TestHeldProductBarcodeCanResumeCurrentProcess(t *testing.T) {
	service, database := newProductionOperationExecutionTestService(t)
	seedProductionOperationBranch(t, database, "process-held-resume")
	request := RecordProductionOperationExecutionRequest{
		IdempotencyKey: "held-resume-start",
		ProductBarcode: "HELD-RESUME-001",
		ProcessStepID:  "process-held-resume",
		Action:         ProductionOperationActionStart,
	}

	started, err := service.RecordProductionOperationExecution(request)
	require.NoError(t, err)

	request.IdempotencyKey = "held-resume-hold"
	request.Action = ProductionOperationActionHold
	held, err := service.RecordProductionOperationExecution(request)
	require.NoError(t, err)

	request.IdempotencyKey = "held-resume-restart"
	request.Action = ProductionOperationActionStart
	resumed, err := service.RecordProductionOperationExecution(request)
	require.NoError(t, err)
	require.Equal(t, ProductBarcodeStateStatusInProgress, resumed.Status)

	state, events, err := loadProductBarcodeStateWithEvents(database, request.ProductBarcode)
	require.NoError(t, err)
	require.Equal(t, ProductBarcodeStateStatusInProgress, state.Status)
	require.Len(t, events, 3)
	eventTypesByOperationID := make(map[string]string, len(events))
	for _, event := range events {
		eventTypesByOperationID[event.OperationID] = event.EventType
	}
	require.Equal(t, ProductBarcodeStateEventStart, eventTypesByOperationID[started.ID])
	require.Equal(t, ProductBarcodeStateEventHold, eventTypesByOperationID[held.ID])
	require.Equal(t, ProductBarcodeStateEventStart, eventTypesByOperationID[resumed.ID])
	assertProductionExecutionReplayFactCounts(t, database, 3, 3, 0)
}

func TestRecordProductionOperationExecutionRequiresWorkLocation(t *testing.T) {
	service, database := newProductionOperationExecutionTestService(t)
	seedProductionOperationBranch(t, database, "process-location-required")
	request := completeProductionOperationExecutionTestRequest(database, RecordProductionOperationExecutionRequest{
		IdempotencyKey: "operation-without-work-location",
		ProductBarcode: "ABC-003",
		ProcessStepID:  "process-location-required",
		Action:         ProductionOperationActionComplete,
	})
	request.ProductionWorkLocationID = ""

	_, err := service.service.RecordProductionOperationExecution(request)
	require.ErrorIs(t, err, ErrInvalidProductionOperationExecution)

	var executionCount int64
	require.NoError(t, database.Model(&models.ProductionOperationExecution{}).
		Where("product_barcode = ?", request.ProductBarcode).
		Count(&executionCount).Error)
	require.Zero(t, executionCount)
}

func TestProductionCompletionPreservesProductStateWithoutCreatingWageRecords(t *testing.T) {
	service, database := newProductionOperationExecutionTestService(t)
	seedProductionOperationBranch(t, database, "process-a")
	createProductionRouteRevisionTestRecord(t, database, models.ProductionRoute{
		BaseModel:    models.BaseModel{ID: "route-a"},
		Code:         "ROUTE-A",
		Name:         "Route A",
		ProductID:    "product-a",
		BOMOwnerType: "INTERNAL",
		Status:       "PUBLISHED",
	})
	require.NoError(t, database.Create(&models.ProductionRouteStep{
		BaseModel:     models.BaseModel{ID: "route-step-a"},
		RouteID:       "route-a",
		Sequence:      10,
		ProcessStepID: "process-a",
	}).Error)
	require.NoError(t, database.Create(&models.ProductionExecutionLot{
		BaseModel:      models.BaseModel{ID: "lot-a"},
		ProductBarcode: "ABC-004",
		ProductID:      "product-a",
		ProductName:    "Product A",
		Quantity:       3,
		Status:         ProductionExecutionLotStatusActive,
	}).Error)
	effectiveFrom := time.Now().UTC().Add(-time.Hour)
	require.NoError(t, database.Create(&models.PieceworkRate{
		BaseModel:     models.BaseModel{ID: "rate-a"},
		PayItemID:     pieceworkTestPayItemID,
		PayItemCode:   "PAY-001",
		PayItemName:   "Independent payroll item",
		Unit:          "PCS",
		UnitPrice:     2,
		Currency:      "CNY",
		EffectiveFrom: &effectiveFrom,
		Status:        "active",
		Version:       1,
	}).Error)

	operation, err := service.RecordProductionOperationExecutionWithContext(context.Background(), RecordProductionOperationExecutionRequest{
		IdempotencyKey: "operation-complete-product-state",
		ProductBarcode: "ABC-004",
		ExecutionLotID: "lot-a",
		RouteID:        "route-a",
		RouteStepID:    "route-step-a",
		ProcessStepID:  "process-a",
		Action:         ProductionOperationActionComplete,
		Operator:       "tester",
	})

	require.NoError(t, err)
	require.Equal(t, ProductBarcodeStateStatusCompleted, operation.Status)

	var wageRecordCount int64
	require.NoError(t, database.Table("piecework_records").Count(&wageRecordCount).Error)
	require.Zero(t, wageRecordCount)

	state, _, err := loadProductBarcodeStateWithEvents(database, "ABC-004")
	require.NoError(t, err)
	require.Equal(t, "product-a", state.ProductID)
	require.Equal(t, "Product A", state.ProductName)
}
