package services

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"strings"
	"time"
	"xdfc-server/audit"
	"xdfc-server/db"
	"xdfc-server/models"

	"github.com/google/uuid"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

var ErrLogisticsStatusVersionConflict = errors.New("logistics status version conflict")

type LogisticsTrackingNoConflictError struct {
	OrderNo string
}

func (e *LogisticsTrackingNoConflictError) Error() string {
	orderNo := strings.TrimSpace(e.OrderNo)
	if orderNo == "" {
		return "[BLOCKING] 该单号已在系统中存在绑定记录"
	}
	return "[BLOCKING] 该单号已在系统中绑定到订单: " + orderNo
}

type UpdateLogisticsStatusInput struct {
	Status      string
	Location    string
	Description string
	EventsJSON  []byte
	Version     int
}

func SaveLogisticsRecord(ctx context.Context, input models.LogisticsRecord) (models.LogisticsRecord, error) {
	if db.DB == nil {
		return models.LogisticsRecord{}, errors.New("database not initialized")
	}

	normalized := normalizeLogisticsRecordInput(input)
	if strings.TrimSpace(normalized.ID) != "" {
		return updateLogisticsRecord(ctx, normalized)
	}
	return createLogisticsRecord(ctx, normalized)
}

func UpdateLogisticsStatus(ctx context.Context, id string, input UpdateLogisticsStatusInput) (models.LogisticsRecord, error) {
	if db.DB == nil {
		return models.LogisticsRecord{}, errors.New("database not initialized")
	}

	id = strings.TrimSpace(id)
	normalized := UpdateLogisticsStatusInput{
		Status:      strings.TrimSpace(input.Status),
		Location:    strings.TrimSpace(input.Location),
		Description: strings.TrimSpace(input.Description),
		EventsJSON:  input.EventsJSON,
		Version:     input.Version,
	}

	var updated models.LogisticsRecord
	err := db.DB.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var record models.LogisticsRecord
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&record, "id = ?", id).Error; err != nil {
			return err
		}

		before := logisticsRecordAuditPayload(record)
		now := time.Now().UTC()
		res := tx.Model(&record).
			Where("version = ?", normalized.Version).
			Updates(map[string]any{
				"status":        normalized.Status,
				"last_location": normalized.Location,
				"events":        normalized.EventsJSON,
				"version":       normalized.Version + 1,
				"updated_at":    now,
			})
		if res.Error != nil {
			return res.Error
		}
		if res.RowsAffected == 0 {
			return ErrLogisticsStatusVersionConflict
		}

		record.Status = normalized.Status
		record.LastLocation = normalized.Location
		record.Events = normalized.EventsJSON
		record.Version = normalized.Version + 1
		record.UpdatedAt = now
		if err := SyncLogisticsBusinessDocumentTx(ctx, tx, &record, normalized.Status); err != nil {
			return err
		}
		if err := tx.First(&updated, "id = ?", record.ID).Error; err != nil {
			return err
		}

		payload := logisticsRecordAuditPayload(updated)
		if normalized.Description != "" {
			payload["description"] = normalized.Description
		}
		return writeLogisticsAuditEntryWithContext(ctx, tx, updated.ID, "STATUS_CHANGE", before, payload)
	})
	if err != nil {
		return models.LogisticsRecord{}, err
	}

	return updated, nil
}

func DeleteLogisticsRecord(ctx context.Context, id string) error {
	if db.DB == nil {
		return errors.New("database not initialized")
	}

	id = strings.TrimSpace(id)
	return db.DB.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var record models.LogisticsRecord
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&record, "id = ?", id).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return nil
			}
			return err
		}
		if record.IsDeleted {
			return nil
		}

		before := logisticsRecordAuditPayload(record)
		now := time.Now().UTC()
		if err := tx.Model(&record).Updates(map[string]any{
			"is_deleted": true,
			"status":     "Canceled",
			"updated_at": now,
		}).Error; err != nil {
			return err
		}

		record.IsDeleted = true
		record.Status = "Canceled"
		record.UpdatedAt = now
		payload := logisticsRecordAuditPayload(record)
		payload["deleted"] = true
		return writeLogisticsAuditEntryWithContext(ctx, tx, record.ID, "DELETE", before, payload)
	})
}

func createLogisticsRecord(ctx context.Context, input models.LogisticsRecord) (models.LogisticsRecord, error) {
	if strings.TrimSpace(input.ID) == "" {
		input.ID = uuid.NewString()
	}
	if input.TrackingNo != "" && logisticsEventsPayloadIsEmpty(input.Events) {
		input.Events = buildInitialLogisticsEvents(time.Now().UTC())
	}
	input.UpdatedAt = time.Now().UTC()

	var created models.LogisticsRecord
	err := db.DB.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var duplicate models.LogisticsRecord
		if err := tx.Where("carrier = ? AND tracking_no = ? AND is_deleted = ?", input.Carrier, input.TrackingNo, false).First(&duplicate).Error; err == nil {
			return &LogisticsTrackingNoConflictError{OrderNo: duplicate.OrderNo}
		} else if !errors.Is(err, gorm.ErrRecordNotFound) {
			return err
		}

		createTx := tx
		if input.SalesOrderID == "" {
			createTx = createTx.Omit("SalesOrderID")
		}
		if input.PurchaseOrderID == "" {
			createTx = createTx.Omit("PurchaseOrderID")
		}
		if input.ProductID == "" {
			createTx = createTx.Omit("ProductID")
		}
		if err := createTx.Create(&input).Error; err != nil {
			return err
		}
		if err := tx.First(&created, "id = ?", input.ID).Error; err != nil {
			return err
		}
		return writeLogisticsAuditEntryWithContext(ctx, tx, created.ID, "CREATE", nil, logisticsRecordAuditPayload(created))
	})
	if err != nil {
		return models.LogisticsRecord{}, err
	}

	return created, nil
}

func updateLogisticsRecord(ctx context.Context, input models.LogisticsRecord) (models.LogisticsRecord, error) {
	var updated models.LogisticsRecord
	err := db.DB.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var existing models.LogisticsRecord
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&existing, "id = ?", input.ID).Error; err != nil {
			return err
		}

		before := logisticsRecordAuditPayload(existing)
		input.UpdatedAt = time.Now().UTC()
		updateTx := tx.Model(&existing)
		if input.SalesOrderID == "" {
			updateTx = updateTx.Omit("SalesOrderID")
		}
		if input.PurchaseOrderID == "" {
			updateTx = updateTx.Omit("PurchaseOrderID")
		}
		if input.ProductID == "" {
			updateTx = updateTx.Omit("ProductID")
		}
		if err := updateTx.Updates(input).Error; err != nil {
			return err
		}
		if input.SalesOrderID == "" {
			if err := tx.Model(&existing).Update("sales_order_id", nil).Error; err != nil {
				return err
			}
		}
		if input.PurchaseOrderID == "" {
			if err := tx.Model(&existing).Update("purchase_order_id", nil).Error; err != nil {
				return err
			}
		}
		if input.ProductID == "" {
			if err := tx.Model(&existing).Update("product_id", nil).Error; err != nil {
				return err
			}
		}
		if err := tx.First(&updated, "id = ?", existing.ID).Error; err != nil {
			return err
		}
		return writeLogisticsAuditEntryWithContext(ctx, tx, updated.ID, "UPDATE", before, logisticsRecordAuditPayload(updated))
	})
	if err != nil {
		return models.LogisticsRecord{}, err
	}

	return updated, nil
}

func normalizeLogisticsRecordInput(input models.LogisticsRecord) models.LogisticsRecord {
	input.ID = strings.TrimSpace(input.ID)
	input.OrderNo = strings.TrimSpace(input.OrderNo)
	input.SalesOrderID = strings.TrimSpace(input.SalesOrderID)
	input.PurchaseOrderID = strings.TrimSpace(input.PurchaseOrderID)
	input.ProductID = strings.TrimSpace(input.ProductID)
	input.ShipmentID = strings.TrimSpace(input.ShipmentID)
	input.Type = strings.TrimSpace(input.Type)
	input.Carrier = strings.TrimSpace(input.Carrier)
	input.TrackingNo = strings.TrimSpace(input.TrackingNo)
	input.Status = strings.TrimSpace(input.Status)
	input.LastLocation = strings.TrimSpace(input.LastLocation)
	return input
}

func buildInitialLogisticsEvents(now time.Time) []byte {
	initialEvent := `[{"id":"evt-init","time":"` + now.Format(time.RFC3339) + `","location":"系统","description":"物流单号已绑定，等待揽收","status":"Pending"}]`
	return []byte(initialEvent)
}

func logisticsEventsPayloadIsEmpty(raw []byte) bool {
	trimmed := bytes.TrimSpace(raw)
	return len(trimmed) == 0 || string(trimmed) == "null"
}

func logisticsRecordAuditPayload(record models.LogisticsRecord) map[string]any {
	payload := map[string]any{
		"orderNo":         strings.TrimSpace(record.OrderNo),
		"salesOrderId":    strings.TrimSpace(record.SalesOrderID),
		"purchaseOrderId": strings.TrimSpace(record.PurchaseOrderID),
		"productId":       strings.TrimSpace(record.ProductID),
		"shipmentId":      strings.TrimSpace(record.ShipmentID),
		"type":            strings.TrimSpace(record.Type),
		"carrier":         strings.TrimSpace(record.Carrier),
		"trackingNo":      strings.TrimSpace(record.TrackingNo),
		"status":          strings.TrimSpace(record.Status),
		"lastLocation":    strings.TrimSpace(record.LastLocation),
		"version":         record.Version,
		"isDeleted":       record.IsDeleted,
	}
	if events := logisticsAuditEventsValue(record.Events); events != nil {
		payload["events"] = events
	}
	return payload
}

func logisticsAuditEventsValue(raw []byte) any {
	trimmed := bytes.TrimSpace(raw)
	if len(trimmed) == 0 || string(trimmed) == "null" {
		return nil
	}
	if json.Valid(trimmed) {
		return json.RawMessage(trimmed)
	}
	return string(trimmed)
}

func logisticsAuditDiff(before map[string]any, payload map[string]any) json.RawMessage {
	diff, _ := json.Marshal(map[string]any{
		"before":  before,
		"payload": payload,
	})
	return diff
}

func writeLogisticsAuditEntryWithContext(ctx context.Context, tx *gorm.DB, targetID string, action string, before map[string]any, payload map[string]any) error {
	return recordLegacyAuditEntryWithContext(ctx, tx, AuditModuleLogistics, strings.TrimSpace(targetID), strings.TrimSpace(action), logisticsAuditDiff(before, payload))
}

func logisticsBusinessIdentityFromContext(ctx context.Context) (string, string) {
	if ctx == nil {
		return "", ""
	}
	actor, ok := audit.ActorFromContext(ctx)
	if !ok {
		return "", ""
	}
	actorID := strings.TrimSpace(actor.UserID)
	operator := strings.TrimSpace(actor.Username)
	if operator == "" {
		operator = actorID
	}
	return actorID, operator
}
