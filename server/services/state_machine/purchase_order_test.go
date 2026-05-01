package statemachine

import (
	"testing"
	"xdfc-server/models"

	"github.com/stretchr/testify/require"
)

func TestCanTransitionPurchaseOrderStatus(t *testing.T) {
	require.True(t, CanTransitionPurchaseOrderStatus("Draft", "Sent").Allowed)
	require.True(t, CanTransitionPurchaseOrderStatus("Sent", "Awaiting").Allowed)
	require.True(t, CanTransitionPurchaseOrderStatus("Awaiting", "Received").Allowed)
	require.True(t, CanTransitionPurchaseOrderStatus("Sent", "Canceled").Allowed)

	result := CanTransitionPurchaseOrderStatus("Received", "Awaiting")
	require.False(t, result.Allowed)
	require.Equal(t, PurchaseOrderDenyTransitionNotAllowed, result.ReasonCode)
}

func TestPurchaseOrderReceiptAndReturnGuards(t *testing.T) {
	order := models.PurchaseOrder{
		Status: "Sent",
		Lines: []models.PurchaseOrderLine{
			{ID: 1, Qty: 10, ReceivedQty: 4, ReturnedQty: 1},
		},
	}

	require.True(t, CanConfirmPurchaseReceipt(order).Allowed)
	require.True(t, CanCreatePurchasePreInboundReturn(order).Allowed)

	order.Status = "Draft"
	result := CanConfirmPurchaseReceipt(order)
	require.False(t, result.Allowed)
	require.Equal(t, PurchaseOrderDenyReceiptStatus, result.ReasonCode)

	order.Status = "Sent"
	order.Lines[0].ReceivedQty = 9
	order.Lines[0].ReturnedQty = 1
	result = CanCreatePurchasePreInboundReturn(order)
	require.False(t, result.Allowed)
	require.Equal(t, PurchaseOrderDenyReturnNothing, result.ReasonCode)
}

func TestDerivePurchaseOrderStatusValue(t *testing.T) {
	order := models.PurchaseOrder{
		Status: "Sent",
		Lines: []models.PurchaseOrderLine{
			{ID: 1, Qty: 10},
		},
	}

	status, guard := DerivePurchaseOrderStatusValue(order)
	require.True(t, guard.Allowed)
	require.Equal(t, PurchaseOrderStatusSent, status)

	order.Lines[0].ReceivedQty = 4
	status, guard = DerivePurchaseOrderStatusValue(order)
	require.True(t, guard.Allowed)
	require.Equal(t, PurchaseOrderStatusAwaiting, status)

	order.Lines[0].ReceivedQty = 10
	status, guard = DerivePurchaseOrderStatusValue(order)
	require.True(t, guard.Allowed)
	require.Equal(t, PurchaseOrderStatusReceived, status)

	order.Status = "Canceled"
	order.Lines[0].ReceivedQty = 4
	status, guard = DerivePurchaseOrderStatusValue(order)
	require.True(t, guard.Allowed)
	require.Equal(t, PurchaseOrderStatusCanceled, status)
}
