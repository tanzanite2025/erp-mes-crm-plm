package services

import (
	"fmt"
	"math"
	"sort"
	"strings"
	"xdfc-server/models"
)

// ProjectMRPRequirementsFromExpandedSources preserves display groups while allocating each stock pool once.
func ProjectMRPRequirementsFromExpandedSources(expansion ProductionMaterialRequirementExpansion, materials []models.Material, stock map[string]MaterialInventoryAvailability, rules []models.PackagingRule) ([]MrpRequirementItem, error) {
	requirements := make([]MrpRequirementItem, 0)
	if !expansion.IsComplete {
		return requirements, nil
	}
	materialByID := make(map[string]models.Material)
	for _, material := range materials {
		materialByID[material.ID] = material
	}
	grouped := make(map[string]*MrpRequirementItem)
	for _, source := range expansion.SourceLines {
		for _, contribution := range source.Contributions {
			key := contribution.MaterialID + "\x00" + contribution.Section
			item := grouped[key]
			if item == nil {
				material := materialByID[contribution.MaterialID]
				availability := stock[material.ID]
				if availability.Unit != "" && !strings.EqualFold(availability.Unit, contribution.Unit) {
					return nil, fmt.Errorf("[CRITICAL] BOM and inventory units disagree for material %s", material.Code)
				}
				item = &MrpRequirementItem{
					MaterialID: material.ID, MaterialCode: strings.ToUpper(material.Code), MaterialName: material.Name,
					MaterialSpec: material.Spec, Section: contribution.Section, Unit: contribution.Unit,
					InventoryQty: availability.InventoryQty, LockedQty: availability.ReservedQty, UsableStock: availability.AvailableQty,
					SourceOrders: make([]MrpRequirementSourceOrder, 0), HasBOM: true,
				}
				grouped[key] = item
			}
			if source.BOM == nil || materialByID[contribution.MaterialID].ID == "" {
				return nil, fmt.Errorf("[CRITICAL] complete requirement basis is missing a BOM or material")
			}
			item.TotalRequired += contribution.RequiredQty
			if !isFiniteProductionMaterialRequirementQuantity(item.TotalRequired) {
				return nil, fmt.Errorf("[CRITICAL] aggregate demand exceeds supported range for material %s", contribution.MaterialID)
			}
			found := -1
			for index, existing := range item.SourceOrders {
				if existing.SalesOrderID == source.SalesOrderID && existing.SalesOrderLineID == source.SalesOrderLineID {
					found = index
					break
				}
			}
			if found < 0 {
				item.SourceOrders = append(item.SourceOrders, MrpRequirementSourceOrder{
					OrderNo: source.OrderNo, CustomerName: source.CustomerName, Qty: source.FinishedQty, ProductName: source.ProductName,
					LineNo: source.LineNo, TotalLines: source.TotalLines, SalesOrderID: source.SalesOrderID, SalesOrderLineID: source.SalesOrderLineID,
					OrderVersion: source.OrderVersion, BOMID: source.BOM.ID, BOMVersion: source.BOM.Version, RevisionNo: source.BOM.RevisionNo,
					VersionLevel: source.BOM.VersionLevel, BOMItemIDs: make([]string, 0),
				})
				found = len(item.SourceOrders) - 1
			}
			item.SourceOrders[found].BOMItemIDs = append(item.SourceOrders[found].BOMItemIDs, contribution.BOMItemID)
			item.SourceOrders[found].StandardUsage += contribution.StandardUsage
			item.SourceOrders[found].RequiredQty += contribution.RequiredQty
			if !isFiniteProductionMaterialRequirementQuantity(item.SourceOrders[found].StandardUsage) || !isFiniteProductionMaterialRequirementQuantity(item.SourceOrders[found].RequiredQty) {
				return nil, fmt.Errorf("[CRITICAL] aggregate source usage exceeds supported range for material %s", contribution.MaterialID)
			}
		}
	}
	for _, item := range grouped {
		requirements = append(requirements, *item)
	}
	// Deterministic preview order does not reserve stock or set warehouse issue priority.
	sort.Slice(requirements, func(i, j int) bool {
		if requirements[i].Section != requirements[j].Section {
			return requirements[i].Section < requirements[j].Section
		}
		return requirements[i].MaterialID < requirements[j].MaterialID
	})
	remainingAvailable := make(map[string]float64)
	remainingPhysical := make(map[string]float64)
	for materialID, availability := range stock {
		remainingAvailable[materialID] = availability.AvailableQty
		remainingPhysical[materialID] = availability.InventoryQty
	}
	for index := range requirements {
		item := &requirements[index]
		item.AllocatedStockQty = math.Min(item.TotalRequired, math.Max(0, remainingAvailable[item.MaterialID]))
		remainingAvailable[item.MaterialID] -= item.AllocatedStockQty
		physicalAllocation := math.Min(item.TotalRequired, math.Max(0, remainingPhysical[item.MaterialID]))
		remainingPhysical[item.MaterialID] -= physicalAllocation
		item.TotalSupply = item.AllocatedStockQty
		item.EffectiveGap = math.Max(0, item.TotalRequired-item.TotalSupply)
		item.ShortageGap = math.Max(0, item.TotalRequired-physicalAllocation)
		for _, rule := range rules {
			if rule.MaterialID != item.MaterialID {
				continue
			}
			if !isFiniteProductionMaterialRequirementQuantity(rule.ConversionFactor) || rule.ConversionFactor <= 0 ||
				!strings.EqualFold(strings.TrimSpace(rule.BaseUnit), strings.TrimSpace(item.Unit)) || strings.TrimSpace(rule.PackUnit) == "" ||
				(rule.Direction != "forward" && rule.Direction != "reverse") {
				return nil, fmt.Errorf("[CRITICAL] invalid packaging rule or base unit for material %s", item.MaterialCode)
			}
			packQuantity := item.TotalRequired / rule.ConversionFactor
			if rule.Direction == "reverse" {
				packQuantity = item.TotalRequired * rule.ConversionFactor
			}
			if !isFiniteProductionMaterialRequirementQuantity(packQuantity) || packQuantity >= float64(math.MaxInt) {
				return nil, fmt.Errorf("[CRITICAL] packaging quantity exceeds supported range for material %s", item.MaterialCode)
			}
			item.Packaging = &MrpRequirementPackaging{PackUnit: rule.PackUnit, Factor: rule.ConversionFactor, PackQty: int(math.Ceil(packQuantity)), Direction: rule.Direction}
			break
		}
	}
	return requirements, nil
}
