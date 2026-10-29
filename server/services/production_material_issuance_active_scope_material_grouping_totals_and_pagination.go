package services

import (
	"fmt"
	"sort"
	"strings"
	"xdfc-server/models"
)

func groupProductionMaterialIssuanceCurrentSourceContributions(source ProductionMaterialRequirementSourceLine, materials map[string]models.Material) []ProductionMaterialIssuanceSourceMaterialProgress {
	rows := []ProductionMaterialIssuanceSourceMaterialProgress{}
	positions := make(map[string]int)
	for _, contribution := range source.Contributions {
		index, exists := positions[contribution.MaterialID]
		if !exists {
			index = len(rows)
			positions[contribution.MaterialID] = index
			material := materials[contribution.MaterialID]
			rows = append(rows, ProductionMaterialIssuanceSourceMaterialProgress{SalesOrderLineID: source.SalesOrderLineID, Position: source.LineNo, MaterialID: material.ID, MaterialCode: material.Code, MaterialName: material.Name, Unit: contribution.Unit})
		}
		rows[index].StandardQty += contribution.RequiredQty
		rows[index].RemainingQty += contribution.RequiredQty
	}
	return rows
}

func aggregateProductionMaterialIssuanceActiveScopeProgress(lines []ProductionMaterialIssuanceActiveOrderLineProgress) (ProductionMaterialIssuanceActiveProgressScope, []ProductionMaterialIssuanceActiveMaterialProgress, error) {
	scope := ProductionMaterialIssuanceActiveProgressScope{SourceLineCount: len(lines), IsComplete: true}
	totals := make(map[string]ProductionMaterialIssuanceActiveMaterialProgress)
	orders := make(map[string]bool)
	for _, line := range lines {
		orders[line.SalesOrderID] = true
		if line.DocumentID == "" {
			scope.UndispatchedLineCount++
		} else {
			scope.DispatchedLineCount++
		}
		if line.IssueCode != "" {
			scope.IssueLineCount++
			scope.IsComplete = false
			continue
		}
		for _, material := range line.Materials {
			total := totals[material.MaterialID]
			if total.Unit != "" && !strings.EqualFold(total.Unit, material.Unit) {
				return scope, nil, fmt.Errorf("[CRITICAL] material units disagree across active requirement bases")
			}
			if total.MaterialID == "" {
				total.MaterialID, total.MaterialCode, total.MaterialName, total.Unit = material.MaterialID, material.MaterialCode, material.MaterialName, material.Unit
			}
			total.SourceLineCount++
			total.StandardQty += material.StandardQty
			total.IssuedQty += material.IssuedQty
			total.ReturnedQty += material.ReturnedQty
			total.NetQty += material.NetQty
			total.RemainingQty += material.RemainingQty
			total.ExcessQty += material.ExcessQty
			for _, quantity := range []float64{total.StandardQty, total.IssuedQty, total.ReturnedQty, total.NetQty, total.RemainingQty, total.ExcessQty} {
				if !isFiniteProductionMaterialRequirementQuantity(quantity) || quantity < 0 {
					return scope, nil, fmt.Errorf("[CRITICAL] active production material progress exceeds supported range")
				}
			}
			totals[material.MaterialID] = total
		}
	}
	result := make([]ProductionMaterialIssuanceActiveMaterialProgress, 0, len(totals))
	for _, total := range totals {
		result = append(result, total)
	}
	sort.Slice(result, func(i, j int) bool { return result[i].MaterialID < result[j].MaterialID })
	scope.ActiveOrderCount, scope.MaterialCount = len(orders), len(totals)
	return scope, result, nil
}

func paginateProductionMaterialIssuanceActiveProgress[T any](rows []T, page, pageSize int) []T {
	start := (page - 1) * pageSize
	if start >= len(rows) {
		return []T{}
	}
	end := start + pageSize
	if end > len(rows) || end < start {
		end = len(rows)
	}
	return rows[start:end]
}
