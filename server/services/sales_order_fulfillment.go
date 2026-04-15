package services

import (
	"math"
	"xdfc-server/models"
)

func calculateSalesOrderFulfillmentRate(order models.SalesOrder) float64 {
	if len(order.Lines) == 0 {
		return 0
	}

	totalQty := 0.0
	totalDeliveredQty := 0.0
	for _, line := range order.Lines {
		if line.Qty > salesDeliveryTolerance {
			totalQty += line.Qty
		}
		if line.DeliveredQty > salesDeliveryTolerance {
			totalDeliveredQty += line.DeliveredQty
		}
	}

	if totalQty <= salesDeliveryTolerance {
		return 0
	}

	rate := (totalDeliveredQty / totalQty) * 100
	if rate < 0 {
		rate = 0
	}
	if rate > 100 {
		rate = 100
	}

	return math.Round(rate*100) / 100
}
