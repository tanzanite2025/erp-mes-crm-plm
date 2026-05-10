package services

import (
	"testing"
	"xdfc-server/models"

	"github.com/stretchr/testify/require"
)

func TestBuildSalesExchangeLinesCopiesDisplaySnapshots(t *testing.T) {
	order := models.SalesOrder{
		Status: "InProgress",
		Lines: []models.SalesOrderLine{
			{
				ID:                                    1,
				LineNo:                                1,
				ProductID:                             "prod-1",
				ProductCode:                           "PC-1",
				ProductModel:                          "PM-1",
				Specification:                         "Spec",
				ProductDisplayTitleSnapshot:           "Fork Alpha",
				ProductDisplaySubtitleSnapshot:        "trail/disc/v2",
				ProductDisplayCodeSnapshot:            "PC-1",
				ProductDisplayFullLabelSnapshot:       "Fork Alpha (trail/disc/v2)",
				ProductDisplayStrategyVersionSnapshot: "product-display-v1",
				Description:                           "Desc",
				Qty:                                   10,
				UOM:                                   "PCS",
				DeliveredQty:                          5,
			},
		},
	}

	lines, _, totalQuantity, err := buildSalesExchangeLines(order, map[uint]float64{}, []CreateSalesExchangeLineInput{
		{
			SalesOrderLineID: 1,
			ExchangeQuantity: 1,
		},
	})
	require.NoError(t, err)
	require.Len(t, lines, 1)
	require.Equal(t, 1.0, totalQuantity)
	require.Equal(t, "Fork Alpha", lines[0].ProductDisplayTitleSnapshot)
	require.Equal(t, "trail/disc/v2", lines[0].ProductDisplaySubtitleSnapshot)
	require.Equal(t, "PC-1", lines[0].ProductDisplayCodeSnapshot)
	require.Equal(t, "Fork Alpha (trail/disc/v2)", lines[0].ProductDisplayFullLabelSnapshot)
	require.Equal(t, "product-display-v1", lines[0].ProductDisplayStrategyVersionSnapshot)
}

func TestMapSalesExchangeToResponseIncludesDisplaySnapshots(t *testing.T) {
	response := MapSalesExchangeToResponse(models.SalesExchange{
		Lines: []models.SalesExchangeLine{
			{
				ID:                                    1,
				SalesOrderLineID:                      1,
				LineNo:                                1,
				ProductID:                             "prod-1",
				ProductCode:                           "PC-1",
				ProductModel:                          "PM-1",
				Specification:                         "Spec",
				ProductDisplayTitleSnapshot:           "Fork Alpha",
				ProductDisplaySubtitleSnapshot:        "trail/disc/v2",
				ProductDisplayCodeSnapshot:            "PC-1",
				ProductDisplayFullLabelSnapshot:       "Fork Alpha (trail/disc/v2)",
				ProductDisplayStrategyVersionSnapshot: "product-display-v1",
				Description:                           "Desc",
				UOM:                                   "PCS",
				OriginalOrderQuantity:                 10,
				DeliveredQuantity:                     5,
				ExchangeQuantity:                      1,
			},
		},
	})

	require.Len(t, response.Lines, 1)
	require.Equal(t, "Fork Alpha", response.Lines[0].ProductDisplayTitleSnapshot)
	require.Equal(t, "trail/disc/v2", response.Lines[0].ProductDisplaySubtitleSnapshot)
	require.Equal(t, "Fork Alpha (trail/disc/v2)", response.Lines[0].ProductDisplayFullLabelSnapshot)
	require.Equal(t, "product-display-v1", response.Lines[0].ProductDisplayStrategyVersionSnapshot)
}
