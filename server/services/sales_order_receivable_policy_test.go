package services

import (
	"testing"
	"xdfc-server/models"

	"github.com/stretchr/testify/require"
)

func TestCalculateReceivableAmountsSubtractsReturnAdjustments(t *testing.T) {
	order := models.SalesOrder{
		ID:     "sales-order-1",
		Amount: 100,
		Status: "Done",
	}
	bundle := receivableOrderSettlementBundle{
		receivedAmountByOrderID:         map[string]float64{"sales-order-1": 30},
		actualAmountAdjustmentByOrderID: map[string]float64{"sales-order-1": 15},
	}

	received, outstanding := calculateReceivableAmounts(order, bundle)
	require.Equal(t, 30.0, received)
	require.Equal(t, 55.0, outstanding)
}

func TestCalculateReceivableAmountsCapsOutstandingAtZeroAfterReturnAdjustments(t *testing.T) {
	order := models.SalesOrder{
		ID:     "sales-order-2",
		Amount: 100,
		Status: "Done",
	}
	bundle := receivableOrderSettlementBundle{
		receivedAmountByOrderID:         map[string]float64{"sales-order-2": 20},
		actualAmountAdjustmentByOrderID: map[string]float64{"sales-order-2": 90},
	}

	received, outstanding := calculateReceivableAmounts(order, bundle)

	require.Equal(t, 20.0, received)
	require.Equal(t, 0.0, outstanding)
}

func TestDeriveReceivableAgingBucketUsesReceivableSpecificBuckets(t *testing.T) {
	require.Equal(t, models.LedgerAgingBucketCurrent, deriveReceivableAgingBucket(models.LedgerStatusOpen))
	require.Equal(t, models.LedgerAgingBucketCurrent, deriveReceivableAgingBucket(models.LedgerStatusPartial))
	require.Equal(t, models.LedgerAgingBucketOverdue, deriveReceivableAgingBucket(models.LedgerStatusOverdue))
	require.Equal(t, models.LedgerAgingBucketSettled, deriveReceivableAgingBucket(models.LedgerStatusSettled))
	require.Equal(t, models.LedgerAgingBucketCancelled, deriveReceivableAgingBucket(models.LedgerStatusCancelled))
}

func TestCanceledSalesOrderReceivableIsNotAllocatable(t *testing.T) {
	order := models.SalesOrder{
		ID:     "sales-order-canceled",
		Amount: 100,
		Status: "Canceled",
	}
	bundle := receivableOrderSettlementBundle{
		receivedAmountByOrderID:         map[string]float64{},
		actualAmountAdjustmentByOrderID: map[string]float64{},
	}

	received, outstanding := calculateReceivableAmounts(order, bundle)

	require.Equal(t, 0.0, received)
	require.Equal(t, 0.0, outstanding)
	require.True(t, isReceivableOrderNotAllocatable(order, outstanding))
	require.Equal(t, models.LedgerStatusCancelled, deriveReceivableOrderStatus(order, outstanding, received))
}
