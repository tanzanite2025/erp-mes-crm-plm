package services

import (
	"errors"
	"math"
	"strings"
	"xdfc-server/db"
	"xdfc-server/models"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

var (
	ErrSalesExchangeReplacementShipmentNotFound     = errors.New("sales exchange replacement shipment not found")
	ErrSalesExchangeReplacementShipmentNotCommitted = errors.New(
		"only committed sales exchange replacement shipments can be voided",
	)
	ErrSalesExchangeReplacementShipmentAlreadyVoided = errors.New(
		"sales exchange replacement shipment is already voided",
	)
)

type VoidSalesExchangeReplacementShipmentInput struct {
	SalesExchangeID string
	ShipmentID      string
	Operator        string
	Reason          string
}

type VoidSalesExchangeReplacementShipmentResult struct {
	SalesExchange models.SalesExchange
	Shipment      models.ShipmentRecord
}

func VoidSalesExchangeReplacementShipment(
	input VoidSalesExchangeReplacementShipmentInput,
) (VoidSalesExchangeReplacementShipmentResult, error) {
	input.SalesExchangeID = strings.TrimSpace(input.SalesExchangeID)
	input.ShipmentID = strings.TrimSpace(input.ShipmentID)
	input.Operator = strings.TrimSpace(input.Operator)
	input.Reason = strings.TrimSpace(input.Reason)
	if input.SalesExchangeID == "" || input.ShipmentID == "" {
		return VoidSalesExchangeReplacementShipmentResult{}, errors.New(
			"sales exchange id and shipment id are required",
		)
	}
	if input.Operator == "" {
		input.Operator = "unknown"
	}
	if input.Reason == "" {
		return VoidSalesExchangeReplacementShipmentResult{}, errors.New(
			"void reason is required",
		)
	}

	var result VoidSalesExchangeReplacementShipmentResult
	err := db.DB.Transaction(func(tx *gorm.DB) error {
		updated, err := voidSalesExchangeReplacementShipmentTx(tx, input)
		if err != nil {
			return err
		}
		result = updated
		return nil
	})
	if err != nil {
		return VoidSalesExchangeReplacementShipmentResult{}, err
	}

	var latestInventory models.Inventory
	if db.DB.
		Where(
			"material_id = ? AND category_code = ? AND batch_no = ?",
			result.Shipment.MaterialID,
			result.Shipment.SourceCategory,
			result.Shipment.BatchNo,
		).
		First(&latestInventory).Error == nil {
		syncInventoryToSearch(latestInventory)
	}

	return result, nil
}

func voidSalesExchangeReplacementShipmentTx(
	tx *gorm.DB,
	input VoidSalesExchangeReplacementShipmentInput,
) (VoidSalesExchangeReplacementShipmentResult, error) {
	var exchange models.SalesExchange
	if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
		Preload("Lines.LabelCodes").
		Preload("LabelCodes").
		First(&exchange, "id = ?", input.SalesExchangeID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return VoidSalesExchangeReplacementShipmentResult{}, err
		}
		return VoidSalesExchangeReplacementShipmentResult{}, err
	}

	var shipment models.ShipmentRecord
	if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
		Where(
			"id = ? AND source_type = ? AND source_id = ?",
			input.ShipmentID,
			AfterSalesSourceSalesExchangeReplacement,
			exchange.ID,
		).
		First(&shipment).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return VoidSalesExchangeReplacementShipmentResult{}, ErrSalesExchangeReplacementShipmentNotFound
		}
		return VoidSalesExchangeReplacementShipmentResult{}, err
	}

	status := strings.ToUpper(strings.TrimSpace(shipment.Status))
	if status == "VOID" {
		return VoidSalesExchangeReplacementShipmentResult{}, ErrSalesExchangeReplacementShipmentAlreadyVoided
	}
	if status != "COMMITTED" {
		return VoidSalesExchangeReplacementShipmentResult{}, ErrSalesExchangeReplacementShipmentNotCommitted
	}
	beforeShipment := shipment

	var line *models.SalesExchangeLine
	for index := range exchange.Lines {
		if exchange.Lines[index].ID == shipment.SourceLineID {
			line = &exchange.Lines[index]
			break
		}
	}
	if line == nil {
		return VoidSalesExchangeReplacementShipmentResult{}, errors.New(
			"sales exchange line for replacement shipment was not found",
		)
	}
	if line.ReplacementShippedQuantity+salesReturnQuantityTolerance < shipment.Quantity {
		return VoidSalesExchangeReplacementShipmentResult{}, errors.New(
			"[CRITICAL_DATA_INTEGRITY] replacement shipment exceeds exchange line quantity",
		)
	}

	var inventory models.Inventory
	if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
		Where(
			"material_id = ? AND category_code = ? AND batch_no = ?",
			shipment.MaterialID,
			shipment.SourceCategory,
			shipment.BatchNo,
		).
		First(&inventory).Error; err != nil {
		return VoidSalesExchangeReplacementShipmentResult{}, errors.New(
			"[CRITICAL_DATA_INTEGRITY] replacement shipment void failed: inventory record not found",
		)
	}

	beforeInventory := inventory
	inventory.Quantity += shipment.Quantity
	inventory.TotalValue += shipment.COGS
	if inventory.Quantity < -inventoryValueTolerance ||
		inventory.TotalValue < -inventoryValueTolerance {
		return VoidSalesExchangeReplacementShipmentResult{}, errors.New(
			"[CRITICAL_LOGIC_ERROR] replacement shipment void produced invalid inventory",
		)
	}
	if math.Abs(inventory.Quantity) <= inventoryValueTolerance {
		inventory.Quantity = 0
	}
	if math.Abs(inventory.TotalValue) <= inventoryValueTolerance {
		inventory.TotalValue = 0
	}
	if inventory.Quantity > 0 {
		inventory.AverageUnitCost = inventory.TotalValue / inventory.Quantity
	} else {
		inventory.AverageUnitCost = 0
	}
	if err := updateInventoryRecord(tx, &inventory); err != nil {
		return VoidSalesExchangeReplacementShipmentResult{}, err
	}

	transition := tx.Model(&models.ShipmentRecord{}).
		Where("id = ? AND status = ?", shipment.ID, "COMMITTED").
		Update("status", "VOID")
	if transition.Error != nil {
		return VoidSalesExchangeReplacementShipmentResult{}, transition.Error
	}
	if transition.RowsAffected == 0 {
		return VoidSalesExchangeReplacementShipmentResult{}, ErrVoidInProgress
	}
	shipment.Status = "VOID"

	nextShippedQuantity := math.Round(
		(line.ReplacementShippedQuantity-shipment.Quantity)*100,
	) / 100
	if nextShippedQuantity < 0 && math.Abs(nextShippedQuantity) <= salesReturnQuantityTolerance {
		nextShippedQuantity = 0
	}
	nextLineStatus := deriveSalesExchangeLineExecutionStatus(
		line.OldItemReceivedQuantity,
		nextShippedQuantity,
		line.ExchangeQuantity,
	)
	if err := tx.Model(&models.SalesExchangeLine{}).
		Where("id = ? AND sales_exchange_id = ?", line.ID, exchange.ID).
		Updates(map[string]any{
			"replacement_shipped_quantity": nextShippedQuantity,
			"status":                       nextLineStatus,
		}).Error; err != nil {
		return VoidSalesExchangeReplacementShipmentResult{}, err
	}

	var reloaded models.SalesExchange
	if err := tx.Preload("Lines.LabelCodes").
		Preload("LabelCodes").
		First(&reloaded, "id = ?", exchange.ID).Error; err != nil {
		return VoidSalesExchangeReplacementShipmentResult{}, err
	}

	var activeShipments []models.ShipmentRecord
	if err := tx.
		Where(
			"source_type = ? AND source_id = ? AND status <> ?",
			AfterSalesSourceSalesExchangeReplacement,
			exchange.ID,
			"VOID",
		).
		Order("shipment_date desc, created_at desc").
		Find(&activeShipments).Error; err != nil {
		return VoidSalesExchangeReplacementShipmentResult{}, err
	}

	headerUpdates := map[string]any{
		"status": deriveSalesExchangeExecutionStatus(reloaded),
	}
	if len(activeShipments) == 0 {
		headerUpdates["replacement_tracking_no"] = ""
		headerUpdates["replacement_shipped_at"] = nil
		headerUpdates["replacement_shipped_by"] = ""
		headerUpdates["replacement_source_category"] = ""
		headerUpdates["replacement_batch_no"] = ""
		headerUpdates["replacement_shipment_remarks"] = ""
	} else {
		latest := activeShipments[0]
		headerUpdates["replacement_tracking_no"] = latest.TrackingNo
		headerUpdates["replacement_shipped_at"] = latest.ShipmentDate
		headerUpdates["replacement_shipped_by"] = latest.Operator
		headerUpdates["replacement_source_category"] = latest.SourceCategory
		headerUpdates["replacement_batch_no"] = latest.BatchNo
		headerUpdates["replacement_shipment_remarks"] = latest.Remarks
	}
	if err := tx.Model(&models.SalesExchange{}).
		Where("id = ?", exchange.ID).
		Updates(headerUpdates).Error; err != nil {
		return VoidSalesExchangeReplacementShipmentResult{}, err
	}

	before := map[string]any{
		"shipment":  shipmentAuditSnapshot(beforeShipment),
		"inventory": inventoryAuditSnapshot(beforeInventory),
	}
	payload := map[string]any{
		"shipment":        shipmentAuditSnapshot(shipment),
		"inventory":       inventoryAuditSnapshot(inventory),
		"exchangeId":      exchange.ID,
		"exchangeLineId":  line.ID,
		"rollbackApplied": true,
		"reason":          input.Reason,
	}
	if err := writeShipmentAuditEntry(
		tx,
		shipment.ID,
		"SALES_EXCHANGE_REPLACEMENT_SHIPMENT_VOID",
		before,
		payload,
		input.Operator,
		"",
	); err != nil {
		return VoidSalesExchangeReplacementShipmentResult{}, err
	}

	if err := tx.Preload("Lines.LabelCodes").
		Preload("LabelCodes").
		First(&reloaded, "id = ?", exchange.ID).Error; err != nil {
		return VoidSalesExchangeReplacementShipmentResult{}, err
	}

	return VoidSalesExchangeReplacementShipmentResult{
		SalesExchange: reloaded,
		Shipment:      shipment,
	}, nil
}
