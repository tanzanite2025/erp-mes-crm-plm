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
