package services

import (
	"errors"
	"xdfc-server/models"
	statemachine "xdfc-server/services/state_machine"
)

const purchaseReceiptTolerance = 1e-9

func recalculatePurchaseOrderStatus(order *models.PurchaseOrder) (string, error) {
	if order == nil {
		return "", errors.New("purchase order is required")
	}

	nextStatus, guard := statemachine.DerivePurchaseOrderStatusValue(*order)
	if !guard.Allowed {
		return "", guard.Err()
	}
	return string(nextStatus), nil
}
