package services

import (
	"errors"
	"strings"
	"xdfc-server/models"

	"gorm.io/gorm"
)

func recalculateSalesOrderStatusTx(tx *gorm.DB, salesOrderID string) (models.SalesOrder, error) {
	if tx == nil {
		return models.SalesOrder{}, errors.New("transaction is required")
	}
	salesOrderID = strings.TrimSpace(salesOrderID)
	if salesOrderID == "" {
		return models.SalesOrder{}, errors.New("sales order id is required")
	}

	var order models.SalesOrder
	if err := tx.Preload("Lines").Where("id = ?", salesOrderID).First(&order).Error; err != nil {
		return models.SalesOrder{}, err
	}

	nextStatus, err := recalculateSalesOrderStatus(&order)
	if err != nil {
		return models.SalesOrder{}, err
	}
	if nextStatus == order.Status {
		return order, nil
	}

	if err := tx.Model(&order).Update("status", nextStatus).Error; err != nil {
		return models.SalesOrder{}, err
	}
	order.Status = nextStatus
	return order, nil
}
