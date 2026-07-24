package services

import (
	"testing"
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
		CREATE TABLE positions (
			id TEXT PRIMARY KEY,
			created_at DATETIME,
			updated_at DATETIME,
			deleted_at DATETIME,
			name TEXT,
			code TEXT,
			org_unit_id TEXT,
			production_unit_id TEXT,
			category TEXT,
			level INTEGER,
			is_managerial BOOLEAN,
			status TEXT,
			sort_order INTEGER,
			metadata TEXT
		)
	`).Error)
	require.NoError(t, database.Exec(`
		CREATE TABLE process_step_allowed_positions (
			process_step_id TEXT NOT NULL,
			position_id TEXT NOT NULL,
			PRIMARY KEY (process_step_id, position_id)
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
			estimated_minutes INTEGER,
			transfer_required BOOLEAN,
			description TEXT
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
			operator_position_id TEXT,
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
			operator_position_id TEXT,
			started_at DATETIME,
			completed_at DATETIME,
			notes TEXT
		)
	`).Error)
}

func seedProductionOperationProcess(t *testing.T, database *gorm.DB, processID string, allowedPositionIDs ...string) {
	t.Helper()

	require.NoError(t, database.Create(&models.ProcessStep{
		BaseModel: models.BaseModel{ID: processID},
		Code:      processID,
		Name:      processID,
		IsActive:  true,
	}).Error)
	for _, positionID := range allowedPositionIDs {
		require.NoError(t, database.Exec(
			"INSERT INTO process_step_allowed_positions (process_step_id, position_id) VALUES (?, ?)",
			processID,
			positionID,
		).Error)
	}
}

func seedProductionOperationPosition(t *testing.T, database *gorm.DB, positionID string, status string) {
	t.Helper()

	require.NoError(t, database.Create(&models.Position{
		BaseModel: models.BaseModel{ID: positionID},
		Name:      positionID,
		Status:    status,
	}).Error)
}

func TestRecordProductionOperationExecutionCreatesOperationAndBarcodeState(t *testing.T) {
	service, database := newProductionOperationExecutionTestService(t)
	seedProductionOperationPosition(t, database, "position-a", "active")
	seedProductionOperationProcess(t, database, "process-a", "position-a")

	operation, err := service.RecordProductionOperationExecution(RecordProductionOperationExecutionRequest{
		ProductBarcode:     " abc-001 ",
		ProcessStepID:      "process-a",
		Action:             "start",
		OperatorPositionID: "position-a",
		Operator:           "tester",
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
}

func TestRecordProductionOperationExecutionRejectsDisallowedPosition(t *testing.T) {
	service, database := newProductionOperationExecutionTestService(t)
	seedProductionOperationPosition(t, database, "position-a", "active")
	seedProductionOperationPosition(t, database, "position-b", "active")
	seedProductionOperationProcess(t, database, "process-a", "position-a")

	_, err := service.RecordProductionOperationExecution(RecordProductionOperationExecutionRequest{
		ProductBarcode:     "ABC-002",
		ProcessStepID:      "process-a",
		Action:             ProductionOperationActionStart,
		OperatorPositionID: "position-b",
	})

	require.ErrorIs(t, err, ErrInvalidProductionOperationExecution)
}

func TestRecordProductionOperationExecutionAllowsUnscopedProcessWithoutPosition(t *testing.T) {
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

func TestRecordProductionOperationExecutionRequiresPositionForScopedProcess(t *testing.T) {
	service, database := newProductionOperationExecutionTestService(t)
	seedProductionOperationPosition(t, database, "position-a", "active")
	seedProductionOperationProcess(t, database, "process-a", "position-a")

	_, err := service.RecordProductionOperationExecution(RecordProductionOperationExecutionRequest{
		ProductBarcode: "ABC-004",
		ProcessStepID:  "process-a",
		Action:         ProductionOperationActionStart,
	})

	require.ErrorIs(t, err, ErrInvalidProductionOperationExecution)
}
