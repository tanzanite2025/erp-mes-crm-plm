package services

import (
	"fmt"
	"gorm.io/gorm"
	"sort"
	"time"
	"xdfc-server/db"
	"xdfc-server/models"
)

func GetMrpRequirements(params GetMrpRequirementsParams) (MrpRequirementsResponse, error) {
	return queryMRPRequirementsFromSharedProductionMaterialBasis(db.DB, params, time.Now().UTC())
}

func queryMRPRequirementsFromSharedProductionMaterialBasis(database *gorm.DB, params GetMrpRequirementsParams, asOf time.Time) (MrpRequirementsResponse, error) {
	response := MrpRequirementsResponse{Requirements: make([]MrpRequirementItem, 0), WarehouseCategoryCode: ProductionMaterialInventoryWarehouseCategoryCode}
	var warehouse models.WarehouseCategory
	if err := database.Where("code = ? AND is_system = ? AND active = ? AND allow_shipment = ?", ProductionMaterialInventoryWarehouseCategoryCode, true, true, true).First(&warehouse).Error; err != nil {
		return response, fmt.Errorf("[CRITICAL] production material warehouse is unavailable: %w", err)
	}
	orders, err := readProductionMaterialRequirementActiveOrders(database)
	if err != nil {
		return response, err
	}
	input, err := readProductionMaterialRequirementCurrentRecipeSnapshot(database)
	if err != nil {
		return response, err
	}
	input.Orders, input.SelectedKeys, input.BOMSelections, input.AsOf = orders, params.SelectedKeys, params.BOMSelections, asOf
	expansion, err := ExpandProductionMaterialRequirements(input)
	if err != nil {
		return response, err
	}
	response.SourceLines = expansion.SourceLines
	response.IsComplete = expansion.IsComplete
	response.Stats, err = buildMRPRequirementStatsFromSourceLines(expansion.SourceLines)
	if err != nil {
		return response, err
	}
	if !expansion.IsComplete {
		return response, nil
	}
	materialIDSet := make(map[string]bool)
	materialIDs := make([]string, 0)
	for _, source := range expansion.SourceLines {
		for _, contribution := range source.Contributions {
			if !materialIDSet[contribution.MaterialID] {
				materialIDSet[contribution.MaterialID] = true
				materialIDs = append(materialIDs, contribution.MaterialID)
			}
		}
	}
	stock, err := QueryMaterialInventoryAvailability(database, materialIDs, []string{ProductionMaterialInventoryWarehouseCategoryCode})
	if err != nil {
		return response, err
	}
	var rules []models.PackagingRule
	if len(materialIDs) > 0 {
		if err := database.Where("material_id IN ?", materialIDs).Find(&rules).Error; err != nil {
			return response, err
		}
	}
	response.Requirements, err = ProjectMRPRequirementsFromExpandedSources(expansion, input.Materials, stock, rules)
	response.Stats.TotalMaterials = len(materialIDs)
	return response, err
}

func buildMRPRequirementStatsFromSourceLines(sources []ProductionMaterialRequirementSourceLine) (MrpRequirementStats, error) {
	stats := MrpRequirementStats{AnalyzedModels: make([]MrpAnalyzedModel, 0)}
	orders := make(map[string]bool)
	missing := make(map[string]bool)
	modelQuantities := make(map[string]float64)
	for _, source := range sources {
		orders[source.SalesOrderID] = true
		modelQuantities[source.ProductModel] += source.FinishedQty
		if !isFiniteProductionMaterialRequirementQuantity(modelQuantities[source.ProductModel]) {
			return stats, fmt.Errorf("[CRITICAL] aggregate finished quantity exceeds supported range for model %s", source.ProductModel)
		}
		if source.IssueCode == "MISSING_BOM" {
			missing[source.ProductID] = true
		}
	}
	stats.ActiveOrderCount = len(orders)
	stats.MissingBOMCount = len(missing)
	for name, quantity := range modelQuantities {
		stats.AnalyzedModels = append(stats.AnalyzedModels, MrpAnalyzedModel{ModelName: name, TotalQty: quantity})
	}
	sort.Slice(stats.AnalyzedModels, func(i, j int) bool { return stats.AnalyzedModels[i].ModelName < stats.AnalyzedModels[j].ModelName })
	return stats, nil
}
