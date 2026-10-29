package services

import (
	"fmt"
	"math"
	"strings"
	"time"
	"xdfc-server/models"

	"github.com/google/uuid"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

const DedicatedInventorySourceProductionMaterialIssuance = "PRODUCTION_MATERIAL_ISSUANCE"

func isProductionMaterialPendingConsumptionInventoryCategory(category string) bool {
	return normalizeDedicatedInventorySourceType(category) == models.ProductionMaterialPendingConsumptionWarehouseCategoryCode
}

func validateProductionMaterialIssuanceWarehouseMaterialLedgerPair(material models.ProductionMaterialIssuanceWarehouseMovementMaterial, movement models.ProductionMaterialIssuanceWarehouseMovement, ledgerByID map[string]models.InventoryLedgerEntry) error {
	source, target := ProductionMaterialInventoryWarehouseCategoryCode, models.ProductionMaterialPendingConsumptionWarehouseCategoryCode
	if movement.Kind == models.ProductionMaterialMovementReturn {
		source, target = target, source
	}
	for _, expected := range []struct {
		id, direction, category string
		sign                    float64
	}{
		{material.OutboundLedgerEntryID, "OUT", source, -1}, {material.InboundLedgerEntryID, "IN", target, 1},
	} {
		entry, exists := ledgerByID[expected.id]
		if !exists || entry.Direction != expected.direction || entry.CategoryCode != expected.category || entry.TransferID != material.ID || entry.TransferType != "PRODUCTION_MATERIAL_"+movement.Kind || entry.SourceFactID != movement.ID || entry.SourceLineID != material.ID || entry.MaterialID != material.MaterialID || entry.BatchNo != material.BatchNo || !isFiniteProductionMaterialRequirementQuantity(entry.QuantityDelta) || !isFiniteProductionMaterialRequirementQuantity(entry.TotalValueDelta) || !isFiniteProductionMaterialRequirementQuantity(entry.UnitCost) || !isFiniteProductionMaterialRequirementQuantity(entry.QuantityAfter) || entry.QuantityAfter < 0 || math.Abs(entry.QuantityDelta-expected.sign*material.Quantity) > productionMaterialIssuanceQuantityTolerance || math.Abs(entry.TotalValueDelta-expected.sign*material.TotalValue) > inventoryValueTolerance*math.Max(1, material.TotalValue) || math.Abs(entry.UnitCost-material.UnitCost) > inventoryValueTolerance*math.Max(1, material.UnitCost) {
			return fmt.Errorf("[CRITICAL] production material movement and inventory ledger pair disagree")
		}
	}
	return nil
}

func validateProductionMaterialIssuanceInventoryBalance(balance models.Inventory, unit string) error {
	for _, value := range []float64{balance.Quantity, balance.TotalValue, balance.AverageUnitCost} {
		if !isFiniteProductionMaterialRequirementQuantity(value) || value < 0 {
			return fmt.Errorf("[CRITICAL] invalid production material inventory quantity or valuation")
		}
	}
	if !strings.EqualFold(strings.TrimSpace(balance.UOM), strings.TrimSpace(unit)) || strings.TrimSpace(unit) == "" {
		return fmt.Errorf("%w: 库存主单位与冻结配方不一致", ErrProductionMaterialIssuanceBasisChanged)
	}
	if (balance.Quantity == 0 && balance.TotalValue != 0) || math.Abs(balance.Quantity*balance.AverageUnitCost-balance.TotalValue) > inventoryValueTolerance*math.Max(1, balance.TotalValue) {
		return fmt.Errorf("[CRITICAL] production material inventory valuation is inconsistent")
	}
	return nil
}

// Uses its caller's transaction. Both inventory balances and both ledger entries
// are written here; this adapter never executes a sale, consumes material or opens a transaction.
func applyProductionMaterialIssuanceInventoryCustodyTransferTx(tx *gorm.DB, material models.Material, fact *models.ProductionMaterialIssuanceWarehouseMovementMaterial, movement models.ProductionMaterialIssuanceWarehouseMovement, actor ProductionMaterialIssuanceCommandActor, now time.Time) error {
	if tx == nil || fact == nil || fact.ID == "" || fact.MovementID != movement.ID || fact.MaterialID != material.ID || !isFiniteProductionMaterialRequirementQuantity(fact.Quantity) || fact.Quantity <= 0 {
		return ErrProductionMaterialIssuanceInvalidRequest
	}
	sourceCategory, targetCategory := ProductionMaterialInventoryWarehouseCategoryCode, models.ProductionMaterialPendingConsumptionWarehouseCategoryCode
	if movement.Kind == models.ProductionMaterialMovementReturn {
		sourceCategory, targetCategory = targetCategory, sourceCategory
	} else if movement.Kind != models.ProductionMaterialMovementIssue && movement.Kind != models.ProductionMaterialMovementSupplement {
		return ErrProductionMaterialIssuanceInvalidRequest
	}
	var balances []models.Inventory
	if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).Where("material_id = ? AND category_code IN ? AND COALESCE(batch_no, '') = ?", material.ID, []string{sourceCategory, targetCategory}, fact.BatchNo).Order("category_code ASC, id ASC").Find(&balances).Error; err != nil {
		return err
	}
	byCategory := make(map[string]models.Inventory)
	for _, balance := range balances {
		if _, exists := byCategory[balance.CategoryCode]; exists {
			return fmt.Errorf("[CRITICAL] duplicate production material inventory balances for the same material, warehouse and batch")
		}
		if err := validateProductionMaterialIssuanceInventoryBalance(balance, fact.Unit); err != nil {
			return err
		}
		byCategory[balance.CategoryCode] = balance
	}
	source, exists := byCategory[sourceCategory]
	if !exists || fact.Quantity > source.Quantity {
		return fmt.Errorf("%w: 指定批次库存不足", ErrProductionMaterialIssuanceStockUnavailable)
	}
	var reservations []models.Reservation
	if err := tx.Clauses(clause.Locking{Strength: "SHARE"}).Where("material_id = ? AND category_code = ? AND COALESCE(batch_no, '') = ? AND status = ?", material.ID, sourceCategory, fact.BatchNo, "RESERVED").Order("id ASC").Find(&reservations).Error; err != nil {
		return err
	}
	reserved := 0.0
	for _, reservation := range reservations {
		if !isFiniteProductionMaterialRequirementQuantity(reservation.Quantity) || reservation.Quantity < 0 {
			return fmt.Errorf("[CRITICAL] invalid inventory reservation")
		}
		reserved += reservation.Quantity
	}
	if !isFiniteProductionMaterialRequirementQuantity(reserved) || fact.Quantity > source.Quantity-reserved+inventoryValueTolerance {
		return fmt.Errorf("%w: 指定批次可用量不足，不能使用已预留库存", ErrProductionMaterialIssuanceStockUnavailable)
	}
	if movement.Kind != models.ProductionMaterialMovementReturn {
		fact.UnitCost = source.AverageUnitCost
		fact.TotalValue = fact.Quantity * fact.UnitCost
	}
	if !isFiniteProductionMaterialRequirementQuantity(fact.TotalValue) || fact.TotalValue < 0 || fact.TotalValue > source.TotalValue+inventoryValueTolerance {
		return fmt.Errorf("%w: 库存金额不足以按原发料成本移交", ErrProductionMaterialIssuanceStockUnavailable)
	}
	target, exists := byCategory[targetCategory]
	if !exists {
		target = models.Inventory{BaseModel: models.BaseModel{ID: uuid.NewString()}, MaterialID: material.ID, MaterialName: material.Name, MaterialCode: material.Code, MaterialSpec: material.Spec, CategoryCode: targetCategory, BatchNo: fact.BatchNo, UOM: fact.Unit}
	}
	source.Quantity -= fact.Quantity
	source.TotalValue -= fact.TotalValue
	target.Quantity += fact.Quantity
	target.TotalValue += fact.TotalValue
	for _, balance := range []*models.Inventory{&source, &target} {
		if math.Abs(balance.Quantity) <= inventoryValueTolerance {
			balance.Quantity = 0
		}
		if math.Abs(balance.TotalValue) <= inventoryValueTolerance {
			balance.TotalValue = 0
		}
		if !isFiniteProductionMaterialRequirementQuantity(balance.Quantity) || !isFiniteProductionMaterialRequirementQuantity(balance.TotalValue) || balance.Quantity < 0 || balance.TotalValue < 0 || (balance.Quantity == 0 && balance.TotalValue > 0) {
			return fmt.Errorf("[CRITICAL] production material transfer cannot conserve inventory quantity and value")
		}
		balance.AverageUnitCost = 0
		if balance.Quantity > 0 {
			balance.AverageUnitCost = balance.TotalValue / balance.Quantity
		}
		if !isFiniteProductionMaterialRequirementQuantity(balance.AverageUnitCost) {
			return fmt.Errorf("[CRITICAL] production material transfer unit cost exceeds supported range")
		}
	}
	if err := updateInventoryRecord(tx, &source); err != nil {
		return err
	}
	if exists {
		if err := updateInventoryRecord(tx, &target); err != nil {
			return err
		}
	} else if err := tx.Create(&target).Error; err != nil {
		return err
	}
	fact.SourceInventoryID, fact.TargetInventoryID = source.ID, target.ID
	fact.OutboundLedgerEntryID, fact.InboundLedgerEntryID = uuid.NewString(), uuid.NewString()
	for _, entry := range []struct {
		id, direction, category string
		delta, value, after     float64
	}{
		{fact.OutboundLedgerEntryID, "OUT", sourceCategory, -fact.Quantity, -fact.TotalValue, source.Quantity},
		{fact.InboundLedgerEntryID, "IN", targetCategory, fact.Quantity, fact.TotalValue, target.Quantity},
	} {
		ledger := models.InventoryLedgerEntry{BaseModel: models.BaseModel{ID: entry.id}, TransferID: fact.ID, TransferType: "PRODUCTION_MATERIAL_" + movement.Kind, Direction: entry.direction, MaterialID: material.ID, MaterialName: material.Name, MaterialCode: material.Code, MaterialSpec: material.Spec, CategoryCode: entry.category, BatchNo: fact.BatchNo, QuantityDelta: entry.delta, QuantityAfter: entry.after, UnitCost: fact.UnitCost, TotalValueDelta: entry.value, SourceType: DedicatedInventorySourceProductionMaterialIssuance, SourceID: movement.DocumentID, SourceLineID: fact.ID, SourceFactID: movement.ID, Operator: actor.UserID, OccurredAt: now, Remarks: movement.Reason}
		if err := tx.Create(&ledger).Error; err != nil {
			return err
		}
	}
	return nil
}
