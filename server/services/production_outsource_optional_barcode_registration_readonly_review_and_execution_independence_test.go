package services

import (
	"strings"
	"testing"
	"xdfc-server/models"

	"github.com/stretchr/testify/require"
)

func TestOutsourceOptionalBarcodeRegistrationPersistsWithoutStateOrQuantityMatchingAndCreatesNoExecutionFacts(t *testing.T) {
	service, database := newOutsourceExecutionTestService(t)
	order, line := seedOutsourceExecutionOrder(t, database, OutsourceOrderStatusReleased)
	other := line
	other.ID = "other-line"
	other.LineNo = 2
	require.NoError(t, database.Create(&other).Error)
	result, err := service.SaveProductionOutsourceOrderLineOptionalBarcodeRegistration(SaveProductionOutsourceOrderLineOptionalBarcodeRegistrationRequest{
		LineID: line.ID, Version: line.Version, ProductBarcodes: []string{"  bc-new  "}, Operator: "tester",
	})
	require.NoError(t, err)
	require.Equal(t, []string{"BC-NEW"}, result.RegisteredProductBarcodes)
	require.Equal(t, line.Version+1, result.Version)
	var saved models.OutsourceOrderLine
	require.NoError(t, database.First(&saved, "id = ?", line.ID).Error)
	require.Equal(t, []string{"BC-NEW"}, saved.RegisteredProductBarcodes)
	require.Equal(t, line.Quantity, saved.Quantity)
	require.Zero(t, saved.SentQuantity)
	require.NoError(t, database.First(&other, "id = ?", other.ID).Error)
	require.Empty(t, other.RegisteredProductBarcodes)
	for _, model := range []any{&models.OutsourceTransfer{}, &models.OutsourceInspection{}, &models.ProductBarcodeState{}, &models.ProductBarcodeTransferEvent{}, &models.InventoryLedgerEntry{}} {
		var count int64
		require.NoError(t, database.Model(model).Count(&count).Error)
		require.Zero(t, count)
	}
	var savedOrder models.OutsourceOrder
	require.NoError(t, database.First(&savedOrder, "id = ?", order.ID).Error)
	require.Equal(t, OutsourceOrderStatusReleased, savedOrder.Status)
	require.Equal(t, order.Version+1, savedOrder.Version)
	var logs []models.AuditLog
	require.NoError(t, database.Find(&logs).Error)
	require.Len(t, logs, 1)
	_, err = service.SaveProductionOutsourceOrderLineOptionalBarcodeRegistration(SaveProductionOutsourceOrderLineOptionalBarcodeRegistrationRequest{LineID: line.ID, Version: line.Version, ProductBarcodes: []string{"LOST-UPDATE"}})
	require.ErrorIs(t, err, ErrOutsourceOrderVersionConflict)
	cleared, err := service.SaveProductionOutsourceOrderLineOptionalBarcodeRegistration(SaveProductionOutsourceOrderLineOptionalBarcodeRegistrationRequest{LineID: line.ID, Version: result.Version, ProductBarcodes: []string{}})
	require.NoError(t, err)
	require.Empty(t, cleared.RegisteredProductBarcodes)
}

func TestOutsourceOptionalBarcodeRegistrationRejectsMalformedInputAndFinalizedTasks(t *testing.T) {
	service, database := newOutsourceExecutionTestService(t)
	order, line := seedOutsourceExecutionOrder(t, database, OutsourceOrderStatusReleased)
	for _, barcodes := range [][]string{{""}, {"same", " SAME "}, {strings.Repeat("a", 121)}, {"BC\x01"}} {
		_, err := service.SaveProductionOutsourceOrderLineOptionalBarcodeRegistration(SaveProductionOutsourceOrderLineOptionalBarcodeRegistrationRequest{LineID: line.ID, Version: line.Version, ProductBarcodes: barcodes})
		require.ErrorIs(t, err, ErrInvalidOutsourceOrder)
	}
	for _, status := range []string{OutsourceOrderStatusDraft, OutsourceOrderStatusClosed, OutsourceOrderStatusCanceled} {
		require.NoError(t, database.Model(&order).Update("status", status).Error)
		_, err := service.SaveProductionOutsourceOrderLineOptionalBarcodeRegistration(SaveProductionOutsourceOrderLineOptionalBarcodeRegistrationRequest{LineID: line.ID, Version: line.Version, ProductBarcodes: []string{"BC"}})
		require.ErrorIs(t, err, ErrInvalidOutsourceOrder)
	}
}

func TestOutsourceBarcodeReviewIsReadonlyAndUnregisteredBarcodeCanExecute(t *testing.T) {
	service, database := newOutsourceExecutionTestService(t)
	_, line := seedOutsourceExecutionOrder(t, database, OutsourceOrderStatusReleased)
	seedOutsourceBarcodeState(t, database, "BC-001")
	review, err := service.ReviewProductionOutsourceExecutionBarcode(line.ID, "bc-001", "send")
	require.NoError(t, err)
	require.Equal(t, float64(2), review.AvailableQuantity)
	for _, model := range []any{&models.OutsourceTransfer{}, &models.OutsourceInspection{}, &models.ProductBarcodeTransferEvent{}, &models.InventoryLedgerEntry{}, &models.AuditLog{}} {
		var count int64
		require.NoError(t, database.Model(model).Count(&count).Error)
		require.Zero(t, count)
	}
	_, err = service.SendOutsourceOrderLine(OutsourceTransferRequest{OutsourceOrderLineID: line.ID, ProductBarcode: "BC-001", Quantity: 1, UOM: "PCS", SourceCategory: "FINISHED", TargetCategory: ProductionOutsourceInventoryCategory, Operator: "tester"})
	require.NoError(t, err)
	_, err = service.ReviewProductionOutsourceExecutionBarcode(line.ID, "BC-001", "SEND")
	require.ErrorIs(t, err, ErrInvalidOutsourceOrder)
	returnedReview, err := service.ReviewProductionOutsourceExecutionBarcode(line.ID, "BC-001", "RETURN")
	require.NoError(t, err)
	require.Equal(t, float64(1), returnedReview.AvailableQuantity)
	_, err = service.ReturnOutsourceOrderLine(OutsourceTransferRequest{OutsourceOrderLineID: line.ID, ProductBarcode: "BC-001", Quantity: 1, UOM: "PCS", SourceCategory: ProductionOutsourceInventoryCategory, TargetCategory: "FINISHED", Operator: "tester"})
	require.NoError(t, err)
	inspectionReview, err := service.ReviewProductionOutsourceExecutionBarcode(line.ID, "BC-001", "INSPECT")
	require.NoError(t, err)
	require.Equal(t, "NOT_STARTED", inspectionReview.Destinations["ACCEPT"].Status)
	require.NotEqual(t, inspectionReview.RouteStepID, inspectionReview.Destinations["ACCEPT"].RouteStepID)
	require.Equal(t, inspectionReview.RouteStepID, inspectionReview.Destinations["REWORK"].RouteStepID)
	require.Equal(t, "REWORK", inspectionReview.Destinations["REWORK"].Status)
	require.Equal(t, "HOLD", inspectionReview.Destinations["SCRAP"].Status)
	var inspections int64
	require.NoError(t, database.Model(&models.OutsourceInspection{}).Count(&inspections).Error)
	require.Zero(t, inspections)
}

func TestOutsourceBarcodeReviewRejectsWrongProductMissingStateAndMissingPriorFacts(t *testing.T) {
	service, database := newOutsourceExecutionTestService(t)
	_, line := seedOutsourceExecutionOrder(t, database, OutsourceOrderStatusReleased)
	_, err := service.ReviewProductionOutsourceExecutionBarcode(line.ID, "UNKNOWN", "SEND")
	require.ErrorIs(t, err, ErrInvalidOutsourceOrder)
	seedOutsourceBarcodeState(t, database, "BC-001")
	_, err = service.ReviewProductionOutsourceExecutionBarcode(line.ID, "BC-001", "RETURN")
	require.ErrorIs(t, err, ErrInvalidOutsourceOrder)
	require.NoError(t, database.Model(&models.ProductBarcodeState{}).Where("product_barcode = ?", "BC-001").Update("product_id", "wrong-product").Error)
	_, err = service.ReviewProductionOutsourceExecutionBarcode(line.ID, "BC-001", "SEND")
	require.ErrorIs(t, err, ErrInvalidOutsourceOrder)
}

func TestOutsourceInspectionDestinationPreviewMatchesConfirmedSharedEngineForEveryDispositionAndRouteEnd(t *testing.T) {
	for _, scenario := range []struct {
		name, disposition, qualityRouting string
		routeEnds                         bool
	}{
		{name: "accepted next process", disposition: "ACCEPT"},
		{name: "concession next process", disposition: "CONCESSION"},
		{name: "rework at current process", disposition: "REWORK"},
		{name: "scrap held at current process", disposition: "SCRAP"},
		{name: "accepted configured current process", disposition: "ACCEPT", qualityRouting: `{"ACCEPT":"route-1-step-process-a"}`},
		{name: "concession configured current process", disposition: "CONCESSION", qualityRouting: `{"CONCESSION":"route-1-step-process-a"}`},
		{name: "rework configured next process", disposition: "REWORK", qualityRouting: `{"REWORK":"route-1-step-process-b"}`},
		{name: "accepted route completion", disposition: "ACCEPT", routeEnds: true},
	} {
		t.Run(scenario.name, func(t *testing.T) {
			service, database := newOutsourceExecutionTestService(t)
			_, line := seedOutsourceExecutionOrder(t, database, OutsourceOrderStatusReleased)
			seedOutsourceBarcodeState(t, database, "BC-REVIEW")
			if scenario.qualityRouting != "" {
				require.NoError(t, database.Model(&models.ProductionRouteStep{}).Where("id = ?", "route-1-step-process-a").Update("quality_routing", scenario.qualityRouting).Error)
			}
			if scenario.routeEnds {
				require.NoError(t, database.Delete(&models.ProductionRouteStep{}, "id = ?", "route-1-step-process-b").Error)
			}
			_, err := service.SendOutsourceOrderLine(OutsourceTransferRequest{OutsourceOrderLineID: line.ID, ProductBarcode: "BC-REVIEW", Quantity: 2, UOM: "PCS", SourceCategory: "FINISHED", TargetCategory: ProductionOutsourceInventoryCategory, Operator: "tester"})
			require.NoError(t, err)
			_, err = service.ReturnOutsourceOrderLine(OutsourceTransferRequest{OutsourceOrderLineID: line.ID, ProductBarcode: "BC-REVIEW", Quantity: 2, UOM: "PCS", SourceCategory: ProductionOutsourceInventoryCategory, TargetCategory: "FINISHED", Operator: "tester"})
			require.NoError(t, err)
			review, err := service.ReviewProductionOutsourceExecutionBarcode(line.ID, "BC-REVIEW", "INSPECT")
			require.NoError(t, err)
			var inspectionCount int64
			require.NoError(t, database.Model(&models.OutsourceInspection{}).Count(&inspectionCount).Error)
			require.Zero(t, inspectionCount)
			result := OutsourceInspectionResultPass
			if scenario.disposition == "CONCESSION" {
				result = OutsourceInspectionResultConditional
			} else if scenario.disposition == "REWORK" || scenario.disposition == "SCRAP" {
				result = OutsourceInspectionResultFail
			}
			confirmed, err := service.InspectOutsourceOrderLine(OutsourceInspectionRequest{OutsourceOrderLineID: line.ID, ProductBarcode: "BC-REVIEW", InspectedQuantity: 2, UOM: "PCS", Result: result, Disposition: scenario.disposition, Operator: "tester"})
			require.NoError(t, err)
			preview := review.Destinations[scenario.disposition]
			require.Equal(t, preview.RouteStepID, confirmed.Scan.State.RouteStepID)
			require.Equal(t, preview.Status, confirmed.Scan.State.Status)
			require.Equal(t, preview.RouteCompleted, confirmed.Scan.Progress.RouteCompleted)
		})
	}
}
