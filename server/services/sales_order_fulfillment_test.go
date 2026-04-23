package services

import (
	"testing"
	"xdfc-server/models"

	"github.com/stretchr/testify/require"
)

func TestCalculateSalesOrderFulfillmentRate(t *testing.T) {
	rate := calculateSalesOrderFulfillmentRate(models.SalesOrder{
		Lines: []models.SalesOrderLine{
			{Qty: 10, DeliveredQty: 5},
			{Qty: 20, DeliveredQty: 10},
		},
	})

	require.Equal(t, 50.0, rate)
}

func TestMapSalesOrderToResponseIncludesFulfillmentRate(t *testing.T) {
	response := MapSalesOrderToResponse(models.SalesOrder{
		ID:       "so-1",
		OrderNo:  "SO-001",
		Status:   "InProgress",
		Quantity: 30,
		Lines: []models.SalesOrderLine{
			{Qty: 10, DeliveredQty: 5},
			{Qty: 20, DeliveredQty: 10},
		},
	})

	require.Equal(t, 50.0, response.FulfillmentRate)
}

func TestMapSalesOrdersToListItemsIncludesFulfillmentRateWithoutLinesPayload(t *testing.T) {
	items := MapSalesOrdersToListItems([]models.SalesOrder{{
		ID:      "so-1",
		OrderNo: "SO-001",
		Status:  "InProgress",
		Lines: []models.SalesOrderLine{
			{Qty: 10, DeliveredQty: 5},
			{Qty: 20, DeliveredQty: 10},
		},
	}}, false)

	require.Len(t, items, 1)
	require.Equal(t, 50.0, items[0].FulfillmentRate)
	require.Empty(t, items[0].Lines)
}

func TestMapSalesOrderToResponseWithReturnMetricsIncludesReturnedAndRemainingQuantity(t *testing.T) {
	response := MapSalesOrderToResponseWithReturnMetrics(
		models.SalesOrder{
			ID:      "so-1",
			OrderNo: "SO-001",
			Lines: []models.SalesOrderLine{
				{ID: 11, LineNo: 1, Qty: 10, DeliveredQty: 10},
			},
		},
		map[uint]float64{11: 3.5},
	)

	require.Len(t, response.Lines, 1)
	require.Equal(t, 3.5, response.Lines[0].ReturnedQuantity)
	require.Equal(t, 6.5, response.Lines[0].RemainingReturnableQuantity)
}

func TestMapSalesOrderToResponseIncludesAvailableActions(t *testing.T) {
	response := MapSalesOrderToResponseWithReturnMetrics(
		models.SalesOrder{
			ID:      "so-1",
			OrderNo: "SO-001",
			Status:  "Pending",
			Lines: []models.SalesOrderLine{
				{ID: 11, LineNo: 1, Qty: 10, DeliveredQty: 0},
			},
		},
		nil,
	)

	actions := map[string]SalesOrderActionAvailabilityResponse{}
	for _, action := range response.AvailableActions {
		actions[action.Action] = action
	}

	require.True(t, actions["startProduction"].Allowed)
	require.True(t, actions["cancel"].Allowed)
	require.False(t, actions["createReturn"].Allowed)
	require.Equal(t, "SALES_ORDER_RETURN_STATUS_NOT_ALLOWED", actions["createReturn"].ReasonCode)
}
