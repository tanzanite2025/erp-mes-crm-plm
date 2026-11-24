package services

import (
	"testing"
	"xdfc-server/models"

	"github.com/stretchr/testify/require"
)

func TestProductBarcodeLifecycleHistoryQueryReturnsLinkedEventsAndPaginatedTotals(t *testing.T) {
	scanService, database := newProductionScanCommandTestService(t)
	stepIDs := seedProductionScanRoute(t, database, "route-lifecycle-history", "process-lifecycle-a", "process-lifecycle-b")
	barcode := "LIFECYCLE-HISTORY-001"

	_, err := scanService.ExecuteProductionScanCommand(ExecuteProductionScanCommandRequest{
		IdempotencyKey: "lifecycle-history-start",
		ProductBarcode: barcode,
		RouteID:        "route-lifecycle-history",
		Action:         ProductionOperationActionStart,
	})
	require.NoError(t, err)

	completed, err := scanService.ExecuteProductionScanCommand(ExecuteProductionScanCommandRequest{
		IdempotencyKey: "lifecycle-history-complete",
		ProductBarcode: barcode,
		Action:         ProductionOperationActionComplete,
	})
	require.NoError(t, err)
	require.Equal(t, stepIDs[1], completed.State.RouteStepID)

	queryService := NewProductBarcodeLifecycleHistoryQueryService(productionOperationExecutionTestTxManager{db: database})
	firstPage, err := queryService.GetProductBarcodeLifecycleHistory(ProductBarcodeLifecycleHistoryQuery{
		ProductBarcode: barcode,
		Limit:          1,
	})
	require.NoError(t, err)
	require.Equal(t, barcode, firstPage.CurrentState.ProductBarcode)
	require.Equal(t, ProductBarcodeStateStatusNotStarted, firstPage.CurrentState.Status)
	require.Equal(t, firstPage.CurrentState.LastEventID, firstPage.StateEvents[0].ID)
	require.Equal(t, int64(3), firstPage.StateEventTotal)
	require.Equal(t, int64(2), firstPage.OperationExecutionTotal)
	require.Equal(t, int64(1), firstPage.TransferEventTotal)
	require.Len(t, firstPage.StateEvents, 1)
	require.Len(t, firstPage.OperationExecutions, 1)
	require.Len(t, firstPage.TransferEvents, 1)
	require.Equal(t, completed.Operation.ID, firstPage.StateEvents[0].OperationID)
	require.Equal(t, completed.Operation.ID, firstPage.TransferEvents[0].OperationID)
	require.Equal(t, 1, firstPage.Limit)
	require.Zero(t, firstPage.Offset)

	secondPage, err := queryService.GetProductBarcodeLifecycleHistory(ProductBarcodeLifecycleHistoryQuery{
		ProductBarcode: barcode,
		Limit:          1,
		Offset:         1,
	})
	require.NoError(t, err)
	require.Len(t, secondPage.StateEvents, 1)
	require.Len(t, secondPage.OperationExecutions, 1)
	require.Empty(t, secondPage.TransferEvents)
	require.NotEqual(t, firstPage.StateEvents[0].ID, secondPage.StateEvents[0].ID)
	require.NotEqual(t, firstPage.OperationExecutions[0].ID, secondPage.OperationExecutions[0].ID)
	require.Equal(t, firstPage.StateEventTotal, secondPage.StateEventTotal)
	require.Equal(t, firstPage.OperationExecutionTotal, secondPage.OperationExecutionTotal)
	require.Equal(t, firstPage.TransferEventTotal, secondPage.TransferEventTotal)

	var operationEventCount int64
	require.NoError(t, database.Model(&models.ProductBarcodeStateEvent{}).
		Where("product_barcode = ? AND operation_id <> ''", barcode).
		Count(&operationEventCount).Error)
	require.EqualValues(t, 3, operationEventCount)
}

func TestProductBarcodeLifecycleHistoryQueryRejectsInvalidProductAndOffset(t *testing.T) {
	queryService := NewProductBarcodeLifecycleHistoryQueryService(productionOperationExecutionTestTxManager{})
	for _, query := range []ProductBarcodeLifecycleHistoryQuery{
		{ProductBarcode: "   "},
		{ProductBarcode: "LIFECYCLE-HISTORY-002", Offset: -1},
		{ProductBarcode: "LIFECYCLE-HISTORY-002", Limit: -1},
	} {
		_, err := queryService.GetProductBarcodeLifecycleHistory(query)
		require.ErrorIs(t, err, ErrInvalidProductBarcodeState)
	}
}
