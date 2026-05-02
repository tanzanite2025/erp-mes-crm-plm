package statemachine

import (
	"testing"
	"xdfc-server/models"

	"github.com/stretchr/testify/require"
)

func TestCanTransitionSalesOrderStatus(t *testing.T) {
	require.True(t, CanTransitionSalesOrderStatus("Draft", "Pending").Allowed)
	require.True(t, CanTransitionSalesOrderStatus("Pending", "Scheduling").Allowed)
	require.True(t, CanTransitionSalesOrderStatus("Scheduling", "InProgress").Allowed)
	require.True(t, CanTransitionSalesOrderStatus("InProgress", "Done").Allowed)
	require.True(t, CanTransitionSalesOrderStatus("Pending", "Canceled").Allowed)
	require.True(t, CanTransitionSalesOrderStatus("Scheduling", "Canceled").Allowed)

	result := CanTransitionSalesOrderStatus("Done", "Pending")
	require.False(t, result.Allowed)
	require.Equal(t, SalesOrderDenyTransitionNotAllowed, result.ReasonCode)

	result = CanTransitionSalesOrderStatus("Pending", "InProgress")
	require.False(t, result.Allowed)
	require.Equal(t, SalesOrderDenyTransitionNotAllowed, result.ReasonCode)
}

func TestCanCancelSalesOrder(t *testing.T) {
	require.True(t, CanCancelSalesOrder(models.SalesOrder{Status: "Draft"}).Allowed)
	require.True(t, CanCancelSalesOrder(models.SalesOrder{Status: "Pending"}).Allowed)
	require.True(t, CanCancelSalesOrder(models.SalesOrder{Status: "Scheduling"}).Allowed)

	result := CanCancelSalesOrder(models.SalesOrder{Status: "InProgress"})
	require.False(t, result.Allowed)
	require.Equal(t, SalesOrderDenyCancelNotAllowed, result.ReasonCode)

	result = CanCancelSalesOrder(models.SalesOrder{Status: "Canceled"})
	require.False(t, result.Allowed)
	require.Contains(t, result.Reason, "already canceled")
}

func TestCanCreateSalesReturn(t *testing.T) {
	order := models.SalesOrder{
		Status: "InProgress",
		Lines: []models.SalesOrderLine{
			{ID: 1, DeliveredQty: 5},
		},
	}

	require.True(t, CanCreateSalesReturn(order, map[uint]float64{1: 1}, map[uint]float64{1: 4}).Allowed)

	result := CanCreateSalesReturn(order, map[uint]float64{1: 1}, map[uint]float64{1: 5})
	require.False(t, result.Allowed)
	require.Equal(t, SalesOrderDenyReturnQuantity, result.ReasonCode)

	result = CanCreateSalesReturn(models.SalesOrder{Status: "Pending"}, nil, map[uint]float64{1: 1})
	require.False(t, result.Allowed)
	require.Equal(t, SalesOrderDenyReturnStatus, result.ReasonCode)
}

func TestCanCreateSalesReturnActionRequiresRemainingQuantity(t *testing.T) {
	order := models.SalesOrder{
		Status: "Done",
		Lines: []models.SalesOrderLine{
			{ID: 1, DeliveredQty: 5},
		},
	}

	require.True(t, CanPerformSalesOrderAction(order, SalesOrderActionCreateReturn, map[uint]float64{1: 4}).Allowed)

	result := CanPerformSalesOrderAction(order, SalesOrderActionCreateReturn, map[uint]float64{1: 5})
	require.False(t, result.Allowed)
	require.Equal(t, SalesOrderDenyReturnNothing, result.ReasonCode)
}
