package services

import (
	"testing"
	"xdfc-server/audit"
	"xdfc-server/models"

	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
)

type productionOutsourceAcceptanceFixture struct {
	database       *gorm.DB
	outsource      *ProductionOutsourcingService
	scan           *ProductionScanCommandService
	stateService   *ProductBarcodeStateService
	order          models.OutsourceOrder
	line           models.OutsourceOrderLine
	routeStepIDs   []string
	productBarcode string
}

func newProductionOutsourceAcceptanceFixture(t *testing.T, orderStatus string) productionOutsourceAcceptanceFixture {
	t.Helper()

	outsource, database := newOutsourceExecutionTestService(t)
	routeStepIDs := []string{"route-1-step-process-a", "route-1-step-process-b"}
	require.NoError(t, database.Model(&models.ProductionRouteStep{}).
		Where("id = ?", routeStepIDs[1]).
		Update("execution_mode", "OUTSOURCE_REQUIRED").Error)

	order, line := seedOutsourceExecutionOrder(t, database, orderStatus)
	require.NoError(t, database.Model(&models.OutsourceOrderLine{}).
		Where("id = ?", line.ID).
		Updates(map[string]any{
			"process_step_id": "process-b",
			"process_code":    "process-b",
			"process_name":    "process-b",
		}).Error)
	require.NoError(t, database.First(&line, "id = ?", line.ID).Error)
	require.NoError(t, database.First(&order, "id = ?", order.ID).Error)

	return productionOutsourceAcceptanceFixture{
		database:       database,
		outsource:      outsource,
		scan:           NewProductionScanCommandService(productionOperationExecutionTestTxManager{db: database}),
		stateService:   NewProductBarcodeStateService(productionOperationExecutionTestTxManager{db: database}),
		order:          order,
		line:           line,
		routeStepIDs:   routeStepIDs,
		productBarcode: "BC-ACCEPTANCE-001",
	}
}

func (f productionOutsourceAcceptanceFixture) seedBarcodeAtFirstRouteStep(t *testing.T) {
	t.Helper()

	_, err := f.stateService.SaveProductBarcodeState(SaveProductBarcodeStateRequest{
		ProductBarcode: f.productBarcode,
		ProductID:      "product-1",
		ProductName:    "产品一",
		RouteID:        "route-1",
		RouteStepID:    f.routeStepIDs[0],
		ProcessStepID:  "process-a",
		Status:         ProductBarcodeStateStatusNotStarted,
		Operator:       "acceptance-fixture",
	})
	require.NoError(t, err)
}

func (f productionOutsourceAcceptanceFixture) release(t *testing.T) {
	t.Helper()

	seedOutsourceNotificationRule(
		t,
		f.database,
		OutsourceOrderStatusReleased,
		OutsourceOrderStatusSent,
		OutsourceOrderStatusReturned,
		businessEventOutsourceStatusInspectionAccepted,
		OutsourceOrderStatusClosed,
	)
	released, err := f.outsource.ReleaseOutsourceOrder(ReleaseOutsourceOrderRequest{
		ID:       f.order.ID,
		ActorID:  "acceptance-user",
		Operator: "acceptance-user",
		IP:       "127.0.0.1",
	})
	require.NoError(t, err)
	require.Equal(t, OutsourceOrderStatusReleased, released.Status)
}

func (f productionOutsourceAcceptanceFixture) startAndCompleteFirstRouteStep(t *testing.T) {
	t.Helper()

	started, err := f.scan.ExecuteProductionScanCommand(ExecuteProductionScanCommandRequest{
		ProductBarcode: f.productBarcode,
		Action:         ProductionOperationActionStart,
		CommandSource:  ProductionScanCommandSourcePDA,
		ActorID:        "acceptance-user",
		Operator:       "acceptance-user",
		IP:             "127.0.0.1",
	})
	require.NoError(t, err)
	require.Equal(t, f.routeStepIDs[0], started.Operation.RouteStepID)
	require.Equal(t, ProductBarcodeStateStatusInProgress, started.State.Status)

	completed, err := f.scan.ExecuteProductionScanCommand(ExecuteProductionScanCommandRequest{
		ProductBarcode: f.productBarcode,
		Action:         ProductionOperationActionComplete,
		CommandSource:  ProductionScanCommandSourceUSB,
		ActorID:        "acceptance-user",
		Operator:       "acceptance-user",
		IP:             "127.0.0.1",
	})
	require.NoError(t, err)
	require.Equal(t, f.routeStepIDs[0], completed.Operation.RouteStepID)
	require.Equal(t, f.routeStepIDs[1], completed.State.RouteStepID)
	require.Equal(t, "process-b", completed.State.CurrentProcessStepID)
	require.True(t, completed.Progress.Advanced)
	require.Len(t, completed.TransferEvents, 1)
	require.Equal(t, ProductBarcodeTransferTypeRouteAdvance, completed.TransferEvents[0].TransferType)
}

func (f productionOutsourceAcceptanceFixture) sendAndReturn(t *testing.T) {
	t.Helper()

	sent, err := f.outsource.SendOutsourceOrderLine(OutsourceTransferRequest{
		OutsourceOrderLineID: f.line.ID,
		ProductBarcode:       f.productBarcode,
		Quantity:             2,
		UOM:                  "PCS",
		SourceCategory:       "FINISHED",
		TargetCategory:       ProductionOutsourceInventoryCategory,
		ActorID:              "acceptance-user",
		Operator:             "acceptance-user",
		IP:                   "127.0.0.1",
	})
	require.NoError(t, err)
	require.Equal(t, OutsourceTransferTypeSend, sent.Transfer.TransferType)
	require.Equal(t, OutsourceOrderStatusSent, sent.Order.Status)

	returned, err := f.outsource.ReturnOutsourceOrderLine(OutsourceTransferRequest{
		OutsourceOrderLineID: f.line.ID,
		ProductBarcode:       f.productBarcode,
		Quantity:             2,
		UOM:                  "PCS",
		SourceCategory:       ProductionOutsourceInventoryCategory,
		TargetCategory:       "FINISHED",
		ActorID:              "acceptance-user",
		Operator:             "acceptance-user",
		IP:                   "127.0.0.1",
	})
	require.NoError(t, err)
	require.Equal(t, OutsourceTransferTypeReturn, returned.Transfer.TransferType)
	require.Equal(t, OutsourceOrderStatusReturned, returned.Order.Status)
}

func TestProductionOutsourceAcceptanceRunsUnifiedBarcodeChain(t *testing.T) {
	fixture := newProductionOutsourceAcceptanceFixture(t, OutsourceOrderStatusDraft)
	fixture.seedBarcodeAtFirstRouteStep(t)
	fixture.release(t)
	fixture.startAndCompleteFirstRouteStep(t)
	fixture.sendAndReturn(t)

	inspection, err := fixture.outsource.InspectOutsourceOrderLine(OutsourceInspectionRequest{
		OutsourceOrderLineID: fixture.line.ID,
		ProductBarcode:       fixture.productBarcode,
		Result:               OutsourceInspectionResultPass,
		InspectedQuantity:    2,
		UOM:                  "PCS",
		ActorID:              "acceptance-user",
		Operator:             "acceptance-user",
		IP:                   "127.0.0.1",
	})
	require.NoError(t, err)
	require.Equal(t, OutsourceInspectionDispositionAccept, inspection.Inspection.Disposition)
	require.Equal(t, ProductionOperationActionComplete, inspection.Scan.Operation.Action)
	require.Equal(t, ProductBarcodeStateStatusCompleted, inspection.Scan.State.Status)
	require.Equal(t, fixture.routeStepIDs[1], inspection.Scan.State.RouteStepID)
	require.True(t, inspection.Scan.Progress.RouteCompleted)
	require.Equal(t, OutsourceOrderStatusClosed, inspection.Order.Status)
	require.Equal(t, float64(2), inspection.Order.Lines[0].AcceptedQuantity)
	require.NotEmpty(t, inspection.Inspection.InspectionTaskID)
	require.Equal(t, inspection.Inspection.InspectionTaskID, inspection.InspectionTask.ID)
	require.Equal(t, QualityInspectionTaskStatusCompleted, inspection.InspectionTask.Status)
	require.Equal(t, OutsourceInspectionResultPass, inspection.InspectionTask.Result)

	var transferCount int64
	require.NoError(t, fixture.database.Model(&models.OutsourceTransfer{}).
		Where("outsource_order_line_id = ?", fixture.line.ID).
		Count(&transferCount).Error)
	require.Equal(t, int64(2), transferCount)

	var inspectionCount int64
	require.NoError(t, fixture.database.Model(&models.OutsourceInspection{}).
		Where("outsource_order_line_id = ?", fixture.line.ID).
		Count(&inspectionCount).Error)
	require.Equal(t, int64(1), inspectionCount)

	var operationCount int64
	require.NoError(t, fixture.database.Model(&models.ProductionOperationExecution{}).
		Where("product_barcode = ?", fixture.productBarcode).
		Count(&operationCount).Error)
	require.Equal(t, int64(3), operationCount)

	var transferEventCount int64
	require.NoError(t, fixture.database.Model(&models.ProductBarcodeTransferEvent{}).
		Where("product_barcode = ?", fixture.productBarcode).
		Count(&transferEventCount).Error)
	require.Equal(t, int64(3), transferEventCount)

	var finishedInventory models.Inventory
	require.NoError(t, fixture.database.
		Where("material_id = ? AND category_code = ?", "material-1", "FINISHED").
		First(&finishedInventory).Error)
	require.Equal(t, float64(100), finishedInventory.Quantity)

	var outsourceInventory models.Inventory
	require.NoError(t, fixture.database.
		Where("material_id = ? AND category_code = ?", "material-1", ProductionOutsourceInventoryCategory).
		First(&outsourceInventory).Error)
	require.Equal(t, float64(0), outsourceInventory.Quantity)

	var inventoryLedgerCount int64
	require.NoError(t, fixture.database.Model(&models.InventoryLedgerEntry{}).
		Where("source_type = ? AND source_id = ?", DedicatedInventorySourceProductionOutsource, fixture.order.ID).
		Count(&inventoryLedgerCount).Error)
	require.Equal(t, int64(4), inventoryLedgerCount)

	requireOutsourceRuleExecutionLog(t, fixture.database, OutsourceOrderStatusReleased, "notify", "success")
	requireOutsourceRuleExecutionLog(t, fixture.database, OutsourceOrderStatusSent, "notify", "success")
	requireOutsourceRuleExecutionLog(t, fixture.database, OutsourceOrderStatusReturned, "notify", "success")
	requireOutsourceRuleExecutionLog(t, fixture.database, businessEventOutsourceStatusInspectionAccepted, "notify", "success")
	requireOutsourceRuleExecutionLog(t, fixture.database, OutsourceOrderStatusClosed, "notify", "success")
	requireOutsourceAuditLog(t, fixture.database, fixture.order.ID, audit.AuditActionStatus, map[string]string{
		"action":         "OUTSOURCE_INSPECT",
		"productBarcode": fixture.productBarcode,
		"status":         OutsourceOrderStatusClosed,
	})
}

func TestProductionOutsourceAcceptanceRejectsDuplicateBarcodeSend(t *testing.T) {
	fixture := newProductionOutsourceAcceptanceFixture(t, OutsourceOrderStatusReleased)
	fixture.seedBarcodeAtFirstRouteStep(t)
	fixture.startAndCompleteFirstRouteStep(t)

	_, err := fixture.outsource.SendOutsourceOrderLine(OutsourceTransferRequest{
		OutsourceOrderLineID: fixture.line.ID,
		ProductBarcode:       fixture.productBarcode,
		Quantity:             1,
		UOM:                  "PCS",
		SourceCategory:       "FINISHED",
		TargetCategory:       ProductionOutsourceInventoryCategory,
		Operator:             "acceptance-user",
	})
	require.NoError(t, err)

	_, err = fixture.outsource.SendOutsourceOrderLine(OutsourceTransferRequest{
		OutsourceOrderLineID: fixture.line.ID,
		ProductBarcode:       fixture.productBarcode,
		Quantity:             1,
		UOM:                  "PCS",
		SourceCategory:       "FINISHED",
		TargetCategory:       ProductionOutsourceInventoryCategory,
		Operator:             "acceptance-user",
	})
	require.ErrorIs(t, err, ErrInvalidOutsourceOrder)

	var transferCount int64
	require.NoError(t, fixture.database.Model(&models.OutsourceTransfer{}).
		Where("outsource_order_line_id = ?", fixture.line.ID).
		Count(&transferCount).Error)
	require.Equal(t, int64(1), transferCount)
}

func TestProductionOutsourceAcceptanceRejectsCanceledOrder(t *testing.T) {
	fixture := newProductionOutsourceAcceptanceFixture(t, OutsourceOrderStatusCanceled)
	fixture.seedBarcodeAtFirstRouteStep(t)
	fixture.startAndCompleteFirstRouteStep(t)

	_, err := fixture.outsource.SendOutsourceOrderLine(OutsourceTransferRequest{
		OutsourceOrderLineID: fixture.line.ID,
		ProductBarcode:       fixture.productBarcode,
		Quantity:             1,
		UOM:                  "PCS",
		SourceCategory:       "FINISHED",
		TargetCategory:       ProductionOutsourceInventoryCategory,
		Operator:             "acceptance-user",
	})
	require.ErrorIs(t, err, ErrInvalidOutsourceOrder)

	var transferCount int64
	require.NoError(t, fixture.database.Model(&models.OutsourceTransfer{}).
		Where("outsource_order_line_id = ?", fixture.line.ID).
		Count(&transferCount).Error)
	require.Zero(t, transferCount)
}

func TestProductionOutsourceAcceptanceRejectsProductProcessMismatch(t *testing.T) {
	fixture := newProductionOutsourceAcceptanceFixture(t, OutsourceOrderStatusReleased)
	fixture.seedBarcodeAtFirstRouteStep(t)
	fixture.startAndCompleteFirstRouteStep(t)
	require.NoError(t, fixture.database.Model(&models.ProductBarcodeState{}).
		Where("product_barcode = ?", fixture.productBarcode).
		Update("current_process_step_id", "process-a").Error)

	_, err := fixture.outsource.SendOutsourceOrderLine(OutsourceTransferRequest{
		OutsourceOrderLineID: fixture.line.ID,
		ProductBarcode:       fixture.productBarcode,
		Quantity:             1,
		UOM:                  "PCS",
		SourceCategory:       "FINISHED",
		TargetCategory:       ProductionOutsourceInventoryCategory,
		Operator:             "acceptance-user",
	})
	require.ErrorIs(t, err, ErrInvalidOutsourceOrder)

	var transferCount int64
	require.NoError(t, fixture.database.Model(&models.OutsourceTransfer{}).
		Where("outsource_order_line_id = ?", fixture.line.ID).
		Count(&transferCount).Error)
	require.Zero(t, transferCount)
}
