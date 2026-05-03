package services

import (
	"context"
	"errors"
	"strings"
	"xdfc-server/models"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

func SyncLogisticsBusinessDocumentTx(ctx context.Context, tx *gorm.DB, record *models.LogisticsRecord, nextStatus string) error {
	if tx == nil || record == nil {
		return nil
	}

	logisticsType := strings.TrimSpace(record.Type)
	status := strings.TrimSpace(nextStatus)
	switch logisticsType {
	case "Receipt":
		return syncPurchaseLogisticsStatusTx(ctx, tx, record, status)
	case "Shipment":
		return syncSalesLogisticsStatusTx(ctx, tx, record, status)
	default:
		return nil
	}
}

func syncPurchaseLogisticsStatusTx(ctx context.Context, tx *gorm.DB, record *models.LogisticsRecord, nextStatus string) error {
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
		actorID, operator := logisticsBusinessIdentityFromContext(ctx)
		return DispatchPurchaseOrderStatusChangedTx(tx, order, previousStatus, order.Status, actorID, operator)
	default:
		return nil
	}
}

func syncSalesLogisticsStatusTx(ctx context.Context, tx *gorm.DB, record *models.LogisticsRecord, nextStatus string) error {
	_ = ctx
	_ = tx
	_ = record
	_ = nextStatus
	return nil
}
