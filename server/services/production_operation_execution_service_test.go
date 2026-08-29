package services

import (
	"context"
	"testing"
	"time"
	"xdfc-server/models"

	"github.com/glebarez/sqlite"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

type productionOperationExecutionTestTxManager struct {
	db *gorm.DB
}

func (m productionOperationExecutionTestTxManager) DB() *gorm.DB {
	return m.db
}

func (m productionOperationExecutionTestTxManager) WithinTransaction(fn func(tx *gorm.DB) error) error {
	return m.db.Transaction(fn)
}

func newProductionOperationExecutionTestService(t *testing.T) (*ProductionOperationExecutionService, *gorm.DB) {
	t.Helper()

	database, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Silent),
	})
	require.NoError(t, err)
	createProductionOperationExecutionTestSchema(t, database)

	return NewProductionOperationExecutionService(productionOperationExecutionTestTxManager{db: database}), database
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
			product_name TEXT,
			product_template_id TEXT,
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
			segment_id TEXT,
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
}

func seedProductionOperationProcess(t *testing.T, database *gorm.DB, processID string) {
	t.Helper()

	require.NoError(t, database.Create(&models.ProcessStep{
		BaseModel: models.BaseModel{ID: processID},
		Code:      processID,
		Name:      processID,
		IsActive:  true,
	}).Error)
}

func TestRecordProductionOperationExecutionCreatesOperationAndBarcodeState(t *testing.T) {
	service, database := newProductionOperationExecutionTestService(t)
	seedProductionOperationProcess(t, database, "process-a")

	operation, err := service.RecordProductionOperationExecution(RecordProductionOperationExecutionRequest{
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

	var pieceworkRecordCount int64
	require.NoError(t, database.Model(&models.PieceworkRecord{}).Count(&pieceworkRecordCount).Error)
	require.Zero(t, pieceworkRecordCount)
}

func TestRecordProductionOperationExecutionDoesNotRequirePosition(t *testing.T) {
	service, database := newProductionOperationExecutionTestService(t)
	seedProductionOperationProcess(t, database, "process-a")

	operation, err := service.RecordProductionOperationExecution(RecordProductionOperationExecutionRequest{
		ProductBarcode: "ABC-003",
		ProcessStepID:  "process-a",
		Action:         ProductionOperationActionComplete,
	})

	require.NoError(t, err)
	require.Equal(t, ProductBarcodeStateStatusCompleted, operation.Status)
	require.NotEmpty(t, operation.CompletedAt)
}

func TestRecordProductionOperationExecutionCreatesPieceworkRecordOnCompletion(t *testing.T) {
	service, database := newProductionOperationExecutionTestService(t)
	seedProductionOperationProcess(t, database, "process-a")
	require.NoError(t, database.Create(&models.ProductionRoute{
		BaseModel: models.BaseModel{ID: "route-a"},
		Code:      "ROUTE-A",
		Name:      "Route A",
		ProductID: "product-a",
		Status:    "PUBLISHED",
	}).Error)
	require.NoError(t, database.Create(&models.ProductionRouteStep{
		BaseModel:     models.BaseModel{ID: "route-step-a"},
		RouteID:       "route-a",
		Sequence:      10,
		SegmentID:     "segment-a",
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
	processStepID := "process-a"
	routeStepID := "route-step-a"
	require.NoError(t, database.Create(&models.PieceworkRate{
		BaseModel:     models.BaseModel{ID: "rate-a"},
		ProductID:     "product-a",
		ProcessStepID: &processStepID,
		RouteStepID:   &routeStepID,
		ProcessCode:   "process-a",
		ProcessName:   "process-a",
		Unit:          "PCS",
		UnitPrice:     2,
		Currency:      "CNY",
		EffectiveFrom: &effectiveFrom,
		Status:        "active",
		Version:       1,
	}).Error)

	operation, err := service.RecordProductionOperationExecutionWithContext(context.Background(), RecordProductionOperationExecutionRequest{
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

	var record models.PieceworkRecord
	require.NoError(t, database.First(&record, "source_execution_id = ?", operation.ID).Error)
	require.Equal(t, "product-a", record.ProductID)
	require.Equal(t, "Product A", record.ProductName)
	require.Equal(t, "route-a", record.RouteID)
	require.Equal(t, "route-step-a", record.RouteStepID)
	require.Equal(t, "process-a", record.ProcessStepID)
	require.Equal(t, "rate-a", record.RateID)
	require.Equal(t, int64(1), record.RateVersion)
	require.Equal(t, 3.0, record.Quantity)
	require.Equal(t, 2.0, record.UnitPrice)
	require.Equal(t, 6.0, record.TotalAmount)

	state, _, err := loadProductBarcodeStateWithEvents(database, "ABC-004")
	require.NoError(t, err)
	require.Equal(t, "product-a", state.ProductID)
	require.Equal(t, "Product A", state.ProductName)
}
