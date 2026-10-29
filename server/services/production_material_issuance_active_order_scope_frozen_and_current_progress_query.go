package services

import (
	"context"
	"fmt"
	"strings"
	"time"
	"xdfc-server/models"

	"gorm.io/gorm"
)

// The complete scope is read in one consistent transaction before either view is paginated.
func QueryProductionMaterialIssuanceActiveOrderProgress(ctx context.Context, database *gorm.DB, query ProductionMaterialIssuanceActiveProgressQuery) (ProductionMaterialIssuanceActiveProgressResponse, error) {
	result := ProductionMaterialIssuanceActiveProgressResponse{
		AsOf: time.Now().UTC(), WarehouseCategoryCode: ProductionMaterialInventoryWarehouseCategoryCode,
		Materials: []ProductionMaterialIssuanceActiveMaterialProgress{}, OrderLines: []ProductionMaterialIssuanceActiveOrderLineProgress{},
		MaterialsPage: query.MaterialsPage, OrdersPage: query.OrdersPage, PageSize: query.PageSize,
	}
	if database == nil || query.PageSize < 1 || query.PageSize > 100 || query.MaterialsPage < 1 || query.OrdersPage < 1 || query.MaterialsPage-1 > int(^uint(0)>>1)/query.PageSize || query.OrdersPage-1 > int(^uint(0)>>1)/query.PageSize {
		return result, ErrProductionMaterialIssuanceInvalidRequest
	}
	err := database.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		orders, err := readProductionMaterialRequirementActiveOrders(tx)
		if err != nil {
			return err
		}
		var warehouse models.WarehouseCategory
		if err := tx.Where("code = ? AND is_system = ? AND active = ? AND allow_shipment = ?", ProductionMaterialInventoryWarehouseCategoryCode, true, true, true).First(&warehouse).Error; err != nil {
			return fmt.Errorf("[CRITICAL] production material warehouse is unavailable: %w", err)
		}
		lines, err := readProductionMaterialIssuanceFrozenAndCurrentActiveSourceProgressTx(tx, orders, result.AsOf)
		if err != nil {
			return err
		}
		result.Scope, result.Materials, err = aggregateProductionMaterialIssuanceActiveScopeProgress(lines)
		if err != nil {
			return err
		}
		result.Materials = paginateProductionMaterialIssuanceActiveProgress(result.Materials, query.MaterialsPage, query.PageSize)
		result.OrderLines = paginateProductionMaterialIssuanceActiveProgress(lines, query.OrdersPage, query.PageSize)
		return nil
	}, productionMaterialIssuanceConsistentReadOptions(database)...)
	return result, err
}

func readProductionMaterialIssuanceFrozenAndCurrentActiveSourceProgressTx(tx *gorm.DB, orders []models.SalesOrder, asOf time.Time) ([]ProductionMaterialIssuanceActiveOrderLineProgress, error) {
	result := []ProductionMaterialIssuanceActiveOrderLineProgress{}
	lineIDs := []uint{}
	for _, order := range orders {
		for _, line := range order.Lines {
			lineIDs = append(lineIDs, line.ID)
		}
	}
	if len(lineIDs) == 0 {
		return result, nil
	}
	var coverage []models.ProductionMaterialIssuanceActiveSourceCoverage
	if err := tx.Where("sales_order_line_id IN ?", lineIDs).Find(&coverage).Error; err != nil {
		return result, err
	}
	covered := make(map[uint]models.ProductionMaterialIssuanceActiveSourceCoverage)
	documentStates := make(map[string]productionMaterialIssuanceWarehouseAllocationState)
	for _, source := range coverage {
		covered[source.SalesOrderLineID] = source
		if _, exists := documentStates[source.DocumentID]; !exists {
			state, err := readProductionMaterialIssuanceWarehouseAllocationStateTx(tx, source.DocumentID)
			if err != nil {
				return result, err
			}
			if state.Review.Document.Status != models.ProductionMaterialIssuanceDispatched || state.Review.Document.WarehouseCategoryCode != ProductionMaterialInventoryWarehouseCategoryCode {
				return result, fmt.Errorf("[CRITICAL] active coverage references an inactive or invalid document")
			}
			documentStates[source.DocumentID] = state
		}
	}
	// Expand only uncovered lines, so a changed or removed current BOM cannot change a frozen basis.
	uncoveredOrders := []models.SalesOrder{}
	for _, order := range orders {
		uncovered := order
		uncovered.Lines = []models.SalesOrderLine{}
		for _, line := range order.Lines {
			if _, exists := covered[line.ID]; !exists {
				uncovered.Lines = append(uncovered.Lines, line)
			}
		}
		if len(uncovered.Lines) > 0 {
			uncoveredOrders = append(uncoveredOrders, uncovered)
		}
	}
	currentByLine := make(map[uint]ProductionMaterialRequirementSourceLine)
	materialByID := make(map[string]models.Material)
	if len(uncoveredOrders) > 0 {
		input, err := readProductionMaterialRequirementCurrentRecipeSnapshot(tx)
		if err != nil {
			return result, err
		}
		input.Orders, input.AsOf = uncoveredOrders, asOf
		expansion, err := ExpandProductionMaterialRequirements(input)
		if err != nil {
			return result, err
		}
		for _, source := range expansion.SourceLines {
			currentByLine[source.SalesOrderLineID] = source
		}
		for _, material := range input.Materials {
			materialByID[material.ID] = material
		}
	}
	for _, order := range orders {
		for _, line := range order.Lines {
			row := ProductionMaterialIssuanceActiveOrderLineProgress{
				SalesOrderID: order.ID, SalesOrderLineID: line.ID, OrderNo: order.OrderNo, LineNo: line.LineNo, CustomerName: order.CustomerName,
				ProductName: line.ProductModel, FinishedQty: line.Qty, FinishedUnit: line.UOM, Materials: []ProductionMaterialIssuanceSourceMaterialProgress{},
			}
			if source, exists := covered[line.ID]; exists {
				state := documentStates[source.DocumentID]
				if source.SalesOrderID != order.ID {
					return result, fmt.Errorf("[CRITICAL] active coverage order identity disagrees")
				}
				for _, basis := range state.Sources {
					if basis.SalesOrderLineID == line.ID {
						if basis.SalesOrderID != order.ID || basis.ProductID != line.ProductID || basis.FinishedQty != line.Qty || !strings.EqualFold(basis.FinishedUnit, line.UOM) {
							return result, fmt.Errorf("[CRITICAL] active coverage frozen source identity disagrees")
						}
						row.BOM = &basis.BOM
						row.ProductName, row.CustomerName = basis.ProductName, basis.CustomerName
					}
				}
				if row.BOM == nil {
					return result, fmt.Errorf("[CRITICAL] covered source is absent from its frozen document")
				}
				row.DocumentID, row.DocumentNo = source.DocumentID, state.Review.Document.DocumentNo
				for _, progress := range state.Review.SourceMaterials {
					if progress.SalesOrderLineID == line.ID {
						if progress.SourceSnapshotID != source.SourceSnapshotID {
							return result, fmt.Errorf("[CRITICAL] covered source snapshot disagrees with allocation progress")
						}
						row.Materials = append(row.Materials, progress)
					}
				}
				if len(row.Materials) == 0 {
					return result, fmt.Errorf("[CRITICAL] active frozen source has no material requirements")
				}
			} else {
				source, exists := currentByLine[line.ID]
				if !exists {
					return result, fmt.Errorf("[CRITICAL] active source is missing from requirement expansion")
				}
				row.BOM, row.IssueCode, row.ProductName = source.BOM, source.IssueCode, source.ProductName
				if strings.TrimSpace(line.UOM) == "" {
					row.IssueCode = "INVALID_SOURCE_LINE"
				}
				if row.IssueCode == "" {
					row.Materials = groupProductionMaterialIssuanceCurrentSourceContributions(source, materialByID)
				}
			}
			result = append(result, row)
		}
	}
	return result, nil
}
