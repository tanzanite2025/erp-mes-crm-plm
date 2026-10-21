package services

import (
	"context"
	"errors"
	"xdfc-server/db"
	"xdfc-server/models"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

// PatchLogisticsRecordDetails changes persisted details only. Status has its
// own permission-protected command; type, version and deletion are not editable.
func PatchLogisticsRecordDetails(ctx context.Context, id string, expectedVersion int, changes map[string]string) (models.LogisticsRecord, error) {
	if db.DB == nil {
		return models.LogisticsRecord{}, errors.New("database not initialized")
	}
	var updated models.LogisticsRecord
	err := db.DB.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var current models.LogisticsRecord
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&current, "id = ?", id).Error; err != nil {
			return err
		}
		if current.Version != expectedVersion || expectedVersion < 1 {
			return ErrLogisticsStatusVersionConflict
		}
		fields := map[string]*string{
			"orderNo": &current.OrderNo, "salesOrderId": &current.SalesOrderID,
			"purchaseOrderId": &current.PurchaseOrderID, "productId": &current.ProductID,
			"shipmentId": &current.ShipmentID, "carrier": &current.Carrier,
			"trackingNo": &current.TrackingNo, "lastLocation": &current.LastLocation,
		}
		if len(changes) == 0 {
			return domainValidationError("物流编辑字段不能为空")
		}
		for key, value := range changes {
			field, allowed := fields[key]
			if !allowed {
				return domainValidationError("不支持的物流编辑字段: " + key)
			}
			*field = value
		}
		current = normalizeLogisticsRecordInput(current)
		if err := validateLogisticsRecordPersistenceInput(current); err != nil {
			return err
		}
		var err error
		updated, err = updateLogisticsRecordWithinTransaction(ctx, tx, current)
		return err
	})
	return updated, err
}
