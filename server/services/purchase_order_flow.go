package services

import (
	"errors"
	"strings"
	"xdfc-server/models"
)

const purchaseReceiptTolerance = 1e-9

func recalculatePurchaseOrderStatus(order *models.PurchaseOrder) (string, error) {
	if order == nil {
		return "", errors.New("purchase order is required")
	}

	currentStatus := strings.TrimSpace(order.Status)
	if currentStatus == "Canceled" {
		return "Canceled", nil
	}
	if len(order.Lines) == 0 {
		return currentStatus, nil
	}

	hasReceipt := false
	allReceived := true
	for _, line := range order.Lines {
		if line.ReceivedQty > purchaseReceiptTolerance {
			hasReceipt = true
		}
		if line.Qty-line.ReceivedQty > purchaseReceiptTolerance {
			allReceived = false
		}
	}

	if allReceived {
		return "Received", nil
	}
	if hasReceipt {
		return "Awaiting", nil
	}
	if currentStatus == "Draft" {
		return "Draft", nil
	}
	return "Sent", nil
}
