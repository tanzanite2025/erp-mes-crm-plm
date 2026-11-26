package services

import (
	"sort"
	"strings"
	"time"
	"xdfc-server/models"
)

func selectApplicableProductionMaterialRequirementBOMs(boms []models.BOM, line models.SalesOrderLine, asOf time.Time) []models.BOM {
	candidates := make([]models.BOM, 0)
	if !hasValidProductionMaterialRequirementMBOMBranch(line) {
		return candidates
	}
	day := asOf.UTC().Format("2006-01-02")
	for _, bom := range boms {
		if !productionMaterialRequirementBOMMatchesSalesOrderLineBranch(bom, line) || bom.BOMType != models.BOMTypeMBOM || bom.Status != models.BOMStatusReleased || bom.DeletedAt.Valid {
			continue
		}
		if bom.EffectiveFrom != nil && bom.EffectiveFrom.UTC().Format("2006-01-02") > day {
			continue
		}
		if bom.EffectiveTo != nil && bom.EffectiveTo.UTC().Format("2006-01-02") < day {
			continue
		}
		candidates = append(candidates, bom)
	}
	sort.Slice(candidates, func(i, j int) bool {
		return candidates[i].ID < candidates[j].ID
	})
	return candidates
}

func hasValidProductionMaterialRequirementMBOMBranch(line models.SalesOrderLine) bool {
	if strings.TrimSpace(line.ProductID) == "" {
		return false
	}
	switch strings.ToUpper(strings.TrimSpace(line.BOMOwnerType)) {
	case "INTERNAL":
		return strings.TrimSpace(line.BOMOwnerCustomerID) == ""
	case "CUSTOMER":
		return strings.TrimSpace(line.BOMOwnerCustomerID) != ""
	default:
		return false
	}
}

func productionMaterialRequirementBOMMatchesSalesOrderLineBranch(bom models.BOM, line models.SalesOrderLine) bool {
	return strings.TrimSpace(bom.ProductID) == strings.TrimSpace(line.ProductID) &&
		strings.ToUpper(strings.TrimSpace(bom.OwnerType)) == strings.ToUpper(strings.TrimSpace(line.BOMOwnerType)) &&
		strings.TrimSpace(bom.OwnerCustomerID) == strings.TrimSpace(line.BOMOwnerCustomerID) &&
		strings.TrimSpace(bom.VersionLevel) == strings.TrimSpace(line.BOMVersionLevel)
}

func mapProductionMaterialRequirementBOMCandidate(bom models.BOM, option models.ProductAttributeOption) ProductionMaterialRequirementBOMCandidate {
	return ProductionMaterialRequirementBOMCandidate{
		ID: bom.ID, BOMNo: bom.BOMNo, Version: bom.Version, RevisionNo: bom.RevisionNo,
		BOMVersion: bom.VersionText, VersionLevel: bom.VersionLevel,
		VersionLevelLabelZh: defaultProductionMaterialRequirementDisplayText(option.LabelZh, bom.VersionLevel),
		VersionLevelLabelEn: defaultProductionMaterialRequirementDisplayText(option.LabelEn, defaultProductionMaterialRequirementDisplayText(option.LabelZh, bom.VersionLevel)),
		OwnerType:           bom.OwnerType, OwnerCustomerID: bom.OwnerCustomerID,
		MeasuredWeight: bom.MeasuredWeight, MeasuredWeightUnit: bom.MeasuredWeightUnit,
	}
}
