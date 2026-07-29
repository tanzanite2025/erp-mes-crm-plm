package services

import (
	"testing"
	"xdfc-server/models"

	"github.com/glebarez/sqlite"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

func newProductionScanCommandTestService(t *testing.T) (*ProductionScanCommandService, *gorm.DB) {
	t.Helper()

	database, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Silent),
	})
	require.NoError(t, err)
	createProductionOperationExecutionTestSchema(t, database)
	createProductionScanCommandTestSchema(t, database)

	return NewProductionScanCommandService(productionOperationExecutionTestTxManager{db: database}), database
}

func createProductionScanCommandTestSchema(t *testing.T, database *gorm.DB) {
	t.Helper()

	require.NoError(t, database.Exec(`
		CREATE TABLE product_barcode_transfer_events (
			id TEXT PRIMARY KEY,
			created_at DATETIME,
			updated_at DATETIME,
			deleted_at DATETIME,
			product_barcode TEXT NOT NULL,
			state_id TEXT,
			operation_id TEXT,
			transfer_type TEXT NOT NULL,
			route_id TEXT,
			from_route_step_id TEXT,
			to_route_step_id TEXT,
			from_process_step_id TEXT,
			to_process_step_id TEXT,
			from_holder_type TEXT,
			from_holder_id TEXT,
			to_holder_type TEXT,
			to_holder_id TEXT,
			operator TEXT NOT NULL,
			payload_snapshot TEXT NOT NULL,
			occurred_at DATETIME
		)
	`).Error)
	require.NoError(t, database.Exec(`
		CREATE TABLE audit_logs (
			id TEXT PRIMARY KEY,
			module TEXT,
			target_id TEXT,
			action TEXT,
			diff TEXT,
			operator TEXT,
			ip TEXT,
			created_at DATETIME
		)
	`).Error)
}

func seedProductionScanRoute(t *testing.T, database *gorm.DB, routeID string, processIDs ...string) []string {
	t.Helper()

	require.NoError(t, database.Create(&models.ProductionRoute{
		BaseModel: models.BaseModel{ID: routeID},
		Code:      routeID,
		Name:      routeID,
		Status:    "PUBLISHED",
		Version:   1,
	}).Error)

	stepIDs := make([]string, 0, len(processIDs))
	for index, processID := range processIDs {
		seedProductionOperationProcess(t, database, processID)
		stepID := routeID + "-step-" + processID
		require.NoError(t, database.Create(&models.ProductionRouteStep{
			BaseModel:     models.BaseModel{ID: stepID},
			RouteID:       routeID,
			Sequence:      index + 1,
			SegmentID:     "segment-" + processID,
			ProcessStepID: processID,
			ExecutionMode: "IN_HOUSE",
			QualityGate:   "NONE",
		}).Error)
		stepIDs = append(stepIDs, stepID)
	}
	return stepIDs
}

func TestExecuteProductionScanCommandStartsFirstRouteStep(t *testing.T) {
	service, database := newProductionScanCommandTestService(t)
	stepIDs := seedProductionScanRoute(t, database, "route-a", "process-a")

	response, err := service.ExecuteProductionScanCommand(ExecuteProductionScanCommandRequest{
		ProductBarcode: " abc-001 ",
		RouteID:        "route-a",
		Action:         "start",
		CommandSource:  "usb",
		Operator:       "tester",
	})

	require.NoError(t, err)
	require.Equal(t, ProductionScanCommandSourceUSB, response.CommandSource)
	require.Equal(t, "ABC-001", response.Operation.ProductBarcode)
	require.Equal(t, stepIDs[0], response.Operation.RouteStepID)
	require.Equal(t, "process-a", response.Operation.ProcessStepID)
	require.Equal(t, ProductBarcodeStateStatusInProgress, response.State.Status)
	require.Equal(t, stepIDs[0], response.Progress.CurrentRouteStepID)
	require.False(t, response.Progress.Advanced)

	var auditCount int64
	require.NoError(t, database.Model(&models.AuditLog{}).Where("module = ?", AuditModuleProductionOperation).Count(&auditCount).Error)
	require.Equal(t, int64(1), auditCount)
}

func TestExecuteProductionScanCommandCompletesAndAdvancesToNextRouteStep(t *testing.T) {
	service, database := newProductionScanCommandTestService(t)
	stepIDs := seedProductionScanRoute(t, database, "route-a", "process-a", "process-b")

	_, err := service.ExecuteProductionScanCommand(ExecuteProductionScanCommandRequest{
		ProductBarcode: "ABC-002",
		RouteID:        "route-a",
		Action:         ProductionOperationActionStart,
		Operator:       "tester",
	})
	require.NoError(t, err)

	response, err := service.ExecuteProductionScanCommand(ExecuteProductionScanCommandRequest{
		ProductBarcode: "ABC-002",
		Action:         ProductionOperationActionComplete,
		Operator:       "tester",
	})

	require.NoError(t, err)
	require.Equal(t, stepIDs[0], response.Operation.RouteStepID)
	require.Equal(t, "process-a", response.Operation.ProcessStepID)
	require.Equal(t, ProductBarcodeStateStatusNotStarted, response.State.Status)
	require.Equal(t, stepIDs[1], response.State.RouteStepID)
	require.Equal(t, "process-b", response.State.CurrentProcessStepID)
	require.True(t, response.Progress.Advanced)
	require.False(t, response.Progress.RouteCompleted)
	require.Equal(t, stepIDs[1], response.Progress.CurrentRouteStepID)
	require.Len(t, response.TransferEvents, 1)
	require.Equal(t, ProductBarcodeTransferTypeRouteAdvance, response.TransferEvents[0].TransferType)
	require.Equal(t, "process-a", response.TransferEvents[0].FromProcessStepID)
	require.Equal(t, "process-b", response.TransferEvents[0].ToProcessStepID)
}

func TestExecuteProductionScanCommandCompletesFinalRouteStep(t *testing.T) {
	service, database := newProductionScanCommandTestService(t)
	stepIDs := seedProductionScanRoute(t, database, "route-a", "process-a")

	_, err := service.ExecuteProductionScanCommand(ExecuteProductionScanCommandRequest{
		ProductBarcode: "ABC-003",
		RouteID:        "route-a",
		Action:         ProductionOperationActionStart,
		Operator:       "tester",
	})
	require.NoError(t, err)

	response, err := service.ExecuteProductionScanCommand(ExecuteProductionScanCommandRequest{
		ProductBarcode: "ABC-003",
		Action:         ProductionOperationActionComplete,
		Operator:       "tester",
	})

	require.NoError(t, err)
	require.Equal(t, ProductBarcodeStateStatusCompleted, response.State.Status)
	require.Equal(t, stepIDs[0], response.State.RouteStepID)
	require.True(t, response.Progress.RouteCompleted)
	require.False(t, response.Progress.Advanced)
	require.Empty(t, response.TransferEvents)
}

func TestExecuteProductionScanCommandRejectsAmbiguousRouteProcess(t *testing.T) {
	service, database := newProductionScanCommandTestService(t)
	stepIDs := seedProductionScanRoute(t, database, "route-a", "process-a")
	require.NoError(t, database.Create(&models.ProductionRouteStep{
		BaseModel:     models.BaseModel{ID: "route-a-step-process-a-duplicate"},
		RouteID:       "route-a",
		Sequence:      2,
		SegmentID:     "segment-process-a-2",
		ProcessStepID: "process-a",
		ExecutionMode: "IN_HOUSE",
		QualityGate:   "NONE",
	}).Error)

	_, err := service.ExecuteProductionScanCommand(ExecuteProductionScanCommandRequest{
		ProductBarcode: "ABC-004",
		RouteID:        "route-a",
		ProcessStepID:  "process-a",
		Action:         ProductionOperationActionStart,
		Operator:       "tester",
	})

	require.ErrorIs(t, err, ErrInvalidProductionScanCommand)

	response, err := service.ExecuteProductionScanCommand(ExecuteProductionScanCommandRequest{
		ProductBarcode: "ABC-004",
		RouteID:        "route-a",
		RouteStepID:    stepIDs[0],
		ProcessStepID:  "process-a",
		Action:         ProductionOperationActionStart,
		Operator:       "tester",
	})
	require.NoError(t, err)
	require.Equal(t, stepIDs[0], response.Operation.RouteStepID)
}

func TestExecuteProductionScanCommandPreservesBarcodeProductIdentity(t *testing.T) {
	service, database := newProductionScanCommandTestService(t)
	stepIDs := seedProductionScanRoute(t, database, "route-a", "process-a", "process-b")

	_, err := NewProductBarcodeStateService(productionOperationExecutionTestTxManager{db: database}).SaveProductBarcodeState(SaveProductBarcodeStateRequest{
		ProductBarcode: "ABC-005",
		ProductID:      "product-1",
		ProductName:    "产品A",
		RouteID:        "route-a",
		RouteStepID:    stepIDs[0],
		ProcessStepID:  "process-a",
		Status:         ProductBarcodeStateStatusInProgress,
		Operator:       "tester",
	})
	require.NoError(t, err)

	response, err := service.ExecuteProductionScanCommand(ExecuteProductionScanCommandRequest{
		ProductBarcode: "ABC-005",
		Action:         ProductionOperationActionComplete,
		Operator:       "tester",
	})

	require.NoError(t, err)
	require.Equal(t, "product-1", response.State.ProductID)
	require.Equal(t, "产品A", response.State.ProductName)
	require.Equal(t, stepIDs[1], response.State.RouteStepID)
}

func TestExecuteProductionScanCommandReworkAdvancesToExplicitTargetRouteStep(t *testing.T) {
	service, database := newProductionScanCommandTestService(t)
	stepIDs := seedProductionScanRoute(t, database, "route-a", "process-a", "process-b")

	_, err := service.ExecuteProductionScanCommand(ExecuteProductionScanCommandRequest{
		ProductBarcode: "ABC-006",
		RouteID:        "route-a",
		Action:         ProductionOperationActionStart,
		Operator:       "tester",
	})
	require.NoError(t, err)
	_, err = service.ExecuteProductionScanCommand(ExecuteProductionScanCommandRequest{
		ProductBarcode: "ABC-006",
		Action:         ProductionOperationActionComplete,
		Operator:       "tester",
	})
	require.NoError(t, err)

	response, err := service.ExecuteProductionScanCommand(ExecuteProductionScanCommandRequest{
		ProductBarcode:      "ABC-006",
		Action:              ProductionOperationActionRework,
		TargetRouteStepID:   stepIDs[0],
		TargetProcessStepID: "process-a",
		Operator:            "tester",
	})

	require.NoError(t, err)
	require.Equal(t, ProductionOperationActionRework, response.Operation.Action)
	require.Equal(t, stepIDs[1], response.Operation.RouteStepID)
	require.Equal(t, ProductBarcodeStateStatusRework, response.State.Status)
	require.Equal(t, stepIDs[0], response.State.RouteStepID)
	require.Equal(t, "process-a", response.State.CurrentProcessStepID)
	require.True(t, response.Progress.Advanced)
	require.Len(t, response.TransferEvents, 1)
	require.Equal(t, ProductBarcodeTransferTypeRouteAdvance, response.TransferEvents[0].TransferType)
	require.Equal(t, "process-b", response.TransferEvents[0].FromProcessStepID)
	require.Equal(t, "process-a", response.TransferEvents[0].ToProcessStepID)
}

func TestExecuteProductionScanCommandRejectsTargetRouteStepOutsideRoute(t *testing.T) {
	service, database := newProductionScanCommandTestService(t)
	seedProductionScanRoute(t, database, "route-a", "process-a")
	targetStepIDs := seedProductionScanRoute(t, database, "route-b", "process-b")

	_, err := service.ExecuteProductionScanCommand(ExecuteProductionScanCommandRequest{
		ProductBarcode: "ABC-007",
		RouteID:        "route-a",
		Action:         ProductionOperationActionStart,
		Operator:       "tester",
	})
	require.NoError(t, err)

	_, err = service.ExecuteProductionScanCommand(ExecuteProductionScanCommandRequest{
		ProductBarcode:    "ABC-007",
		Action:            ProductionOperationActionComplete,
		TargetRouteStepID: targetStepIDs[0],
		Operator:          "tester",
	})

	require.ErrorIs(t, err, ErrInvalidProductionScanCommand)
}
