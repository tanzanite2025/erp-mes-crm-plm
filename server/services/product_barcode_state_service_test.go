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
}

func seedProductBarcodeStateProcess(t *testing.T, database *gorm.DB, id string, code string, name string) {
	t.Helper()

	require.NoError(t, database.Create(&models.ProcessStep{
		BaseModel: models.BaseModel{ID: id},
		Code:      code,
		Name:      name,
		IsActive:  true,
	}).Error)
}

func TestSaveProductBarcodeStateCreatesStandaloneStateAndEvent(t *testing.T) {
	service, database := newProductBarcodeStateTestService(t)
	seedProductBarcodeStateProcess(t, database, "process-a", "PROC-A", "首道工序")

	state, err := service.SaveProductBarcodeState(SaveProductBarcodeStateRequest{
		ProductBarcode: " abc-001 ",
		ProductID:      "product-1",
		ProductName:    "产品A",
		ProcessStepID:  "process-a",
		Status:         "in_progress",
		Operator:       "tester",
	})

	require.NoError(t, err)
	require.Equal(t, "ABC-001", state.ProductBarcode)
	require.Equal(t, ProductBarcodeStateStatusInProgress, state.Status)
	require.Equal(t, "process-a", state.CurrentProcessStepID)
	require.NotNil(t, state.CurrentProcessStep)
	require.Equal(t, "首道工序", state.CurrentProcessStep.Name)
	require.Len(t, state.Events, 1)
	require.Equal(t, ProductBarcodeStateEventInitialized, state.Events[0].EventType)
	require.NotEmpty(t, state.LastEventID)
}

func TestSaveProductBarcodeStateAppendsTransferEvent(t *testing.T) {
	service, database := newProductBarcodeStateTestService(t)
	seedProductBarcodeStateProcess(t, database, "process-a", "PROC-A", "首道工序")
	seedProductBarcodeStateProcess(t, database, "process-b", "PROC-B", "第二工序")

	_, err := service.SaveProductBarcodeState(SaveProductBarcodeStateRequest{
		ProductBarcode: "ABC-002",
		ProcessStepID:  "process-a",
		Status:         ProductBarcodeStateStatusInProgress,
		Operator:       "tester",
	})
	require.NoError(t, err)

	state, err := service.SaveProductBarcodeState(SaveProductBarcodeStateRequest{
		ProductBarcode: "ABC-002",
		ProcessStepID:  "process-b",
		Status:         ProductBarcodeStateStatusInProgress,
		Operator:       "tester",
	})

	require.NoError(t, err)
	require.Equal(t, "process-b", state.CurrentProcessStepID)
	require.Len(t, state.Events, 2)

	var transferEvent *ProductBarcodeStateEventResponse
	for index := range state.Events {
		if state.Events[index].EventType == ProductBarcodeStateEventTransfer {
			transferEvent = &state.Events[index]
			break
		}
	}
	require.NotNil(t, transferEvent)
	require.Equal(t, "process-a", transferEvent.FromProcessStepID)
	require.Equal(t, "process-b", transferEvent.ToProcessStepID)
}

func TestSaveProductBarcodeStateRejectsExecutionWithoutProcess(t *testing.T) {
	service, _ := newProductBarcodeStateTestService(t)

	_, err := service.SaveProductBarcodeState(SaveProductBarcodeStateRequest{
		ProductBarcode: "ABC-003",
		Status:         ProductBarcodeStateStatusInProgress,
	})

	require.ErrorIs(t, err, ErrInvalidProductBarcodeState)
}

func TestSaveProductBarcodeStateRejectsMissingProcess(t *testing.T) {
	service, _ := newProductBarcodeStateTestService(t)

	_, err := service.SaveProductBarcodeState(SaveProductBarcodeStateRequest{
		ProductBarcode: "ABC-004",
		ProcessStepID:  "missing-process",
		Status:         ProductBarcodeStateStatusInProgress,
	})

	require.ErrorIs(t, err, ErrInvalidProductBarcodeState)
}
