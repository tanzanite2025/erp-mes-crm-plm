package services

import (
	"testing"
	"xdfc-server/models"

	"github.com/stretchr/testify/require"
)

func TestFillOutsourceOrderLineFromSalesLineOverridesClientProductSnapshot(t *testing.T) {
	target := models.OutsourceOrderLine{
		ProductID:     "wrong-product-id",
		ProductCode:   "WRONG-CODE",
		ProductName:   "Wrong product name",
		Specification: "Wrong specification",
		Quantity:      3,
		UOM:           "PCS",
	}
	source := models.SalesOrderLine{
		ProductID:                       "source-product-id",
		ProductCode:                     "SRC-RAW",
		ProductModel:                    "SRC-MODEL",
		ProductDisplayCodeSnapshot:      "SRC-CODE",
		ProductDisplayFullLabelSnapshot: "Source product",
		Specification:                   "Source specification",
		Qty:                             12,
		UOM:                             "kg",
	}

	fillOutsourceOrderLineFromSalesLine(&target, source)

	require.Equal(t, "source-product-id", target.ProductID)
	require.Equal(t, "SRC-CODE", target.ProductCode)
	require.Equal(t, "Source product", target.ProductName)
	require.Equal(t, "Source specification", target.Specification)
	require.Equal(t, float64(3), target.Quantity)
	require.Equal(t, "KG", target.UOM)
}

func TestManualOutsourceOrderSourceTypeIsNotSupported(t *testing.T) {
	require.False(t, isOutsourceOrderSourceType(normalizeOutsourceOrderSourceType("MANUAL")))
	require.False(t, isOutsourceOrderSourceType(normalizeOutsourceOrderSourceType("")))
	require.True(t, isOutsourceOrderSourceType(normalizeOutsourceOrderSourceType("SALES_ORDER")))
	require.True(t, isOutsourceOrderSourceType(normalizeOutsourceOrderSourceType("PRODUCTION_PLAN")))
}

func TestValidateOutsourceOrderDoesNotRequireManualProcessStepBinding(t *testing.T) {
	order := OutsourceOrderDTO{
		SourceType: OutsourceOrderSourceSalesOrder,
		SourceID:   "source-order-id",
		PartnerID:  "partner-id",
		Status:     OutsourceOrderStatusDraft,
		Lines: []OutsourceOrderLineDTO{
			{
				SourceLineID: "1001",
				Quantity:     10,
				UOM:          "PCS",
				Status:       OutsourceOrderStatusDraft,
			},
		},
	}

	require.NoError(t, validateOutsourceOrderDTO(order))
}

func TestFillOutsourceOrderLinesFromSalesOrderRequiresUniqueSourceLine(t *testing.T) {
	order := models.OutsourceOrder{
		Lines: []models.OutsourceOrderLine{
			{SourceLineID: "1001", Quantity: 1, UOM: "PCS"},
			{SourceLineID: "1001", Quantity: 2, UOM: "PCS"},
		},
	}
	salesLines := []models.SalesOrderLine{
		{ID: 1001, ProductDisplayFullLabelSnapshot: "Source product", Qty: 3, UOM: "PCS"},
	}

	require.Error(t, fillOutsourceOrderLinesFromSalesOrder(&order, salesLines))
}
