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
	scan           *productionScanCommandTestClient
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
	require.NoError(t, database.First(&order, "id = ?", order.ID).Error)

	return productionOutsourceAcceptanceFixture{
		database:       database,
		outsource:      outsource,
		scan:           &productionScanCommandTestClient{service: NewProductionScanCommandService(productionOperationExecutionTestTxManager{db: database})},
		stateService:   NewProductBarcodeStateService(productionOperationExecutionTestTxManager{db: database}),
		order:          order,
		line:           line,
		routeStepIDs:   routeStepIDs,
		productBarcode: "BC-ACCEPTANCE-001",
	}
}

func (f productionOutsourceAcceptanceFixture) seedBarcodeAtFirstRouteStep(t *testing.T) {
	f.seedBarcodeAtFirstRouteStepForBarcode(t, f.productBarcode)
}

func (f productionOutsourceAcceptanceFixture) seedBarcodeAtFirstRouteStepForBarcode(t *testing.T, barcode string) {
	t.Helper()
	var plan models.ProductionPlan
	require.NoError(t, f.database.First(&plan, "id = ?", "plan-route-1").Error)
	require.NoError(t, f.database.Create(&models.ProductionExecutionLot{
		BaseModel:      models.BaseModel{ID: "lot-" + barcode},
		ProductBarcode: barcode,
		ProductID:      plan.ProductID,
		ProductName:    plan.ProductName,
		PlanID:         plan.ID,
		Quantity:       1,
		Status:         ProductionExecutionLotStatusActive,
	}).Error)

	_, err := f.stateService.InitializeProductBarcodeState(InitializeProductBarcodeStateRequest{
		ProductBarcode: barcode,
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
	f.startAndCompleteFirstRouteStepForBarcode(t, f.productBarcode)
}

func (f productionOutsourceAcceptanceFixture) startAndCompleteFirstRouteStepForBarcode(t *testing.T, barcode string) {
	t.Helper()

	started, err := f.scan.ExecuteProductionScanCommand(ExecuteProductionScanCommandRequest{
		IdempotencyKey: "outsource-acceptance-first-step-start:" + barcode,
		ProductBarcode: barcode,
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
		IdempotencyKey: "outsource-acceptance-first-step-complete:" + barcode,
		ProductBarcode: barcode,
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

	sent := f.sendBarcode(t, f.productBarcode)
	require.Equal(t, OutsourceOrderStatusSent, sent.Order.Status)
	returned := f.returnBarcode(t, f.productBarcode)
	require.Equal(t, OutsourceOrderStatusReturned, returned.Order.Status)
}

func (f productionOutsourceAcceptanceFixture) sendBarcode(t *testing.T, barcode string) OutsourceTransferActionResponse {
	t.Helper()
	sent, err := f.outsource.SendOutsourceOrderLine(OutsourceTransferRequest{
		OutsourceOrderLineID: f.line.ID,
		ProductBarcode:       barcode,
		Quantity:             1,
		UOM:                  "PCS",
		SourceCategory:       "FINISHED",
		TargetCategory:       ProductionOutsourceInventoryCategory,
		ActorID:              "acceptance-user",
		Operator:             "acceptance-user",
		IP:                   "127.0.0.1",
	})
	require.NoError(t, err)
	require.Equal(t, OutsourceTransferTypeSend, sent.Transfer.TransferType)
	require.Equal(t, float64(1), sent.Transfer.Quantity)
	require.Equal(t, "route-1", sent.Transfer.RouteID)
	return sent
}

func (f productionOutsourceAcceptanceFixture) returnBarcode(t *testing.T, barcode string) OutsourceTransferActionResponse {
	t.Helper()
	returned, err := f.outsource.ReturnOutsourceOrderLine(OutsourceTransferRequest{
		OutsourceOrderLineID: f.line.ID,
		ProductBarcode:       barcode,
		Quantity:             1,
		UOM:                  "PCS",
		SourceCategory:       ProductionOutsourceInventoryCategory,
		TargetCategory:       "FINISHED",
		ActorID:              "acceptance-user",
		Operator:             "acceptance-user",
		IP:                   "127.0.0.1",
	})
	require.NoError(t, err)
	require.Equal(t, OutsourceTransferTypeReturn, returned.Transfer.TransferType)
	require.Equal(t, float64(1), returned.Transfer.Quantity)
	require.Equal(t, "route-1", returned.Transfer.RouteID)
	return returned
}

func TestProductionOutsourceAcceptanceRunsUnifiedBarcodeChain(t *testing.T) {
	fixture := newProductionOutsourceAcceptanceFixture(t, OutsourceOrderStatusDraft)
	require.NoError(t, fixture.database.Model(&models.OutsourceOrderLine{}).
		Where("id = ?", fixture.line.ID).
		Update("quantity", 1).Error)
	fixture.seedBarcodeAtFirstRouteStep(t)
	fixture.release(t)
	fixture.startAndCompleteFirstRouteStep(t)
	fixture.sendAndReturn(t)

	inspection, err := fixture.outsource.InspectOutsourceOrderLine(OutsourceInspectionRequest{
		OutsourceOrderLineID:     fixture.line.ID,
		ProductBarcode:           fixture.productBarcode,
		ProductionWorkLocationID: productionOperationExecutionTestWorkLocationID,
		Result:                   OutsourceInspectionResultPass,
		InspectedQuantity:        1,
		UOM:                      "PCS",
		ActorID:                  "acceptance-user",
		Operator:                 "acceptance-user",
		IP:                       "127.0.0.1",
	})
	require.NoError(t, err)
	require.Equal(t, OutsourceInspectionDispositionAccept, inspection.Inspection.Disposition)
	require.Equal(t, "route-1", inspection.Inspection.RouteID)
	require.Equal(t, ProductionOperationActionComplete, inspection.Scan.Operation.Action)
	require.Equal(t, ProductBarcodeStateStatusCompleted, inspection.Scan.State.Status)
	require.Equal(t, fixture.routeStepIDs[1], inspection.Scan.State.RouteStepID)
	require.True(t, inspection.Scan.Progress.RouteCompleted)
	require.Equal(t, OutsourceOrderStatusClosed, inspection.Order.Status)
	require.Equal(t, float64(1), inspection.Order.Lines[0].AcceptedQuantity)
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

	requireOutsourceRuleExecutionLog(t, fixture.database, OutsourceOrderStatusReleased, "notify", "skipped")
	requireOutsourceRuleExecutionLog(t, fixture.database, OutsourceOrderStatusSent, "notify", "skipped")
	requireOutsourceRuleExecutionLog(t, fixture.database, OutsourceOrderStatusReturned, "notify", "skipped")
	requireOutsourceRuleExecutionLog(t, fixture.database, businessEventOutsourceStatusInspectionAccepted, "notify", "skipped")
	requireOutsourceRuleExecutionLog(t, fixture.database, OutsourceOrderStatusClosed, "notify", "pending")
	requireOutsourceAuditLog(t, fixture.database, fixture.order.ID, audit.AuditActionStatus, map[string]string{
		"action":         "OUTSOURCE_INSPECT",
		"productBarcode": fixture.productBarcode,
		"status":         OutsourceOrderStatusClosed,
	})
}

func TestProductionOutsourceAcceptanceProcessesPartialReturnsByDifferentBarcodes(t *testing.T) {
	fixture := newProductionOutsourceAcceptanceFixture(t, OutsourceOrderStatusDraft)
	secondBarcode := "BC-ACCEPTANCE-002"
	fixture.seedBarcodeAtFirstRouteStep(t)
	fixture.seedBarcodeAtFirstRouteStepForBarcode(t, secondBarcode)
	fixture.release(t)
	fixture.startAndCompleteFirstRouteStep(t)
	fixture.startAndCompleteFirstRouteStepForBarcode(t, secondBarcode)
	fixture.sendBarcode(t, fixture.productBarcode)
	fixture.sendBarcode(t, secondBarcode)

	fixture.returnBarcode(t, fixture.productBarcode)
	firstInspection, err := fixture.outsource.InspectOutsourceOrderLine(OutsourceInspectionRequest{
		OutsourceOrderLineID:     fixture.line.ID,
		ProductBarcode:           fixture.productBarcode,
		ProductionWorkLocationID: productionOperationExecutionTestWorkLocationID,
		Result:                   OutsourceInspectionResultPass,
		InspectedQuantity:        1,
		UOM:                      "PCS",
		Operator:                 "acceptance-user",
	})
	require.NoError(t, err)
	require.Equal(t, float64(1), firstInspection.Inspection.AcceptedQuantity)
	require.Equal(t, float64(1), firstInspection.Order.Lines[0].ReturnedQuantity)
	require.Equal(t, float64(1), firstInspection.Order.Lines[0].AcceptedQuantity)
	require.NotEqual(t, OutsourceOrderStatusClosed, firstInspection.Order.Status)

	secondReturnReview, err := fixture.outsource.ReviewProductionOutsourceExecutionBarcode(fixture.line.ID, secondBarcode, "RETURN")
	require.NoError(t, err)
	require.Equal(t, float64(1), secondReturnReview.AvailableQuantity)
	fixture.returnBarcode(t, secondBarcode)
	secondInspection, err := fixture.outsource.InspectOutsourceOrderLine(OutsourceInspectionRequest{
		OutsourceOrderLineID:     fixture.line.ID,
		ProductBarcode:           secondBarcode,
		ProductionWorkLocationID: productionOperationExecutionTestWorkLocationID,
		Result:                   OutsourceInspectionResultPass,
		InspectedQuantity:        1,
		UOM:                      "PCS",
		Operator:                 "acceptance-user",
	})
	require.NoError(t, err)
	require.Equal(t, float64(2), secondInspection.Order.Lines[0].ReturnedQuantity)
	require.Equal(t, float64(2), secondInspection.Order.Lines[0].AcceptedQuantity)
	require.Equal(t, OutsourceOrderStatusClosed, secondInspection.Order.Status)

	var transferCount int64
	require.NoError(t, fixture.database.Model(&models.OutsourceTransfer{}).
		Where("outsource_order_line_id = ?", fixture.line.ID).
		Count(&transferCount).Error)
	require.Equal(t, int64(4), transferCount)
	var inspectionCount int64
	require.NoError(t, fixture.database.Model(&models.OutsourceInspection{}).
		Where("outsource_order_line_id = ?", fixture.line.ID).
		Count(&inspectionCount).Error)
	require.Equal(t, int64(2), inspectionCount)
}

func TestProductionOutsourceAcceptanceSupportsReinspectionAndNextOutsourceCycle(t *testing.T) {
	fixture := newProductionOutsourceAcceptanceFixture(t, OutsourceOrderStatusDraft)
	require.NoError(t, fixture.database.Model(&models.OutsourceOrderLine{}).
		Where("id = ?", fixture.line.ID).Update("quantity", 1).Error)
	fixture.seedBarcodeAtFirstRouteStep(t)
	fixture.release(t)
	fixture.startAndCompleteFirstRouteStep(t)
	fixture.sendBarcode(t, fixture.productBarcode)
	fixture.returnBarcode(t, fixture.productBarcode)

	first, err := fixture.outsource.InspectOutsourceOrderLine(OutsourceInspectionRequest{
		OutsourceOrderLineID:     fixture.line.ID,
		ProductBarcode:           fixture.productBarcode,
		ProductionWorkLocationID: productionOperationExecutionTestWorkLocationID,
		Result:                   OutsourceInspectionResultFail,
		Disposition:              OutsourceInspectionDispositionRework,
		InspectedQuantity:        1,
		UOM:                      "PCS",
		Operator:                 "acceptance-user",
	})
	require.NoError(t, err)
	require.Equal(t, 1, first.Inspection.CycleNo)
	require.Equal(t, 1, first.Inspection.InspectionRoundNo)

	completeRework := func(idSuffix string) {
		_, scanErr := fixture.scan.ExecuteProductionScanCommand(ExecuteProductionScanCommandRequest{
			IdempotencyKey: "outsource-reinspection-rework-start-" + idSuffix,
			ProductBarcode: fixture.productBarcode,
			Action:         ProductionOperationActionStart,
			CommandSource:  ProductionScanCommandSourcePDA,
			ActorID:        "acceptance-user",
			Operator:       "acceptance-user",
		})
		require.NoError(t, scanErr)
		_, scanErr = fixture.scan.ExecuteProductionScanCommand(ExecuteProductionScanCommandRequest{
			IdempotencyKey: "outsource-reinspection-rework-complete-" + idSuffix,
			ProductBarcode: fixture.productBarcode,
			Action:         ProductionOperationActionComplete,
			CommandSource:  ProductionScanCommandSourceUSB,
			ActorID:        "acceptance-user",
			Operator:       "acceptance-user",
		})
		require.NoError(t, scanErr)
	}

	completeRework("round-1")
	second, err := fixture.outsource.InspectOutsourceOrderLine(OutsourceInspectionRequest{
		OutsourceOrderLineID:     fixture.line.ID,
		ProductBarcode:           fixture.productBarcode,
		ProductionWorkLocationID: productionOperationExecutionTestWorkLocationID,
		Result:                   OutsourceInspectionResultFail,
		Disposition:              OutsourceInspectionDispositionRework,
		InspectedQuantity:        1,
		UOM:                      "PCS",
		Operator:                 "acceptance-user",
	})
	require.NoError(t, err)
	require.Equal(t, 1, second.Inspection.CycleNo)
	require.Equal(t, 2, second.Inspection.InspectionRoundNo)
	require.Equal(t, first.InspectionTask.ID, second.InspectionTask.ParentTaskID)
	require.Equal(t, float64(1), second.Order.Lines[0].ReworkQuantity)
	require.Equal(t, float64(1), second.Order.Lines[0].RejectedQuantity)

	var firstAbnormality models.QualityAbnormality
	require.NoError(t, fixture.database.Where("task_id = ?", first.InspectionTask.ID).First(&firstAbnormality).Error)
	require.Equal(t, "CLOSED", firstAbnormality.Status)
	var firstAbnormalityClosureAuditCount int64
	require.NoError(t, fixture.database.Model(&models.AuditLog{}).
		Where("target_id = ? AND action = ?", firstAbnormality.ID, "close_after_rework_reinspection").
		Count(&firstAbnormalityClosureAuditCount).Error)
	require.Equal(t, int64(1), firstAbnormalityClosureAuditCount)

	completeRework("round-2")
	secondCycleSend := fixture.sendBarcode(t, fixture.productBarcode)
	require.Equal(t, 2, secondCycleSend.Transfer.CycleNo)
	secondCycleReturn := fixture.returnBarcode(t, fixture.productBarcode)
	require.Equal(t, 2, secondCycleReturn.Transfer.CycleNo)
	final, err := fixture.outsource.InspectOutsourceOrderLine(OutsourceInspectionRequest{
		OutsourceOrderLineID:     fixture.line.ID,
		ProductBarcode:           fixture.productBarcode,
		ProductionWorkLocationID: productionOperationExecutionTestWorkLocationID,
		Result:                   OutsourceInspectionResultPass,
		InspectedQuantity:        1,
		UOM:                      "PCS",
		Operator:                 "acceptance-user",
	})
	require.NoError(t, err)
	require.Equal(t, 2, final.Inspection.CycleNo)
	require.Equal(t, 1, final.Inspection.InspectionRoundNo)
	require.Equal(t, second.InspectionTask.ID, final.InspectionTask.ParentTaskID)
	require.Equal(t, OutsourceOrderStatusClosed, final.Order.Status)
	require.Equal(t, float64(1), final.Order.Lines[0].AcceptedQuantity)
	require.Zero(t, final.Order.Lines[0].ReworkQuantity)
	require.Zero(t, final.Order.Lines[0].RejectedQuantity)
	require.Equal(t, float64(2), final.Order.Lines[0].SentQuantity)
	require.Equal(t, float64(2), final.Order.Lines[0].ReturnedQuantity)

	var secondAbnormality models.QualityAbnormality
	require.NoError(t, fixture.database.Where("task_id = ?", second.InspectionTask.ID).First(&secondAbnormality).Error)
	require.Equal(t, "CLOSED", secondAbnormality.Status)
}

func TestProductionOutsourceAcceptanceRejectsBarcodeQuantitiesOtherThanOne(t *testing.T) {
	fixture := newProductionOutsourceAcceptanceFixture(t, OutsourceOrderStatusReleased)
	fixture.seedBarcodeAtFirstRouteStep(t)
	fixture.startAndCompleteFirstRouteStep(t)

	_, err := fixture.outsource.SendOutsourceOrderLine(OutsourceTransferRequest{
		OutsourceOrderLineID: fixture.line.ID,
		ProductBarcode:       fixture.productBarcode,
		Quantity:             2,
		UOM:                  "PCS",
		SourceCategory:       "FINISHED",
		TargetCategory:       ProductionOutsourceInventoryCategory,
		Operator:             "acceptance-user",
	})
	require.ErrorIs(t, err, ErrInvalidOutsourceOrder)
	_, err = fixture.outsource.SendOutsourceOrderLine(OutsourceTransferRequest{
		OutsourceOrderLineID: fixture.line.ID,
		ProductBarcode:       fixture.productBarcode,
		Quantity:             1,
		UOM:                  "PCS",
		SourceCategory:       "FINISHED",
		TargetCategory:       ProductionOutsourceInventoryCategory,
		Operator:             "acceptance-user",
	})
	require.NoError(t, err)
	_, err = fixture.outsource.ReturnOutsourceOrderLine(OutsourceTransferRequest{
		OutsourceOrderLineID: fixture.line.ID,
		ProductBarcode:       fixture.productBarcode,
		Quantity:             2,
		UOM:                  "PCS",
		SourceCategory:       ProductionOutsourceInventoryCategory,
		TargetCategory:       "FINISHED",
		Operator:             "acceptance-user",
	})
	require.ErrorIs(t, err, ErrInvalidOutsourceOrder)
	fixture.returnBarcode(t, fixture.productBarcode)
	_, err = fixture.outsource.InspectOutsourceOrderLine(OutsourceInspectionRequest{
		OutsourceOrderLineID:     fixture.line.ID,
		ProductBarcode:           fixture.productBarcode,
		ProductionWorkLocationID: productionOperationExecutionTestWorkLocationID,
		Result:                   OutsourceInspectionResultPass,
		InspectedQuantity:        2,
		UOM:                      "PCS",
		Operator:                 "acceptance-user",
	})
	require.ErrorIs(t, err, ErrInvalidOutsourceOrder)
	inspection, err := fixture.outsource.InspectOutsourceOrderLine(OutsourceInspectionRequest{
		OutsourceOrderLineID:     fixture.line.ID,
		ProductBarcode:           fixture.productBarcode,
		ProductionWorkLocationID: productionOperationExecutionTestWorkLocationID,
		Result:                   OutsourceInspectionResultPass,
		InspectedQuantity:        1,
		UOM:                      "PCS",
		Operator:                 "acceptance-user",
	})
	require.NoError(t, err)
	require.Equal(t, float64(1), inspection.Inspection.InspectedQuantity)
}

func TestProductionOutsourceAcceptanceMatchesProductionPlanSource(t *testing.T) {
	fixture := newProductionOutsourceAcceptanceFixture(t, OutsourceOrderStatusReleased)
	updateSource := func(sourceID string) {
		require.NoError(t, fixture.database.Model(&models.OutsourceOrder{}).
			Where("id = ?", fixture.order.ID).
			Updates(map[string]any{
				"source_type": OutsourceOrderSourceProductionPlan,
				"source_id":   sourceID,
			}).Error)
	}
	updateSource("another-plan")
	fixture.seedBarcodeAtFirstRouteStep(t)
	_, err := fixture.outsource.ReviewProductionOutsourceExecutionBarcode(fixture.line.ID, fixture.productBarcode, "SEND")
	require.ErrorIs(t, err, ErrInvalidOutsourceOrder)
	require.Contains(t, err.Error(), "does not match outsource order source")

	updateSource("plan-route-1")
	review, err := fixture.outsource.ReviewProductionOutsourceExecutionBarcode(fixture.line.ID, fixture.productBarcode, "SEND")
	require.NoError(t, err)
	require.Equal(t, float64(1), review.AvailableQuantity)
}

func TestProductionOutsourceAcceptanceRejectsBarcodeFromDifferentSalesOrderLinePlan(t *testing.T) {
	fixture := newProductionOutsourceAcceptanceFixture(t, OutsourceOrderStatusReleased)
	fixture.seedBarcodeAtFirstRouteStep(t)
	require.NoError(t, fixture.database.Model(&models.ProductionPlan{}).
		Where("id = ?", "plan-route-1").
		Update("sales_order_line_id", 1002).Error)

	_, err := fixture.outsource.ReviewProductionOutsourceExecutionBarcode(fixture.line.ID, fixture.productBarcode, "SEND")
	require.ErrorIs(t, err, ErrInvalidOutsourceOrder)
	require.Contains(t, err.Error(), "does not match outsource sales order line")
	var transferCount int64
	require.NoError(t, fixture.database.Model(&models.OutsourceTransfer{}).
		Where("outsource_order_line_id = ?", fixture.line.ID).
		Count(&transferCount).Error)
	require.Zero(t, transferCount)
}

func TestProductionOutsourceAcceptanceUsesPlanBoundRouteAfterCurrentRevisionChanges(t *testing.T) {
	fixture := newProductionOutsourceAcceptanceFixture(t, OutsourceOrderStatusReleased)
	fixture.seedBarcodeAtFirstRouteStep(t)
	var family models.ProductionRouteFamily
	require.NoError(t, fixture.database.First(&family).Error)
	require.NoError(t, fixture.database.Model(&family).Update("current_revision_id", "unrelated-new-revision").Error)

	review, err := fixture.outsource.ReviewProductionOutsourceExecutionBarcode(fixture.line.ID, fixture.productBarcode, "SEND")
	require.NoError(t, err)
	require.Equal(t, fixture.routeStepIDs[0], review.RouteStepID)
	require.Equal(t, float64(1), review.AvailableQuantity)
}

func TestProductionOutsourceAcceptanceRejectsBarcodeStateFromDifferentRouteRevision(t *testing.T) {
	fixture := newProductionOutsourceAcceptanceFixture(t, OutsourceOrderStatusReleased)
	fixture.seedBarcodeAtFirstRouteStep(t)
	require.NoError(t, fixture.database.Model(&models.ProductBarcodeState{}).
		Where("product_barcode = ?", fixture.productBarcode).
		Update("route_id", "different-route-revision").Error)

	_, err := fixture.outsource.ReviewProductionOutsourceExecutionBarcode(fixture.line.ID, fixture.productBarcode, "SEND")
	require.ErrorIs(t, err, ErrInvalidOutsourceOrder)
	require.Contains(t, err.Error(), "does not match its production plan fixed revision")
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
