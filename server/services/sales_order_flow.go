package services

import (
	"errors"
	"strings"
	"xdfc-server/models"
)

const salesDeliveryTolerance = 1e-9

func recalculateSalesOrderStatus(order *models.SalesOrder) (string, error) {
	if order == nil {
		return "", errors.New("sales order is required")
	}

	currentStatus := strings.TrimSpace(order.Status)
	if currentStatus == "Canceled" {
		return "Canceled", nil
	}
	if len(order.Lines) == 0 {
		return currentStatus, nil
	}

	hasDelivery := false
	allDelivered := true
	for _, line := range order.Lines {
		if line.DeliveredQty > salesDeliveryTolerance {
			hasDelivery = true
		}
		if line.Qty-line.DeliveredQty > salesDeliveryTolerance {
			allDelivered = false
		}
	}

	if allDelivered {
		return "Done", nil
	}
	if hasDelivery {
		return "InProgress", nil
	}
	if currentStatus == "Draft" {
		return "Draft", nil
	}
	return "Pending", nil
}
