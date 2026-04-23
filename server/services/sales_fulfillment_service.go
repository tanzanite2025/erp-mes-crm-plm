package services

import (
	"errors"
	"strings"
	"xdfc-server/models"

	"gorm.io/gorm"
)

func RecalculateSalesOrderStatusTx(tx *gorm.DB, salesOrderID string) (models.SalesOrder, error) {
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

	for i := range order.Lines {
		desiredStatus := "Pending"
		if strings.TrimSpace(order.Status) == "Canceled" {
			desiredStatus = "Canceled"
		} else if order.Lines[i].DeliveredQty >= order.Lines[i].Qty-salesDeliveryTolerance {
			desiredStatus = "Done"
		} else if order.Lines[i].DeliveredQty > salesDeliveryTolerance {
			desiredStatus = "InProgress"
		} else if strings.TrimSpace(order.Status) == "Draft" {
			desiredStatus = "Draft"
		}

		if order.Lines[i].Status != desiredStatus {
			if err := tx.Model(&models.SalesOrderLine{}).Where("id = ?", order.Lines[i].ID).Update("status", desiredStatus).Error; err != nil {
				return models.SalesOrder{}, err
			}
			order.Lines[i].Status = desiredStatus
		}
	}

	nextStatus, err := recalculateSalesOrderStatus(&order)
	if err != nil {
		return models.SalesOrder{}, err
	}
	if nextStatus == order.Status {
		return order, nil
	}

	previousStatus := order.Status
	if err := tx.Model(&order).Update("status", nextStatus).Error; err != nil {
		return models.SalesOrder{}, err
	}
	order.Status = nextStatus
	if err := DispatchSalesOrderStatusChangedTx(tx, order, previousStatus, nextStatus, "", ""); err != nil {
		return models.SalesOrder{}, err
	}
	return order, nil
}
