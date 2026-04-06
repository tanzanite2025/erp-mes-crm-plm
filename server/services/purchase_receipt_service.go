package services

import (
	"errors"
	"strings"
	"xdfc-server/models"

	"gorm.io/gorm"
)

func recalculatePurchaseOrderStatusTx(tx *gorm.DB, purchaseOrderID string) (models.PurchaseOrder, error) {
	if tx == nil {
		return models.PurchaseOrder{}, errors.New("transaction is required")
	}
	purchaseOrderID = strings.TrimSpace(purchaseOrderID)
	if purchaseOrderID == "" {
		return models.PurchaseOrder{}, errors.New("purchase order id is required")
	}

	var order models.PurchaseOrder
	if err := tx.Preload("Lines").Where("id = ?", purchaseOrderID).First(&order).Error; err != nil {
		return models.PurchaseOrder{}, err
	}

	nextStatus, err := recalculatePurchaseOrderStatus(&order)
	if err != nil {
		return models.PurchaseOrder{}, err
	}
	if nextStatus == order.Status {
		return order, nil
	}

	if err := tx.Model(&order).Update("status", nextStatus).Error; err != nil {
		return models.PurchaseOrder{}, err
	}
	order.Status = nextStatus
	return order, nil
}
