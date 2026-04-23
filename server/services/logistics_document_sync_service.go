package services

import (
	"errors"
	"strings"
	"xdfc-server/models"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

func SyncLogisticsBusinessDocumentTx(tx *gorm.DB, record *models.LogisticsRecord, nextStatus string) error {
	if tx == nil || record == nil {
		return nil
	}

	logisticsType := strings.TrimSpace(record.Type)
	status := strings.TrimSpace(nextStatus)
	switch logisticsType {
	case "Receipt":
		return syncPurchaseLogisticsStatusTx(tx, record, status)
	case "Shipment":
		return syncSalesLogisticsStatusTx(tx, record, status)
	default:
		return nil
	}
}

func syncPurchaseLogisticsStatusTx(tx *gorm.DB, record *models.LogisticsRecord, nextStatus string) error {
	purchaseOrderID := strings.TrimSpace(record.PurchaseOrderID)
	if purchaseOrderID == "" {
		return nil
	}

	switch nextStatus {
	case "InTransit", "Delivered":
		var order models.PurchaseOrder
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
			Where("id = ?", purchaseOrderID).
			First(&order).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return nil
			}
			return err
		}
		if order.Status != "Sent" {
			return nil
		}
		previousStatus := order.Status
		order.Status = "Awaiting"
		if err := tx.Model(&order).Update("status", order.Status).Error; err != nil {
			return err
		}
		return DispatchPurchaseOrderStatusChangedTx(tx, order, previousStatus, order.Status, "", "")
	default:
		return nil
	}
}

func syncSalesLogisticsStatusTx(tx *gorm.DB, record *models.LogisticsRecord, nextStatus string) error {
	_ = tx
	_ = record
	_ = nextStatus
	return nil
}
