package productidentity

import (
	"fmt"
	"strings"
	"time"
	"xdfc-server/models"

	"gorm.io/gorm"
)

// BlankProductSKUPlan 描述一个待回填空 SKU 的产品计划。
//
// 思路 3 重构 (Step R7): SKU 公式简化为 typeCode-modelCode,VersionLevel 字段不再参与。
type BlankProductSKUPlan struct {
	ID         string
	Name       string
	TypeID     string
	TypeCode   string
	ModelCode  string
	DerivedSKU string
}

type blankProductCandidate struct {
	ID        string
	Name      string
	TypeID    string
	ModelCode string
}

type productTypeCodeRow struct {
	ID   string
	Code string
}

func PlanBlankProductSKUBackfill(database *gorm.DB) ([]BlankProductSKUPlan, error) {
	var candidates []blankProductCandidate
	if err := database.Table("products").
		Select("id", "name", "type_id", "model_code").
		Where("deleted_at IS NULL AND (sku IS NULL OR length(trim(sku)) = 0)").
		Order("created_at ASC, id ASC").
		Scan(&candidates).Error; err != nil {
		return nil, err
	}

	if len(candidates) == 0 {
		return []BlankProductSKUPlan{}, nil
	}

	typeIDs := make([]string, 0, len(candidates))
	for _, candidate := range candidates {
		typeIDs = append(typeIDs, strings.TrimSpace(candidate.TypeID))
	}

	var typeRows []productTypeCodeRow
	if err := database.Table("product_types").
		Select("id", "code").
		Where("id IN ?", typeIDs).
		Scan(&typeRows).Error; err != nil {
		return nil, err
	}
	typeCodeByID := make(map[string]string, len(typeRows))
	for _, row := range typeRows {
		typeCodeByID[row.ID] = row.Code
	}

	plans := make([]BlankProductSKUPlan, 0, len(candidates))
	planBySKU := make(map[string]BlankProductSKUPlan, len(candidates))
	blankIDs := make([]string, 0, len(candidates))
	for _, candidate := range candidates {
		typeCode := NormalizeTypeCode(typeCodeByID[strings.TrimSpace(candidate.TypeID)])
		if typeCode == "" {
			return nil, fmt.Errorf("product %s (%s) cannot backfill sku: product type %s has no code", candidate.ID, candidate.Name, candidate.TypeID)
		}

		derivedSKU := DeriveSKU(typeCode, candidate.ModelCode)
		if derivedSKU == "" {
			return nil, fmt.Errorf("product %s (%s) cannot backfill sku: derived sku is empty", candidate.ID, candidate.Name)
		}

		plan := BlankProductSKUPlan{
			ID:         candidate.ID,
			Name:       candidate.Name,
			TypeID:     candidate.TypeID,
			TypeCode:   typeCode,
			ModelCode:  NormalizeModelCode(candidate.ModelCode),
			DerivedSKU: derivedSKU,
		}

		if existing, exists := planBySKU[derivedSKU]; exists && existing.ID != plan.ID {
			return nil, fmt.Errorf(
				"blank sku backfill collision: products %s and %s both derive to %s",
				existing.ID,
				plan.ID,
				derivedSKU,
			)
		}
		planBySKU[derivedSKU] = plan
		plans = append(plans, plan)
		blankIDs = append(blankIDs, plan.ID)
	}

	derivedSKUs := make([]string, 0, len(plans))
	for _, plan := range plans {
		derivedSKUs = append(derivedSKUs, plan.DerivedSKU)
	}

	var conflictingProducts []models.Product
	if err := database.Select("id", "sku", "name").
		Where("deleted_at IS NULL AND sku IN ? AND id NOT IN ?", derivedSKUs, blankIDs).
		Find(&conflictingProducts).Error; err != nil {
		return nil, err
	}
	if len(conflictingProducts) > 0 {
		conflict := conflictingProducts[0]
		return nil, fmt.Errorf("blank sku backfill collision: derived sku %s already belongs to product %s (%s)", conflict.SKU, conflict.ID, conflict.Name)
	}

	return plans, nil
}

func ApplyBlankProductSKUBackfill(database *gorm.DB) ([]BlankProductSKUPlan, error) {
	plans, err := PlanBlankProductSKUBackfill(database)
	if err != nil {
		return nil, err
	}
	if len(plans) == 0 {
		return plans, nil
	}

	err = database.Transaction(func(tx *gorm.DB) error {
		for _, plan := range plans {
			if err := tx.Model(&models.Product{}).
				Where("id = ? AND deleted_at IS NULL AND (sku IS NULL OR length(trim(sku)) = 0)", plan.ID).
				Updates(map[string]any{
					"sku":        plan.DerivedSKU,
					"model_code": plan.ModelCode,
					"updated_at": time.Now(),
				}).Error; err != nil {
				return err
			}
		}
		return nil
	})
	if err != nil {
		return nil, err
	}

	return plans, nil
}
