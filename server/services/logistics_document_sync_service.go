package services

import (
	"strings"
	"xdfc-server/models"

	"gorm.io/gorm"
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
		return tx.Model(&models.PurchaseOrder{}).
			Where("id = ? AND status = ?", purchaseOrderID, "Sent").
			Update("status", "Awaiting").Error
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
