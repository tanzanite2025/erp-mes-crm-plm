package services

import (
	"sort"
	"strings"
	"time"
	"xdfc-server/models"
)

func selectApplicableProductionMaterialRequirementBOMs(boms []models.BOM, productID, customerID string, asOf time.Time) []models.BOM {
	internal := make([]models.BOM, 0)
	customer := make([]models.BOM, 0)
	day := asOf.UTC().Format("2006-01-02")
	for _, bom := range boms {
		if bom.ProductID != productID || bom.BOMType != models.BOMTypeMBOM || bom.Status != models.BOMStatusReleased || bom.DeletedAt.Valid {
			continue
		}
		if bom.EffectiveFrom != nil && bom.EffectiveFrom.UTC().Format("2006-01-02") > day {
			continue
		}
		if bom.EffectiveTo != nil && bom.EffectiveTo.UTC().Format("2006-01-02") < day {
			continue
		}
		switch strings.TrimSpace(bom.OwnerType) {
		case "CUSTOMER":
			if customerID != "" && bom.OwnerCustomerID == customerID {
				customer = append(customer, bom)
			}
		case "", "INTERNAL":
			internal = append(internal, bom)
		}
	}
	candidates := internal
	if len(customer) > 0 {
		candidates = customer
	}
	sort.Slice(candidates, func(i, j int) bool {
		if candidates[i].VersionLevel != candidates[j].VersionLevel {
			return candidates[i].VersionLevel < candidates[j].VersionLevel
		}
		return candidates[i].ID < candidates[j].ID
	})
	return candidates
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
