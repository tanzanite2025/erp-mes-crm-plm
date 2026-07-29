package services

import (
	"errors"
	"fmt"
	"math"
	"strings"
	"time"
	"xdfc-server/models"

	"github.com/google/uuid"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

const ProductionOutsourceInventoryCategory = DedicatedInventorySourceProductionOutsource

type productionOutsourceInventoryTransferInput struct {
	TransferID         string
	TransferType       string
	ProductID          string
	ProductCode        string
	Quantity           float64
	UOM                string
	SourceCategory     string
	TargetCategory     string
	BatchNo            string
	OutsourceOrderID   string
	OutsourceOrderLine string
	OccurredAt         *time.Time
	Operator           string
	Remarks            string
}

type productionOutsourceInventoryTransferResult struct {
	MaterialID      string
	SourceCategory  string
	TargetCategory  string
	BatchNo         string
	SourceInventory models.Inventory
	TargetInventory models.Inventory
}

func applyProductionOutsourceInventoryTransferTx(
	tx *gorm.DB,
	input productionOutsourceInventoryTransferInput,
) (productionOutsourceInventoryTransferResult, error) {
	if tx == nil {
		return productionOutsourceInventoryTransferResult{}, errors.New("transaction is required")
	}
	if strings.TrimSpace(input.TransferID) == "" {
		return productionOutsourceInventoryTransferResult{}, errors.New("[CRITICAL_DATA_INTEGRITY] outsource transfer id is required")
	}
	if input.Quantity <= 0 {
		return productionOutsourceInventoryTransferResult{}, errors.New("[CRITICAL_LOGIC_ERROR] outsource inventory quantity must be greater than zero")
	}

	sourceCategory := normalizeWarehouseCategoryCode(input.SourceCategory)
	targetCategory := normalizeWarehouseCategoryCode(input.TargetCategory)
	if sourceCategory == "" || targetCategory == "" {
		return productionOutsourceInventoryTransferResult{}, errors.New("[CRITICAL_DATA_INTEGRITY] outsource source and target inventory categories are required")
	}
	if sourceCategory == targetCategory {
		return productionOutsourceInventoryTransferResult{}, errors.New("[CRITICAL_LOGIC_ERROR] outsource source and target inventory categories must differ")
	}
	if input.TransferType == OutsourceTransferTypeSend && targetCategory != ProductionOutsourceInventoryCategory {
		return productionOutsourceInventoryTransferResult{}, fmt.Errorf(
			"[CRITICAL_DATA_INTEGRITY] outsource send target category must be %s",
			ProductionOutsourceInventoryCategory,
		)
	}
	if input.TransferType == OutsourceTransferTypeReturn && sourceCategory != ProductionOutsourceInventoryCategory {
		return productionOutsourceInventoryTransferResult{}, fmt.Errorf(
			"[CRITICAL_DATA_INTEGRITY] outsource return source category must be %s",
			ProductionOutsourceInventoryCategory,
		)
	}

	resolution, err := ResolveInventoryMaterialForProductSnapshotTx(tx, ProductInventoryMaterialResolutionSnapshot{
		ProductID:                       strings.TrimSpace(input.ProductID),
		ProductCode:                     strings.TrimSpace(input.ProductCode),
		DisallowProductIDMaterialLookup: true,
	})
	if err != nil {
		return productionOutsourceInventoryTransferResult{}, err
	}
	material := resolution.Material
	if strings.TrimSpace(input.UOM) == "" || strings.TrimSpace(material.UOM) == "" ||
		!strings.EqualFold(strings.TrimSpace(input.UOM), strings.TrimSpace(material.UOM)) {
		return productionOutsourceInventoryTransferResult{}, fmt.Errorf(
			"[CRITICAL_DATA_INTEGRITY] outsource inventory uom must match material uom (transfer=%s material=%s)",
			strings.TrimSpace(input.UOM),
			strings.TrimSpace(material.UOM),
		)
	}

	batchNo := strings.TrimSpace(input.BatchNo)
	categories := []string{sourceCategory, targetCategory}
	sortWarehouseCategoryCodes(categories)
	inventories := make(map[string]*models.Inventory, 2)
	missingTarget := false
	for _, category := range categories {
		var inventory models.Inventory
		err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
			Where("material_id = ? AND category_code = ? AND batch_no = ?", material.ID, category, batchNo).
			First(&inventory).Error
		if errors.Is(err, gorm.ErrRecordNotFound) {
			if category != targetCategory {
				return productionOutsourceInventoryTransferResult{}, fmt.Errorf(
					"[CRITICAL_STOCK_SHORTAGE] source inventory record not found for category %s",
					sourceCategory,
				)
			}
			missingTarget = true
			continue
		}
		if err != nil {
			return productionOutsourceInventoryTransferResult{}, err
		}
		inventories[category] = &inventory
	}

	source, ok := inventories[sourceCategory]
	if !ok {
		return productionOutsourceInventoryTransferResult{}, fmt.Errorf(
			"[CRITICAL_STOCK_SHORTAGE] source inventory record not found for category %s",
			sourceCategory,
		)
	}
	if source.Quantity+inventoryValueTolerance < input.Quantity {
		return productionOutsourceInventoryTransferResult{}, fmt.Errorf(
			"[CRITICAL_STOCK_SHORTAGE] insufficient outsource source inventory (current: %g)",
			source.Quantity,
		)
	}

	sourceBefore := *source
	transferValue := input.Quantity * source.AverageUnitCost
	source.Quantity -= input.Quantity
	source.TotalValue -= transferValue
	if math.Abs(source.Quantity) <= inventoryValueTolerance {
		source.Quantity = 0
	}
	if math.Abs(source.TotalValue) <= inventoryValueTolerance {
		source.TotalValue = 0
	}
	if source.Quantity > 0 {
		source.AverageUnitCost = source.TotalValue / source.Quantity
	} else {
		source.AverageUnitCost = 0
	}
	if err := updateInventoryRecord(tx, source); err != nil {
		return productionOutsourceInventoryTransferResult{}, err
	}

	var target models.Inventory
	if existing, exists := inventories[targetCategory]; exists {
		target = *existing
	} else if missingTarget {
		target = models.Inventory{
			BaseModel:       models.BaseModel{ID: uuid.NewString()},
			MaterialID:      material.ID,
			MaterialName:    material.Name,
			MaterialCode:    material.Code,
			MaterialSpec:    material.Spec,
			Quantity:        0,
			TotalValue:      0,
			AverageUnitCost: 0,
			CategoryCode:    targetCategory,
			BatchNo:         batchNo,
			UOM:             material.UOM,
		}
	} else {
		return productionOutsourceInventoryTransferResult{}, errors.New("[CRITICAL_DATA_INTEGRITY] target inventory resolution failed")
	}

	target.Quantity += input.Quantity
	target.TotalValue += transferValue
	if target.Quantity > 0 {
		target.AverageUnitCost = target.TotalValue / target.Quantity
	}
	if strings.TrimSpace(target.MaterialName) == "" {
		target.MaterialName = material.Name
	}
	if strings.TrimSpace(target.MaterialCode) == "" {
		target.MaterialCode = material.Code
	}
	if strings.TrimSpace(target.MaterialSpec) == "" {
		target.MaterialSpec = material.Spec
	}
	if strings.TrimSpace(target.UOM) == "" {
		target.UOM = material.UOM
	}
	if strings.TrimSpace(target.ID) == "" {
		target.ID = uuid.NewString()
		if err := tx.Create(&target).Error; err != nil {
			return productionOutsourceInventoryTransferResult{}, err
		}
	} else if err := updateInventoryRecord(tx, &target); err != nil {
		return productionOutsourceInventoryTransferResult{}, err
	}

	occurredAt := time.Now().UTC()
	if input.OccurredAt != nil {
		occurredAt = input.OccurredAt.UTC()
	}
	transferType := "OUTSOURCE_" + strings.ToUpper(strings.TrimSpace(input.TransferType))
	if err := tx.Create(&models.InventoryLedgerEntry{
		BaseModel:       models.BaseModel{ID: uuid.NewString()},
		TransferID:      input.TransferID,
		TransferType:    transferType,
		Direction:       "OUT",
		MaterialID:      material.ID,
		MaterialName:    material.Name,
		MaterialCode:    material.Code,
		MaterialSpec:    material.Spec,
		CategoryCode:    sourceCategory,
		BatchNo:         batchNo,
		QuantityDelta:   -input.Quantity,
		QuantityAfter:   source.Quantity,
		UnitCost:        sourceBefore.AverageUnitCost,
		TotalValueDelta: -transferValue,
		SourceType:      DedicatedInventorySourceProductionOutsource,
		SourceID:        strings.TrimSpace(input.OutsourceOrderID),
		SourceLineID:    strings.TrimSpace(input.OutsourceOrderLine),
		SourceFactID:    input.TransferID,
		Operator:        strings.TrimSpace(input.Operator),
		OccurredAt:      occurredAt,
		Remarks:         strings.TrimSpace(input.Remarks),
	}).Error; err != nil {
		return productionOutsourceInventoryTransferResult{}, err
	}
	if err := tx.Create(&models.InventoryLedgerEntry{
		BaseModel:       models.BaseModel{ID: uuid.NewString()},
		TransferID:      input.TransferID,
		TransferType:    transferType,
		Direction:       "IN",
		MaterialID:      material.ID,
		MaterialName:    material.Name,
		MaterialCode:    material.Code,
		MaterialSpec:    material.Spec,
		CategoryCode:    targetCategory,
		BatchNo:         batchNo,
		QuantityDelta:   input.Quantity,
		QuantityAfter:   target.Quantity,
		UnitCost:        sourceBefore.AverageUnitCost,
		TotalValueDelta: transferValue,
		SourceType:      DedicatedInventorySourceProductionOutsource,
		SourceID:        strings.TrimSpace(input.OutsourceOrderID),
		SourceLineID:    strings.TrimSpace(input.OutsourceOrderLine),
		SourceFactID:    input.TransferID,
		Operator:        strings.TrimSpace(input.Operator),
		OccurredAt:      occurredAt,
		Remarks:         strings.TrimSpace(input.Remarks),
	}).Error; err != nil {
		return productionOutsourceInventoryTransferResult{}, err
	}

	return productionOutsourceInventoryTransferResult{
		MaterialID:      material.ID,
		SourceCategory:  sourceCategory,
		TargetCategory:  targetCategory,
		BatchNo:         batchNo,
		SourceInventory: *source,
		TargetInventory: target,
	}, nil
}

func normalizeWarehouseCategoryCode(value string) string {
	return strings.ToUpper(strings.TrimSpace(value))
}

func sortWarehouseCategoryCodes(values []string) {
	if len(values) < 2 || values[0] <= values[1] {
		return
	}
	values[0], values[1] = values[1], values[0]
}
