package services

import (
	"context"
	"encoding/json"
	"fmt"
	"math"
	"sort"
	"strings"
	"time"
	"xdfc-server/models"

	"github.com/google/uuid"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

func normalizeProductionMaterialIssuanceWarehouseConfirmation(request ProductionMaterialIssuanceWarehouseConfirmationRequest) (ProductionMaterialIssuanceWarehouseConfirmationRequest, error) {
	request.CommandID, request.DocumentID, request.Kind, request.Reason = strings.TrimSpace(request.CommandID), strings.TrimSpace(request.DocumentID), strings.TrimSpace(request.Kind), strings.TrimSpace(request.Reason)
	if request.CommandID == "" || len(request.CommandID) > 100 || request.DocumentID == "" || request.ExpectedVersion <= 0 || len(request.Reason) > 2000 || len(request.Materials) == 0 || len(request.Materials) > 200 {
		return request, ErrProductionMaterialIssuanceInvalidRequest
	}
	if request.Kind != models.ProductionMaterialMovementIssue && request.Kind != models.ProductionMaterialMovementSupplement && request.Kind != models.ProductionMaterialMovementReturn {
		return request, ErrProductionMaterialIssuanceInvalidRequest
	}
	if request.Kind != models.ProductionMaterialMovementIssue && request.Reason == "" {
		return request, fmt.Errorf("%w: 补料和退料必须填写原因", ErrProductionMaterialIssuanceInvalidRequest)
	}
	materials := make([]ProductionMaterialIssuanceWarehouseMaterialInput, 0, len(request.Materials))
	seenMaterials := make(map[struct{ material, batch string }]bool)
	allocationCount := 0
	for _, material := range request.Materials {
		material.MaterialID, material.BatchNo = strings.TrimSpace(material.MaterialID), strings.TrimSpace(material.BatchNo)
		key := struct{ material, batch string }{material.MaterialID, material.BatchNo}
		if material.MaterialID == "" || len(material.BatchNo) > 100 || seenMaterials[key] || !isFiniteProductionMaterialRequirementQuantity(material.Quantity) || material.Quantity <= 0 || len(material.Allocations) == 0 || len(material.Allocations) > 500 {
			return request, ErrProductionMaterialIssuanceInvalidRequest
		}
		seenMaterials[key] = true
		allocations := make([]ProductionMaterialIssuanceWarehouseAllocationInput, 0, len(material.Allocations))
		seenAllocations := make(map[struct {
			line     uint
			original string
		}]bool)
		total := 0.0
		for _, allocation := range material.Allocations {
			if allocation.SalesOrderLineID == 0 || !isFiniteProductionMaterialRequirementQuantity(allocation.Quantity) || allocation.Quantity <= 0 {
				return request, ErrProductionMaterialIssuanceInvalidRequest
			}
			original := ""
			if allocation.OriginalAllocationID != nil {
				original = strings.TrimSpace(*allocation.OriginalAllocationID)
				allocation.OriginalAllocationID = &original
			}
			if (request.Kind == models.ProductionMaterialMovementReturn && (allocation.OriginalAllocationID == nil || original == "")) || (request.Kind != models.ProductionMaterialMovementReturn && allocation.OriginalAllocationID != nil) {
				return request, ErrProductionMaterialIssuanceInvalidRequest
			}
			identity := struct {
				line     uint
				original string
			}{allocation.SalesOrderLineID, original}
			if seenAllocations[identity] {
				return request, fmt.Errorf("%w: 同批次来源分配不能重复", ErrProductionMaterialIssuanceAllocationInvalid)
			}
			seenAllocations[identity] = true
			allocations = append(allocations, allocation)
			total += allocation.Quantity
		}
		allocationCount += len(allocations)
		if allocationCount > 5000 || !isFiniteProductionMaterialRequirementQuantity(total) || math.Abs(total-material.Quantity) > productionMaterialIssuanceQuantityTolerance {
			return request, fmt.Errorf("%w: 订单行分配合计必须等于本次实际数量", ErrProductionMaterialIssuanceAllocationInvalid)
		}
		sort.Slice(allocations, func(i, j int) bool {
			if allocations[i].SalesOrderLineID != allocations[j].SalesOrderLineID {
				return allocations[i].SalesOrderLineID < allocations[j].SalesOrderLineID
			}
			if allocations[i].OriginalAllocationID != nil {
				return *allocations[i].OriginalAllocationID < *allocations[j].OriginalAllocationID
			}
			return false
		})
		material.Allocations = allocations
		materials = append(materials, material)
	}
	sort.Slice(materials, func(i, j int) bool {
		if materials[i].MaterialID != materials[j].MaterialID {
			return materials[i].MaterialID < materials[j].MaterialID
		}
		return materials[i].BatchNo < materials[j].BatchNo
	})
	request.Materials = materials
	return request, nil
}

func requireProductionMaterialIssuanceCustodyWarehousesTx(tx *gorm.DB, kind string) error {
	var warehouses []models.WarehouseCategory
	if err := tx.Clauses(clause.Locking{Strength: "SHARE"}).Where("code IN ?", []string{ProductionMaterialInventoryWarehouseCategoryCode, models.ProductionMaterialPendingConsumptionWarehouseCategoryCode}).Order("code ASC").Find(&warehouses).Error; err != nil {
		return err
	}
	return validateProductionMaterialIssuanceCustodyWarehouseCapabilities(warehouses, kind)
}

func validateProductionMaterialIssuanceCustodyWarehouseCapabilities(warehouses []models.WarehouseCategory, kind string) error {
	if len(warehouses) != 2 {
		return fmt.Errorf("%w: 生产物料仓库或生产待耗用去向缺失", ErrProductionMaterialIssuanceInvalidRequest)
	}
	for _, warehouse := range warehouses {
		outgoing := warehouse.Code == ProductionMaterialInventoryWarehouseCategoryCode
		if kind == models.ProductionMaterialMovementReturn {
			outgoing = !outgoing
		}
		if !warehouse.IsSystem || !warehouse.Active || (outgoing && !warehouse.AllowShipment) || (!outgoing && !warehouse.AllowInbound) {
			return fmt.Errorf("%w: 生产领退库存去向未启用或不允许本次收发", ErrProductionMaterialIssuanceInvalidRequest)
		}
	}
	return nil
}

func ConfirmProductionMaterialIssuanceWarehouseMovement(ctx context.Context, database *gorm.DB, actor ProductionMaterialIssuanceCommandActor, request ProductionMaterialIssuanceWarehouseConfirmationRequest) (ProductionMaterialIssuanceWarehouseConfirmationResult, error) {
	var result ProductionMaterialIssuanceWarehouseConfirmationResult
	if database == nil {
		return result, ErrProductionMaterialIssuanceInvalidRequest
	}
	actor, err := normalizeProductionMaterialIssuanceCommandActor(actor)
	if err != nil {
		return result, err
	}
	request, err = normalizeProductionMaterialIssuanceWarehouseConfirmation(request)
	if err != nil {
		return result, err
	}
	fingerprint, err := fingerprintProductionMaterialIssuanceCommand("WAREHOUSE_"+request.Kind, request)
	if err != nil {
		return result, err
	}
	err = database.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		now := time.Now().UTC()
		receipt, replayed, err := claimProductionMaterialIssuanceCommandReceiptTx(tx, actor.UserID, request.CommandID, fingerprint, request.DocumentID, now)
		if err != nil {
			return err
		}
		if replayed {
			if receipt.MovementID == nil {
				return fmt.Errorf("[CRITICAL] warehouse command receipt has no confirmed movement")
			}
			state, err := readProductionMaterialIssuanceWarehouseAllocationStateTx(tx, receipt.DocumentID)
			if err != nil {
				return err
			}
			result, err = findProductionMaterialIssuanceWarehouseConfirmationResult(state.Review, *receipt.MovementID)
			return err
		}
		var document models.ProductionMaterialIssuanceDocument
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&document, "id = ?", request.DocumentID).Error; err != nil {
			return err
		}
		if document.Status != models.ProductionMaterialIssuanceDispatched || document.Version != request.ExpectedVersion || document.WarehouseCategoryCode != ProductionMaterialInventoryWarehouseCategoryCode {
			return fmt.Errorf("%w: 单据已变化或不允许仓库办理，请重新核对", ErrProductionMaterialIssuanceBasisChanged)
		}
		state, err := readProductionMaterialIssuanceWarehouseAllocationStateTx(tx, document.ID)
		if err != nil {
			return err
		}
		if err := requireProductionMaterialIssuanceCustodyWarehousesTx(tx, request.Kind); err != nil {
			return err
		}
		// Lock each master once in stable order; this also serializes creation of a
		// missing dedicated balance for this material across different documents.
		materialIDs := []string{}
		for _, input := range request.Materials {
			if len(materialIDs) == 0 || materialIDs[len(materialIDs)-1] != input.MaterialID {
				materialIDs = append(materialIDs, input.MaterialID)
			}
		}
		var materials []models.Material
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).Where("id IN ?", materialIDs).Order("id ASC").Find(&materials).Error; err != nil {
			return err
		}
		byMaterial := make(map[string]models.Material)
		for _, material := range materials {
			byMaterial[material.ID] = material
		}
		movement := models.ProductionMaterialIssuanceWarehouseMovement{ID: uuid.NewString(), DocumentID: document.ID, DocumentVersionAfter: document.Version + 1, Kind: request.Kind, Reason: request.Reason, ConfirmedBy: actor.UserID, ConfirmedAt: now}
		if err := tx.Create(&movement).Error; err != nil {
			return err
		}
		for _, input := range request.Materials {
			material, exists := byMaterial[input.MaterialID]
			if !exists || !strings.EqualFold(material.Status, "Active") {
				return fmt.Errorf("%w: 本次物料已停用或不存在", ErrProductionMaterialIssuanceBasisChanged)
			}
			fact := models.ProductionMaterialIssuanceWarehouseMovementMaterial{ID: uuid.NewString(), MovementID: movement.ID, MaterialID: input.MaterialID, BatchNo: input.BatchNo, Quantity: input.Quantity}
			allocations := make([]models.ProductionMaterialIssuanceOrderLineAllocation, 0, len(input.Allocations))
			for _, inputAllocation := range input.Allocations {
				rowIndex, exists := state.Rows[productionMaterialIssuanceSourceMaterialIdentity{inputAllocation.SalesOrderLineID, input.MaterialID}]
				if !exists {
					return fmt.Errorf("%w: 物料必须属于本单明确的订单行配方", ErrProductionMaterialIssuanceAllocationInvalid)
				}
				row := &state.Review.SourceMaterials[rowIndex]
				if !strings.EqualFold(strings.TrimSpace(material.UOM), strings.TrimSpace(row.Unit)) || strings.TrimSpace(row.Unit) == "" {
					return fmt.Errorf("%w: 物料主单位与冻结依据不一致", ErrProductionMaterialIssuanceBasisChanged)
				}
				fact.Unit = row.Unit
				allocation := models.ProductionMaterialIssuanceOrderLineAllocation{ID: uuid.NewString(), MovementMaterialID: fact.ID, SourceSnapshotID: row.SourceSnapshotID, SalesOrderLineID: row.SalesOrderLineID, Quantity: inputAllocation.Quantity, OriginalAllocationID: inputAllocation.OriginalAllocationID}
				if request.Kind == models.ProductionMaterialMovementReturn {
					original, exists := state.OriginalAllocations[*allocation.OriginalAllocationID]
					if !exists || original.Allocation.SourceSnapshotID != row.SourceSnapshotID || original.Material.MaterialID != input.MaterialID || original.Material.BatchNo != input.BatchNo || original.ReturnedQty+allocation.Quantity > original.Allocation.Quantity+productionMaterialIssuanceQuantityTolerance {
						return fmt.Errorf("%w: 退料必须沿本单原发料的订单行和批次，且不得超过可退量", ErrProductionMaterialIssuanceAllocationInvalid)
					}
					original.ReturnedQty += allocation.Quantity
					state.OriginalAllocations[*allocation.OriginalAllocationID] = original
					fact.TotalValue += allocation.Quantity * original.Material.UnitCost
					row.ReturnedQty += allocation.Quantity
				} else {
					if request.Kind == models.ProductionMaterialMovementIssue && row.IssuedQty-row.ReturnedQty+allocation.Quantity > row.StandardQty+productionMaterialIssuanceQuantityTolerance {
						return fmt.Errorf("%w: 普通发料超过该订单行尚待领量，请重新核对或有原因地补料", ErrProductionMaterialIssuanceAllocationInvalid)
					}
					row.IssuedQty += allocation.Quantity
				}
				if !isFiniteProductionMaterialRequirementQuantity(row.IssuedQty) || !isFiniteProductionMaterialRequirementQuantity(row.ReturnedQty) {
					return ErrProductionMaterialIssuanceAllocationInvalid
				}
				allocations = append(allocations, allocation)
			}
			if request.Kind == models.ProductionMaterialMovementReturn {
				fact.UnitCost = fact.TotalValue / fact.Quantity
			}
			if err := applyProductionMaterialIssuanceInventoryCustodyTransferTx(tx, material, &fact, movement, actor, now); err != nil {
				return err
			}
			if err := tx.Create(&fact).Error; err != nil {
				return err
			}
			if err := tx.Create(&allocations).Error; err != nil {
				return err
			}
		}
		executionAt := document.WarehouseExecutionAt
		if executionAt == nil {
			executionAt = &now
		}
		updated := tx.Model(&document).Where("version = ?", request.ExpectedVersion).Updates(map[string]any{"version": movement.DocumentVersionAfter, "warehouse_execution_at": executionAt})
		if updated.Error != nil {
			return updated.Error
		}
		if updated.RowsAffected != 1 {
			return ErrProductionMaterialIssuanceBasisChanged
		}
		if err := tx.Model(&receipt).Update("movement_id", movement.ID).Error; err != nil {
			return err
		}
		auditPayload, err := json.Marshal(map[string]any{"commandId": request.CommandID, "movementId": movement.ID, "kind": movement.Kind, "reason": movement.Reason, "previousVersion": request.ExpectedVersion, "nextVersion": movement.DocumentVersionAfter, "materialBatchCount": len(request.Materials)})
		if err != nil {
			return err
		}
		if err := recordLegacyAuditEntryTx(tx, "ProductionMaterialIssuance", document.ID, "WAREHOUSE_"+request.Kind, auditPayload, actor.Username, actor.UserID, actor.IP); err != nil {
			return err
		}
		confirmed, err := readProductionMaterialIssuanceWarehouseAllocationStateTx(tx, document.ID)
		if err != nil {
			return err
		}
		result, err = findProductionMaterialIssuanceWarehouseConfirmationResult(confirmed.Review, movement.ID)
		return err
	}, productionMaterialIssuanceSerializableTransactionOptions(database)...)
	if err != nil {
		return ProductionMaterialIssuanceWarehouseConfirmationResult{}, classifyProductionMaterialIssuanceDatabaseConflict(err)
	}
	return result, nil
}

func findProductionMaterialIssuanceWarehouseConfirmationResult(review ProductionMaterialIssuanceWarehouseReview, movementID string) (ProductionMaterialIssuanceWarehouseConfirmationResult, error) {
	for _, movement := range review.Movements {
		if movement.Movement.ID == movementID {
			return ProductionMaterialIssuanceWarehouseConfirmationResult{Document: review.Document, Movement: movement}, nil
		}
	}
	return ProductionMaterialIssuanceWarehouseConfirmationResult{}, fmt.Errorf("[CRITICAL] confirmed warehouse movement is missing from its document")
}
