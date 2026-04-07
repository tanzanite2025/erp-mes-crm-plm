package services

import (
	"context"
	"errors"
	"math"
	"strconv"
	"strings"
	"xdfc-server/db"
	"xdfc-server/models"

	"github.com/google/uuid"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

func inventoryUpdateMap(inv models.Inventory) map[string]interface{} {
	return map[string]interface{}{
		"material_id":       inv.MaterialID,
		"material_name":     inv.MaterialName,
		"material_code":     inv.MaterialCode,
		"material_spec":     inv.MaterialSpec,
		"quantity":          inv.Quantity,
		"total_value":       inv.TotalValue,
		"average_unit_cost": inv.AverageUnitCost,
		"category_code":     inv.CategoryCode,
		"batch_no":          inv.BatchNo,
		"uom":               inv.UOM,
	}
}

func updateInventoryRecord(tx *gorm.DB, inv *models.Inventory) error {
	return tx.Model(inv).Updates(inventoryUpdateMap(*inv)).Error
}

func mergeInventoryForSync(existing *models.Inventory, incoming models.Inventory) {
	existing.MaterialID = incoming.MaterialID
	if strings.TrimSpace(incoming.MaterialName) != "" {
		existing.MaterialName = incoming.MaterialName
	}
	if strings.TrimSpace(incoming.MaterialCode) != "" {
		existing.MaterialCode = incoming.MaterialCode
	}
	if strings.TrimSpace(incoming.MaterialSpec) != "" {
		existing.MaterialSpec = incoming.MaterialSpec
	}
	existing.Quantity = incoming.Quantity
	existing.TotalValue = incoming.TotalValue
	existing.AverageUnitCost = incoming.AverageUnitCost
	existing.CategoryCode = incoming.CategoryCode
	existing.BatchNo = incoming.BatchNo
	if strings.TrimSpace(incoming.UOM) != "" {
		existing.UOM = incoming.UOM
	}
}

var (
	ErrShipmentNotFound = errors.New("shipment not found")
	ErrShipmentNotDraft = errors.New("only DRAFT shipment can be committed")
	ErrVoidInProgress   = errors.New("void shipment in progress")
)

const inventoryValueTolerance = 1e-9

type TransferInventoryInput struct {
	MaterialID   string
	Quantity     float64
	FromCategory string
	ToCategory   string
	BatchNo      string
}

func CreateShipmentDraft(shipment *models.ShipmentRecord) error {
	return db.DB.Create(shipment).Error
}

func recordInboundTx(tx *gorm.DB, inbound *models.InboundRecord) error {
	if tx == nil || inbound == nil {
		return errors.New("transaction and inbound are required")
	}
	var material models.Material
	if err := tx.Where("id = ?", inbound.MaterialID).First(&material).Error; err != nil {
		return errors.New("[CRITICAL_DATA_INTEGRITY] inbound failed: material not found: " + inbound.MaterialID)
	}

	if err := tx.Create(inbound).Error; err != nil {
		return err
	}

	var inv models.Inventory
	err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
		Where("material_id = ? AND category_code = ? AND batch_no = ?", inbound.MaterialID, inbound.TargetCategory, inbound.BatchNo).
		First(&inv).Error
	inboundValue := inbound.Quantity * inbound.PurchasePrice
	if errors.Is(err, gorm.ErrRecordNotFound) {
		if inbound.Quantity == 0 {
			return errors.New("[CRITICAL_LOGIC_ERROR] denominator equals zero")
		}
		inv = models.Inventory{
			MaterialID:      inbound.MaterialID,
			Quantity:        inbound.Quantity,
			TotalValue:      inboundValue,
			AverageUnitCost: inboundValue / inbound.Quantity,
			CategoryCode:    inbound.TargetCategory,
			BatchNo:         inbound.BatchNo,
		}
		if err := tx.Create(&inv).Error; err != nil {
			return err
		}
	} else {
		if err != nil {
			return err
		}

		oldQuantity := inv.Quantity
		oldTotalValue := oldQuantity * inv.AverageUnitCost
		newQuantity := oldQuantity + inbound.Quantity
		if newQuantity == 0 {
			return errors.New("[CRITICAL_LOGIC_ERROR] denominator equals zero")
		}
		if newQuantity < 0 {
			return errors.New("[CRITICAL_LOGIC_ERROR] negative inventory quantity")
		}
		newTotalValue := oldTotalValue + inboundValue

		inv.Quantity = newQuantity
		inv.TotalValue = newTotalValue
		inv.AverageUnitCost = newTotalValue / newQuantity
		if err := updateInventoryRecord(tx, &inv); err != nil {
			return err
		}
	}

	if err := applyInboundToPurchaseOrderTx(tx, inbound); err != nil {
		return err
	}

	_, err = CreateInboundVoucherTx(tx, *inbound)
	return err
}

func RecordInbound(inbound *models.InboundRecord) error {
	if inbound.Quantity <= 0 {
		return errors.New("[CRITICAL_LOGIC_ERROR] invalid inbound quantity")
	}
	if inbound.PurchasePrice < 0 {
		return errors.New("[CRITICAL_LOGIC_ERROR] invalid inbound purchase price")
	}
	if strings.TrimSpace(inbound.ID) == "" {
		inbound.ID = uuid.NewString()
	}

	return db.DB.Transaction(func(tx *gorm.DB) error {
		return recordInboundTx(tx, inbound)
	})
}

func applyInboundToPurchaseOrderTx(tx *gorm.DB, inbound *models.InboundRecord) error {
	if tx == nil || inbound == nil {
		return nil
	}
	purchaseOrderID := strings.TrimSpace(inbound.PurchaseOrderID)
	if purchaseOrderID == "" || inbound.PurchaseOrderLineID == 0 {
		return nil
	}

	result := tx.Model(&models.PurchaseOrderLine{}).
		Where("id = ? AND purchase_order_id = ?", inbound.PurchaseOrderLineID, purchaseOrderID).
		Update("received_qty", gorm.Expr("received_qty + ?", inbound.Quantity))
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return errors.New("[CRITICAL_DATA_INTEGRITY] inbound failed: purchase order line not found")
	}

	_, err := recalculatePurchaseOrderStatusTx(tx, purchaseOrderID)
	return err
}

func applyShipmentToSalesOrderTx(tx *gorm.DB, shipment *models.ShipmentRecord) error {
	if tx == nil || shipment == nil {
		return nil
	}
	salesOrderID := strings.TrimSpace(shipment.SalesOrderID)
	if salesOrderID == "" || shipment.SalesOrderLineID == 0 {
		return nil
	}

	result := tx.Model(&models.SalesOrderLine{}).
		Where("id = ? AND sales_order_id = ?", shipment.SalesOrderLineID, salesOrderID).
		Update("delivered_qty", gorm.Expr("delivered_qty + ?", shipment.Quantity))
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return errors.New("[CRITICAL_DATA_INTEGRITY] shipment commit failed: sales order line not found")
	}

	_, err := RecalculateSalesOrderStatusTx(tx, salesOrderID)
	return err
}

func rollbackShipmentFromSalesOrderTx(tx *gorm.DB, shipment *models.ShipmentRecord) error {
	if tx == nil || shipment == nil {
		return nil
	}
	salesOrderID := strings.TrimSpace(shipment.SalesOrderID)
	if salesOrderID == "" || shipment.SalesOrderLineID == 0 {
		return nil
	}

	result := tx.Model(&models.SalesOrderLine{}).
		Where("id = ? AND sales_order_id = ?", shipment.SalesOrderLineID, salesOrderID).
		Update("delivered_qty", gorm.Expr("CASE WHEN delivered_qty >= ? THEN delivered_qty - ? ELSE 0 END", shipment.Quantity, shipment.Quantity))
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return errors.New("[CRITICAL_DATA_INTEGRITY] shipment rollback failed: sales order line not found")
	}

	_, err := RecalculateSalesOrderStatusTx(tx, salesOrderID)
	return err
}

func CommitShipment(id string) (InventoryShipmentRecordResponse, error) {
	var shipment models.ShipmentRecord
	if err := db.DB.First(&shipment, "id = ?", id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return InventoryShipmentRecordResponse{}, ErrShipmentNotFound
		}
		return InventoryShipmentRecordResponse{}, err
	}

	if shipment.Status != "DRAFT" {
		return InventoryShipmentRecordResponse{}, ErrShipmentNotDraft
	}
	if shipment.Quantity <= 0 {
		return InventoryShipmentRecordResponse{}, errors.New("[CRITICAL_LOGIC_ERROR] invalid shipment quantity")
	}

	err := db.DB.Transaction(func(tx *gorm.DB) error {
		var inv models.Inventory
		err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
			Where("material_id = ? AND category_code = ? AND batch_no = ?", shipment.MaterialID, shipment.SourceCategory, shipment.BatchNo).
			First(&inv).Error
		if err != nil {
			return errors.New("inventory record not found for shipment commit")
		}

		if inv.Quantity < shipment.Quantity {
			return errors.New("[CRITICAL_STOCK_SHORTAGE] insufficient inventory (current: " + strconv.FormatFloat(inv.Quantity, 'f', -1, 64) + ")")
		}
		cogs := shipment.Quantity * inv.AverageUnitCost
		newTotalValue := inv.TotalValue - cogs
		if newTotalValue < -inventoryValueTolerance {
			return errors.New("[CRITICAL_LOGIC_ERROR] negative inventory value")
		}
		if math.Abs(newTotalValue) <= inventoryValueTolerance {
			newTotalValue = 0
		}

		inv.Quantity -= shipment.Quantity
		if math.Abs(inv.Quantity) <= inventoryValueTolerance {
			inv.Quantity = 0
		}
		inv.TotalValue = newTotalValue
		if inv.Quantity > 0 {
			inv.AverageUnitCost = inv.TotalValue / inv.Quantity
		} else {
			inv.AverageUnitCost = 0
		}
		if err := updateInventoryRecord(tx, &inv); err != nil {
			return err
		}

		shipment.COGS = cogs
		if err := tx.Model(&shipment).Updates(map[string]interface{}{
			"status": "COMMITTED",
			"cogs":   shipment.COGS,
		}).Error; err != nil {
			return err
		}

		if err := applyShipmentToSalesOrderTx(tx, &shipment); err != nil {
			return err
		}

		_, err = CreateShipmentVoucherTx(tx, shipment)
		return err
	})
	if err != nil {
		return InventoryShipmentRecordResponse{}, err
	}

	if err := db.DB.First(&shipment, "id = ?", id).Error; err != nil {
		return InventoryShipmentRecordResponse{}, err
	}

	return MapShipmentRecordToResponse(shipment), nil
}

func TransferInventory(input TransferInventoryInput) error {
	return db.DB.Transaction(func(tx *gorm.DB) error {
		var from models.Inventory
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
			Where("material_id = ? AND category_code = ? AND batch_no = ?", input.MaterialID, input.FromCategory, input.BatchNo).
			First(&from).Error; err != nil {
			return errors.New("source inventory record not found")
		}
		if from.Quantity < input.Quantity {
			return errors.New("source inventory shortage")
		}
		transferValue := input.Quantity * from.AverageUnitCost
		from.Quantity -= input.Quantity
		from.TotalValue -= transferValue
		if from.TotalValue < 0 && math.Abs(from.TotalValue) <= inventoryValueTolerance {
			from.TotalValue = 0
		}
		if from.Quantity > 0 {
			from.AverageUnitCost = from.TotalValue / from.Quantity
		} else {
			from.AverageUnitCost = 0
		}
		if err := updateInventoryRecord(tx, &from); err != nil {
			return err
		}

		var to models.Inventory
		err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
			Where("material_id = ? AND category_code = ? AND batch_no = ?", input.MaterialID, input.ToCategory, input.BatchNo).
			First(&to).Error
		if errors.Is(err, gorm.ErrRecordNotFound) {
			toUnitCost := 0.0
			if input.Quantity > 0 {
				toUnitCost = transferValue / input.Quantity
			}
			to = models.Inventory{
				MaterialID:      input.MaterialID,
				Quantity:        input.Quantity,
				TotalValue:      transferValue,
				AverageUnitCost: toUnitCost,
				CategoryCode:    input.ToCategory,
				BatchNo:         input.BatchNo,
			}
			return tx.Create(&to).Error
		}
		if err != nil {
			return err
		}

		previousToQuantity := to.Quantity
		to.Quantity += input.Quantity
		to.TotalValue += transferValue
		if to.Quantity > 0 {
			to.AverageUnitCost = to.TotalValue / to.Quantity
		} else if previousToQuantity == 0 {
			to.AverageUnitCost = 0
		}
		return updateInventoryRecord(tx, &to)
	})
}

func ReconcileNegativeInventory() error {
	return db.DB.Model(&models.Inventory{}).
		Where("quantity < 0").
		Updates(map[string]interface{}{
			"quantity":          0,
			"total_value":       0,
			"average_unit_cost": 0,
		}).Error
}

func BulkSyncInventory(items []BulkSyncInventoryItemRequest) error {
	modelsItems := MapBulkSyncInventoryRequestsToModels(items)
	return db.DB.Transaction(func(tx *gorm.DB) error {
		for _, inv := range modelsItems {
			var existing models.Inventory
			var lookupErr error
			if strings.TrimSpace(inv.ID) != "" {
				lookupErr = tx.Where("id = ?", inv.ID).First(&existing).Error
			} else {
				lookupErr = tx.Where("material_id = ? AND category_code = ? AND batch_no = ?", inv.MaterialID, inv.CategoryCode, inv.BatchNo).
					Order("updated_at desc").
					First(&existing).Error
			}

			if errors.Is(lookupErr, gorm.ErrRecordNotFound) {
				if strings.TrimSpace(inv.ID) == "" {
					inv.ID = uuid.NewString()
				}
				if err := tx.Create(&inv).Error; err != nil {
					return err
				}
				continue
			}
			if lookupErr != nil {
				return lookupErr
			}

			mergeInventoryForSync(&existing, inv)
			if err := updateInventoryRecord(tx, &existing); err != nil {
				return err
			}
		}
		return nil
	})
}

func VoidShipment(ctx context.Context, id string) error {
	return db.DB.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var shipment models.ShipmentRecord
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
			Where("id = ?", id).
			First(&shipment).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return errors.New("shipment not found")
			}
			return err
		}

		if shipment.Status == "VOID" {
			return errors.New("shipment already voided")
		}

		if shipment.Status == "COMMITTED" {
			transition := tx.Model(&models.ShipmentRecord{}).
				Where("id = ? AND status = ?", shipment.ID, "COMMITTED").
				Update("status", "VOID")
			if transition.Error != nil {
				return transition.Error
			}
			if transition.RowsAffected == 0 {
				return ErrVoidInProgress
			}

			var inv models.Inventory
			err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
				Where("material_id = ? AND category_code = ? AND batch_no = ?", shipment.MaterialID, shipment.SourceCategory, shipment.BatchNo).
				First(&inv).Error
			if err != nil {
				return errors.New("[CRITICAL] void failed: missing inventory record for rollback")
			}

			inv.Quantity += shipment.Quantity
			inv.TotalValue += shipment.COGS
			if inv.Quantity > 0 {
				inv.AverageUnitCost = inv.TotalValue / inv.Quantity
			}
			if err := updateInventoryRecord(tx, &inv); err != nil {
				return err
			}
			if err := rollbackShipmentFromSalesOrderTx(tx, &shipment); err != nil {
				return err
			}
			return nil
		}

		result := tx.Model(&models.ShipmentRecord{}).
			Where("id = ? AND status = ?", shipment.ID, shipment.Status).
			Update("status", "VOID")
		if result.Error != nil {
			return result.Error
		}
		if result.RowsAffected == 0 {
			return ErrVoidInProgress
		}
		return nil
	})
}
