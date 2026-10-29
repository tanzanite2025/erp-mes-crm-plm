package services

import (
	"fmt"
	"math"
	"strconv"
	"strings"
	"xdfc-server/models"
)

// ExpandProductionMaterialRequirements reads caller-provided snapshots only; it never writes business facts.
func ExpandProductionMaterialRequirements(input ProductionMaterialRequirementExpansionInput) (ProductionMaterialRequirementExpansion, error) {
	result := ProductionMaterialRequirementExpansion{SourceLines: make([]ProductionMaterialRequirementSourceLine, 0), IsComplete: true}
	selected := make(map[string]bool)
	for _, rawKey := range input.SelectedKeys {
		key := strings.TrimSpace(rawKey)
		separator := strings.LastIndex(key, "-")
		if separator < 1 {
			return result, fmt.Errorf("%w: malformed order-line key", ErrInvalidProductionMaterialRequirementSelection)
		}
		lineNo, err := strconv.Atoi(key[separator+1:])
		if err != nil || lineNo < 1 {
			return result, fmt.Errorf("%w: invalid order-line number", ErrInvalidProductionMaterialRequirementSelection)
		}
		selected[key] = false
	}
	choices := make(map[string]string)
	for _, choice := range input.BOMSelections {
		key := fmt.Sprintf("%s/%d", choice.SalesOrderID, choice.SalesOrderLineID)
		if choice.SalesOrderID == "" || choice.SalesOrderLineID == 0 || choice.BOMID == "" || choices[key] != "" {
			return result, fmt.Errorf("%w: invalid or duplicate BOM choice", ErrInvalidProductionMaterialRequirementSelection)
		}
		choices[key] = choice.BOMID
	}
	materials := make(map[string]models.Material, len(input.Materials))
	for _, material := range input.Materials {
		materials[material.ID] = material
	}
	versionOptions := make(map[string]models.ProductAttributeOption)
	for _, option := range input.PerformanceVersionOptions {
		versionOptions[option.Value] = option
	}
	for _, order := range input.Orders {
		for _, line := range order.Lines {
			selectionKey := fmt.Sprintf("%s-%d", order.OrderNo, line.LineNo)
			if len(selected) > 0 {
				if _, found := selected[selectionKey]; !found {
					continue
				}
				selected[selectionKey] = true
			}
			source := ProductionMaterialRequirementSourceLine{
				SalesOrderID: order.ID, SalesOrderLineID: line.ID, OrderVersion: order.Version,
				OrderNo: order.OrderNo, LineNo: line.LineNo, TotalLines: len(order.Lines), CustomerID: order.CustomerID,
				CustomerName: order.CustomerName, ProductID: line.ProductID, ProductModel: line.ProductModel, ProductName: line.ProductModel, FinishedQty: line.Qty,
				BOMCandidates: make([]ProductionMaterialRequirementBOMCandidate, 0), Contributions: make([]ProductionMaterialRequirementContribution, 0),
			}
			if !isFiniteProductionMaterialRequirementQuantity(line.Qty) {
				return result, fmt.Errorf("[CRITICAL] nonfinite finished quantity for order %s line %d", order.OrderNo, line.LineNo)
			}
			candidates := selectApplicableProductionMaterialRequirementBOMs(input.BOMs, line.ProductID, order.CustomerID, input.AsOf)
			for _, candidate := range candidates {
				if !isFiniteProductionMaterialRequirementQuantity(candidate.MeasuredWeight) || candidate.MeasuredWeight < 0 {
					return result, fmt.Errorf("[CRITICAL] invalid finished weight for BOM %s", candidate.BOMNo)
				}
				source.BOMCandidates = append(source.BOMCandidates, mapProductionMaterialRequirementBOMCandidate(candidate, versionOptions[candidate.VersionLevel]))
			}
			choiceKey := fmt.Sprintf("%s/%d", order.ID, line.ID)
			chosenID := choices[choiceKey]
			delete(choices, choiceKey)
			var chosen *models.BOM
			if chosenID != "" {
				for index := range candidates {
					if candidates[index].ID == chosenID {
						chosen = &candidates[index]
					}
				}
				if chosen == nil {
					source.IssueCode = "BOM_SELECTION_CHANGED"
				}
			} else if len(candidates) == 1 {
				chosen = &candidates[0]
			} else if len(candidates) == 0 {
				source.IssueCode = "MISSING_BOM"
			} else {
				source.IssueCode = "BOM_SELECTION_REQUIRED"
			}
			if order.ID == "" || line.ID == 0 || line.ProductID == "" || !isFiniteProductionMaterialRequirementQuantity(line.Qty) || line.Qty <= 0 {
				source.IssueCode = "INVALID_SOURCE_LINE"
			}
			if chosen != nil && source.IssueCode == "" {
				basis := mapProductionMaterialRequirementBOMCandidate(*chosen, versionOptions[chosen.VersionLevel])
				source.BOM = &basis
				for _, product := range input.Products {
					if product.ID == line.ProductID {
						source.ProductName = formatProductionMaterialRequirementProductName(product, chosen, line.ProductModel)
						break
					}
				}
				for _, item := range chosen.Items {
					material, exists := materials[item.MaterialID]
					if !exists || material.DeletedAt.Valid || !strings.EqualFold(material.Status, "Active") {
						source.IssueCode = "INVALID_MATERIAL"
						break
					}
					if strings.TrimSpace(material.UOM) == "" || !strings.EqualFold(strings.TrimSpace(material.UOM), strings.TrimSpace(item.Unit)) {
						source.IssueCode = "MATERIAL_UNIT_MISMATCH"
						break
					}
					quantity := line.Qty * item.StandardUsage
					if item.ID == "" || !isFiniteProductionMaterialRequirementQuantity(item.StandardUsage) || item.StandardUsage < 0 || !isFiniteProductionMaterialRequirementQuantity(quantity) {
						source.IssueCode = "INVALID_STANDARD_USAGE"
						break
					}
					source.Contributions = append(source.Contributions, ProductionMaterialRequirementContribution{
						BOMItemID: item.ID, MaterialID: material.ID, Section: defaultProductionMaterialRequirementDisplayText(item.Section, "其他"),
						Unit: material.UOM, StandardUsage: item.StandardUsage, RequiredQty: quantity,
					})
				}
				positiveUsage := false
				for _, contribution := range source.Contributions {
					positiveUsage = positiveUsage || contribution.RequiredQty > 0
				}
				if source.IssueCode == "" && !positiveUsage {
					source.IssueCode = "EMPTY_BOM_REQUIREMENT"
				}
			}
			if source.IssueCode != "" {
				result.IsComplete = false
				source.Contributions = make([]ProductionMaterialRequirementContribution, 0)
			}
			result.SourceLines = append(result.SourceLines, source)
		}
	}
	for key, matched := range selected {
		if !matched {
			return result, fmt.Errorf("%w: selected order line is unavailable: %s", ErrInvalidProductionMaterialRequirementSelection, key)
		}
	}
	if len(choices) > 0 {
		return result, fmt.Errorf("%w: BOM choice is outside the selected order scope", ErrInvalidProductionMaterialRequirementSelection)
	}
	return result, nil
}

func isFiniteProductionMaterialRequirementQuantity(value float64) bool {
	return !math.IsNaN(value) && !math.IsInf(value, 0)
}
