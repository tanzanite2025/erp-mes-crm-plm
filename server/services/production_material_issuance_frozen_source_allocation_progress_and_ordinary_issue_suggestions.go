package services

import (
	"context"
	"fmt"
	"math"
	"sort"
	"strings"
	"xdfc-server/models"

	"gorm.io/gorm"
)

type productionMaterialIssuanceSourceMaterialIdentity struct {
	SalesOrderLineID uint
	MaterialID       string
}

type productionMaterialIssuanceOriginalAllocationFact struct {
	Allocation  models.ProductionMaterialIssuanceOrderLineAllocation
	Material    models.ProductionMaterialIssuanceWarehouseMovementMaterial
	ReturnedQty float64
}

type productionMaterialIssuanceWarehouseAllocationState struct {
	Review              ProductionMaterialIssuanceWarehouseReview
	Sources             []ProductionMaterialIssuanceReviewedSourceBasis
	Rows                map[productionMaterialIssuanceSourceMaterialIdentity]int
	OriginalAllocations map[string]productionMaterialIssuanceOriginalAllocationFact
}

func GetProductionMaterialIssuanceWarehouseReview(ctx context.Context, database *gorm.DB, documentID string) (ProductionMaterialIssuanceWarehouseReview, error) {
	var state productionMaterialIssuanceWarehouseAllocationState
	if database == nil || strings.TrimSpace(documentID) == "" {
		return state.Review, ErrProductionMaterialIssuanceInvalidRequest
	}
	err := database.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var err error
		state, err = readProductionMaterialIssuanceWarehouseAllocationStateTx(tx, documentID)
		if err != nil {
			return err
		}
		var warehouses []models.WarehouseCategory
		if err := tx.Where("code IN ?", []string{ProductionMaterialInventoryWarehouseCategoryCode, models.ProductionMaterialPendingConsumptionWarehouseCategoryCode}).Find(&warehouses).Error; err != nil {
			return err
		}
		state.Review.WarehouseActionBlockers = map[string]string{"issue": "", "supplement": "", "return": ""}
		for action, kind := range map[string]string{"issue": models.ProductionMaterialMovementIssue, "supplement": models.ProductionMaterialMovementSupplement, "return": models.ProductionMaterialMovementReturn} {
			if err := validateProductionMaterialIssuanceCustodyWarehouseCapabilities(warehouses, kind); err != nil {
				state.Review.WarehouseActionBlockers[action] = err.Error()
			}
		}
		return nil
	}, productionMaterialIssuanceConsistentReadOptions(database)...)
	return state.Review, err
}

func readProductionMaterialIssuanceWarehouseAllocationStateTx(tx *gorm.DB, documentID string) (productionMaterialIssuanceWarehouseAllocationState, error) {
	state := productionMaterialIssuanceWarehouseAllocationState{
		Review:              ProductionMaterialIssuanceWarehouseReview{SourceMaterials: []ProductionMaterialIssuanceSourceMaterialProgress{}, MaterialTotals: []ProductionMaterialIssuanceMaterialProgressTotal{}, Movements: []ProductionMaterialIssuanceWarehouseMovementDetail{}, ReturnableAllocations: []ProductionMaterialIssuanceReturnableOriginalAllocation{}},
		Rows:                make(map[productionMaterialIssuanceSourceMaterialIdentity]int),
		OriginalAllocations: make(map[string]productionMaterialIssuanceOriginalAllocationFact),
	}
	detail, err := getProductionMaterialIssuanceDocumentDetailTx(tx, documentID)
	if err != nil {
		return state, err
	}
	state.Review.Document = detail.Document
	state.Sources = detail.Sources
	state.Review.ReturnableAllocations = []ProductionMaterialIssuanceReturnableOriginalAllocation{}
	var snapshots []models.ProductionMaterialIssuanceSourceSnapshot
	if err := tx.Where("document_id = ?", documentID).Order("position ASC, id ASC").Find(&snapshots).Error; err != nil {
		return state, err
	}
	for index, basis := range detail.Sources {
		for _, contribution := range basis.Contributions {
			key := productionMaterialIssuanceSourceMaterialIdentity{basis.SalesOrderLineID, contribution.MaterialID}
			rowIndex, exists := state.Rows[key]
			if !exists {
				rowIndex = len(state.Review.SourceMaterials)
				state.Rows[key] = rowIndex
				state.Review.SourceMaterials = append(state.Review.SourceMaterials, ProductionMaterialIssuanceSourceMaterialProgress{
					SourceSnapshotID: snapshots[index].ID, SalesOrderLineID: basis.SalesOrderLineID, Position: snapshots[index].Position,
					MaterialID: contribution.MaterialID, MaterialCode: contribution.MaterialCode, MaterialName: contribution.MaterialName, Unit: contribution.Unit,
				})
			}
			row := &state.Review.SourceMaterials[rowIndex]
			if !strings.EqualFold(row.Unit, contribution.Unit) || !isFiniteProductionMaterialRequirementQuantity(contribution.RequiredQty) || contribution.RequiredQty < 0 {
				return state, fmt.Errorf("[CRITICAL] frozen production material quantities or units disagree")
			}
			// Sum the already frozen MRP contributions; never expand or multiply a BOM again.
			row.StandardQty += contribution.RequiredQty
		}
	}
	var movements []models.ProductionMaterialIssuanceWarehouseMovement
	if err := tx.Where("document_id = ?", documentID).Order("document_version_after ASC").Find(&movements).Error; err != nil {
		return state, err
	}
	materialsByMovement := make(map[string][]models.ProductionMaterialIssuanceWarehouseMovementMaterial)
	allocationsByMaterial := make(map[string][]models.ProductionMaterialIssuanceOrderLineAllocation)
	ledgerByID := make(map[string]models.InventoryLedgerEntry)
	if len(movements) > 0 {
		var ledgerEntries []models.InventoryLedgerEntry
		if err := tx.Where("source_type = ? AND source_id = ?", DedicatedInventorySourceProductionMaterialIssuance, documentID).Find(&ledgerEntries).Error; err != nil {
			return state, err
		}
		for _, entry := range ledgerEntries {
			ledgerByID[entry.ID] = entry
		}
		movementIDs := tx.Model(&models.ProductionMaterialIssuanceWarehouseMovement{}).Select("id").Where("document_id = ?", documentID)
		var materials []models.ProductionMaterialIssuanceWarehouseMovementMaterial
		if err := tx.Where("movement_id IN (?)", movementIDs).Order("material_id ASC, batch_no ASC").Find(&materials).Error; err != nil {
			return state, err
		}
		for _, material := range materials {
			materialsByMovement[material.MovementID] = append(materialsByMovement[material.MovementID], material)
		}
		materialIDs := tx.Model(&models.ProductionMaterialIssuanceWarehouseMovementMaterial{}).Select("id").Where("movement_id IN (?)", movementIDs)
		var allocations []models.ProductionMaterialIssuanceOrderLineAllocation
		if err := tx.Where("movement_material_id IN (?)", materialIDs).Order("sales_order_line_id ASC, id ASC").Find(&allocations).Error; err != nil {
			return state, err
		}
		for _, allocation := range allocations {
			allocationsByMaterial[allocation.MovementMaterialID] = append(allocationsByMaterial[allocation.MovementMaterialID], allocation)
		}
	}
	for index, movement := range movements {
		if movement.DocumentVersionAfter != index+2 || (movement.Kind != models.ProductionMaterialMovementIssue && movement.Kind != models.ProductionMaterialMovementSupplement && movement.Kind != models.ProductionMaterialMovementReturn) {
			return state, fmt.Errorf("[CRITICAL] production material movement version or kind is inconsistent")
		}
		movementDetail := ProductionMaterialIssuanceWarehouseMovementDetail{Movement: movement, Materials: []ProductionMaterialIssuanceWarehouseMaterialDetail{}}
		materials := materialsByMovement[movement.ID]
		if len(materials) == 0 {
			return state, fmt.Errorf("[CRITICAL] production material movement has no materials")
		}
		for _, material := range materials {
			if !isFiniteProductionMaterialRequirementQuantity(material.Quantity) || material.Quantity <= 0 || !isFiniteProductionMaterialRequirementQuantity(material.UnitCost) || material.UnitCost < 0 || !isFiniteProductionMaterialRequirementQuantity(material.TotalValue) || material.TotalValue < 0 || material.SourceInventoryID == "" || material.TargetInventoryID == "" || material.SourceInventoryID == material.TargetInventoryID || material.OutboundLedgerEntryID == "" || material.InboundLedgerEntryID == "" || material.OutboundLedgerEntryID == material.InboundLedgerEntryID {
				return state, fmt.Errorf("[CRITICAL] invalid production material movement quantity, cost or inventory references")
			}
			if err := validateProductionMaterialIssuanceWarehouseMaterialLedgerPair(material, movement, ledgerByID); err != nil {
				return state, err
			}
			allocations := allocationsByMaterial[material.ID]
			totalQuantity, totalReturnValue := 0.0, 0.0
			for _, allocation := range allocations {
				key := productionMaterialIssuanceSourceMaterialIdentity{allocation.SalesOrderLineID, material.MaterialID}
				rowIndex, exists := state.Rows[key]
				if !exists || !isFiniteProductionMaterialRequirementQuantity(allocation.Quantity) || allocation.Quantity <= 0 {
					return state, fmt.Errorf("[CRITICAL] invalid production material order-line allocation")
				}
				row := &state.Review.SourceMaterials[rowIndex]
				if row.SourceSnapshotID != allocation.SourceSnapshotID || !strings.EqualFold(row.Unit, material.Unit) {
					return state, fmt.Errorf("[CRITICAL] production material allocation source or unit disagrees")
				}
				if movement.Kind == models.ProductionMaterialMovementReturn {
					if allocation.OriginalAllocationID == nil {
						return state, fmt.Errorf("[CRITICAL] return has no original allocation")
					}
					original, exists := state.OriginalAllocations[*allocation.OriginalAllocationID]
					if !exists || original.Allocation.SalesOrderLineID != allocation.SalesOrderLineID || original.Allocation.SourceSnapshotID != allocation.SourceSnapshotID || original.Material.MaterialID != material.MaterialID || original.Material.BatchNo != material.BatchNo || !strings.EqualFold(original.Material.Unit, material.Unit) || original.ReturnedQty+allocation.Quantity > original.Allocation.Quantity+productionMaterialIssuanceQuantityTolerance {
						return state, fmt.Errorf("[CRITICAL] return exceeds or disagrees with original allocation")
					}
					original.ReturnedQty += allocation.Quantity
					state.OriginalAllocations[*allocation.OriginalAllocationID] = original
					totalReturnValue += allocation.Quantity * original.Material.UnitCost
					row.ReturnedQty += allocation.Quantity
				} else {
					if allocation.OriginalAllocationID != nil {
						return state, fmt.Errorf("[CRITICAL] outgoing allocation incorrectly references a return origin")
					}
					if movement.Kind == models.ProductionMaterialMovementIssue && row.IssuedQty-row.ReturnedQty+allocation.Quantity > row.StandardQty+productionMaterialIssuanceQuantityTolerance {
						return state, fmt.Errorf("[CRITICAL] ordinary issue exceeds the frozen requirement")
					}
					row.IssuedQty += allocation.Quantity
					state.OriginalAllocations[allocation.ID] = productionMaterialIssuanceOriginalAllocationFact{Allocation: allocation, Material: material}
				}
				totalQuantity += allocation.Quantity
			}
			if !isFiniteProductionMaterialRequirementQuantity(totalQuantity) || math.Abs(totalQuantity-material.Quantity) > productionMaterialIssuanceQuantityTolerance || math.Abs(material.Quantity*material.UnitCost-material.TotalValue) > productionMaterialIssuanceQuantityTolerance*math.Max(1, material.TotalValue) || (movement.Kind == models.ProductionMaterialMovementReturn && math.Abs(totalReturnValue-material.TotalValue) > productionMaterialIssuanceQuantityTolerance*math.Max(1, material.TotalValue)) {
				return state, fmt.Errorf("[CRITICAL] production material allocation quantity or cost does not conserve its movement")
			}
			movementDetail.Materials = append(movementDetail.Materials, ProductionMaterialIssuanceWarehouseMaterialDetail{Material: material, Allocations: allocations})
		}
		state.Review.Movements = append(state.Review.Movements, movementDetail)
	}
	if len(movements) > 0 && (state.Review.Document.WarehouseExecutionAt == nil || state.Review.Document.Status != models.ProductionMaterialIssuanceDispatched || state.Review.Document.Version != len(movements)+1) {
		return state, fmt.Errorf("[CRITICAL] warehouse execution facts disagree with their document")
	}
	if len(movements) == 0 && (state.Review.Document.WarehouseExecutionAt != nil || (state.Review.Document.Status == models.ProductionMaterialIssuanceDispatched && state.Review.Document.Version != 1)) {
		return state, fmt.Errorf("[CRITICAL] warehouse execution history is missing from its document")
	}
	totals := make(map[string]ProductionMaterialIssuanceMaterialProgressTotal)
	for index := range state.Review.SourceMaterials {
		row := &state.Review.SourceMaterials[index]
		row.NetQty = math.Max(0, row.IssuedQty-row.ReturnedQty)
		row.RemainingQty, row.ExcessQty = math.Max(0, row.StandardQty-row.NetQty), math.Max(0, row.NetQty-row.StandardQty)
		total := totals[row.MaterialID]
		if total.Unit != "" && !strings.EqualFold(total.Unit, row.Unit) {
			return state, fmt.Errorf("[CRITICAL] frozen material main units disagree across order lines")
		}
		total.MaterialID, total.Unit = row.MaterialID, row.Unit
		total.StandardQty += row.StandardQty
		total.IssuedQty += row.IssuedQty
		total.ReturnedQty += row.ReturnedQty
		total.NetQty += row.NetQty
		// Sum each line's outstanding and excess separately; never offset another line's shortage.
		total.RemainingQty += row.RemainingQty
		total.ExcessQty += row.ExcessQty
		for _, quantity := range []float64{total.StandardQty, total.IssuedQty, total.ReturnedQty, total.NetQty, total.RemainingQty, total.ExcessQty} {
			if !isFiniteProductionMaterialRequirementQuantity(quantity) {
				return state, fmt.Errorf("[CRITICAL] production material progress exceeds supported range")
			}
		}
		totals[row.MaterialID] = total
	}
	for _, total := range totals {
		state.Review.MaterialTotals = append(state.Review.MaterialTotals, total)
	}
	sort.Slice(state.Review.MaterialTotals, func(i, j int) bool {
		return state.Review.MaterialTotals[i].MaterialID < state.Review.MaterialTotals[j].MaterialID
	})
	for id, original := range state.OriginalAllocations {
		remaining := math.Max(0, original.Allocation.Quantity-original.ReturnedQty)
		if remaining > 0 {
			state.Review.ReturnableAllocations = append(state.Review.ReturnableAllocations, ProductionMaterialIssuanceReturnableOriginalAllocation{
				OriginalAllocationID: id, SalesOrderLineID: original.Allocation.SalesOrderLineID,
				MaterialID: original.Material.MaterialID, BatchNo: original.Material.BatchNo, Unit: original.Material.Unit, ReturnableQty: remaining,
			})
		}
	}
	sort.Slice(state.Review.ReturnableAllocations, func(i, j int) bool {
		return state.Review.ReturnableAllocations[i].OriginalAllocationID < state.Review.ReturnableAllocations[j].OriginalAllocationID
	})
	return state, nil
}

// The caller displays this proposal with review.Document.Version, then explicitly submits it.
func SuggestProductionMaterialIssuanceOrdinaryOrderLineAllocations(review ProductionMaterialIssuanceWarehouseReview, materialID string, quantity float64) ([]ProductionMaterialIssuanceWarehouseAllocationInput, error) {
	if review.Document.Status != models.ProductionMaterialIssuanceDispatched || !isFiniteProductionMaterialRequirementQuantity(quantity) || quantity <= 0 {
		return nil, ErrProductionMaterialIssuanceInvalidRequest
	}
	rows := append([]ProductionMaterialIssuanceSourceMaterialProgress(nil), review.SourceMaterials...)
	sort.SliceStable(rows, func(i, j int) bool { return rows[i].Position < rows[j].Position })
	remaining := quantity
	allocations := []ProductionMaterialIssuanceWarehouseAllocationInput{}
	for _, row := range rows {
		if row.MaterialID != materialID || row.RemainingQty <= 0 || remaining <= 0 {
			continue
		}
		allocated := math.Min(remaining, row.RemainingQty)
		allocations = append(allocations, ProductionMaterialIssuanceWarehouseAllocationInput{SalesOrderLineID: row.SalesOrderLineID, Quantity: allocated})
		remaining -= allocated
	}
	if remaining > productionMaterialIssuanceQuantityTolerance || len(allocations) == 0 {
		return nil, fmt.Errorf("%w: 普通发料超过各订单行尚待领量，请重新核对或办理有原因的补料", ErrProductionMaterialIssuanceAllocationInvalid)
	}
	return allocations, nil
}
