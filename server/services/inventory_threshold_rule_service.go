package services

import (
	"errors"
	"strings"
	"xdfc-server/db"
	"xdfc-server/models"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

const (
	InventoryThresholdTargetMaterial = "MATERIAL"
	InventoryThresholdTargetBOM      = "BOM"
)

var (
	ErrInventoryThresholdRuleNotFound          = errors.New("inventory threshold rule not found")
	ErrInventoryThresholdRuleDuplicateTarget   = errors.New("inventory threshold rule target already exists")
	ErrInventoryThresholdRuleInvalidTarget     = errors.New("inventory threshold rule target is invalid")
	ErrInventoryThresholdRuleInvalidTargetType = errors.New("inventory threshold rule target type is invalid")
	ErrInventoryThresholdRuleInvalidThreshold  = errors.New("inventory threshold rule threshold qty must be non-negative")
)

type InventoryThresholdRuleWriteInput struct {
	TargetType   string
	MaterialID   *string
	BOMID        *string
	ThresholdQty float64
	Enabled      bool
	Notes        string
}

type InventoryThresholdMaterialOption struct {
	ID       string `json:"id"`
	Code     string `json:"code"`
	Name     string `json:"name"`
	Category string `json:"category"`
	Spec     string `json:"spec"`
	UOM      string `json:"uom"`
	Status   string `json:"status"`
}

type InventoryThresholdBOMOption struct {
	ID          string `json:"id"`
	BOMNo       string `json:"bomNo"`
	ProductID   string `json:"productId"`
	ProductName string `json:"productName"`
	ProductSKU  string `json:"productSku"`
	Status      string `json:"status"`
}

type normalizedInventoryThresholdRuleInput struct {
	TargetType         string
	MaterialID         *string
	BOMID              *string
	ThresholdQty       float64
	Enabled            bool
	Notes              string
	TargetNameSnapshot string
	TargetCodeSnapshot string
}

func ListInventoryThresholdRules() ([]models.InventoryThresholdRule, error) {
	var items []models.InventoryThresholdRule
	if err := db.DB.
		Order("enabled desc").
		Order("target_type asc").
		Order("updated_at desc").
		Find(&items).Error; err != nil {
		return nil, err
	}
	return items, nil
}

func ListInventoryThresholdTargetOptions() ([]InventoryThresholdMaterialOption, []InventoryThresholdBOMOption, error) {
	var materials []InventoryThresholdMaterialOption
	if err := db.DB.Model(&models.Material{}).
		Order("code asc").
		Select("id, code, name, category, spec, uom, status").
		Find(&materials).Error; err != nil {
		return nil, nil, err
	}

	var boms []models.BOM
	if err := db.DB.
		Preload("Product").
		Order("bom_no asc").
		Find(&boms).Error; err != nil {
		return nil, nil, err
	}

	bomOptions := make([]InventoryThresholdBOMOption, 0, len(boms))
	for _, bom := range boms {
		productName := ""
		productSKU := ""
		if bom.Product != nil {
			productName = strings.TrimSpace(bom.Product.Name)
			productSKU = strings.TrimSpace(bom.Product.SKU)
		}
		bomOptions = append(bomOptions, InventoryThresholdBOMOption{
			ID:          bom.ID,
			BOMNo:       strings.TrimSpace(bom.BOMNo),
			ProductID:   bom.ProductID,
			ProductName: productName,
			ProductSKU:  productSKU,
			Status:      strings.TrimSpace(bom.Status),
		})
	}

	return materials, bomOptions, nil
}

func CreateInventoryThresholdRule(input InventoryThresholdRuleWriteInput) (models.InventoryThresholdRule, error) {
	return saveInventoryThresholdRule("", input)
}

func UpdateInventoryThresholdRule(id string, input InventoryThresholdRuleWriteInput) (models.InventoryThresholdRule, error) {
	trimmedID := strings.TrimSpace(id)
	if trimmedID == "" {
		return models.InventoryThresholdRule{}, ErrInventoryThresholdRuleNotFound
	}
	return saveInventoryThresholdRule(trimmedID, input)
}

func DeleteInventoryThresholdRule(id string) error {
	trimmedID := strings.TrimSpace(id)
	if trimmedID == "" {
		return ErrInventoryThresholdRuleNotFound
	}

	return db.DB.Transaction(func(tx *gorm.DB) error {
		var rule models.InventoryThresholdRule
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&rule, "id = ?", trimmedID).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return ErrInventoryThresholdRuleNotFound
			}
			return err
		}

		var oldMaterialID string
		if rule.MaterialID != nil {
			oldMaterialID = strings.TrimSpace(*rule.MaterialID)
		}

		if err := tx.Delete(&rule).Error; err != nil {
			return err
		}

		if oldMaterialID != "" {
			return syncMaterialThresholdProjectionTx(tx, oldMaterialID)
		}

		return nil
	})
}

func saveInventoryThresholdRule(id string, input InventoryThresholdRuleWriteInput) (models.InventoryThresholdRule, error) {
	var updated models.InventoryThresholdRule

	err := db.DB.Transaction(func(tx *gorm.DB) error {
		var existing models.InventoryThresholdRule
		oldMaterialID := ""

		if id != "" {
			if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&existing, "id = ?", id).Error; err != nil {
				if errors.Is(err, gorm.ErrRecordNotFound) {
					return ErrInventoryThresholdRuleNotFound
				}
				return err
			}
			if existing.MaterialID != nil {
				oldMaterialID = strings.TrimSpace(*existing.MaterialID)
			}
		}

		normalized, err := normalizeInventoryThresholdRuleInputTx(tx, input)
		if err != nil {
			return err
		}
		if err := ensureInventoryThresholdRuleTargetUniqueTx(tx, id, normalized); err != nil {
			return err
		}

		if id == "" {
			rule := models.InventoryThresholdRule{
				TargetType:         normalized.TargetType,
				MaterialID:         normalized.MaterialID,
				BOMID:              normalized.BOMID,
				TargetNameSnapshot: normalized.TargetNameSnapshot,
				TargetCodeSnapshot: normalized.TargetCodeSnapshot,
				ThresholdQty:       normalized.ThresholdQty,
				Enabled:            normalized.Enabled,
				Notes:              normalized.Notes,
			}
			if err := tx.Create(&rule).Error; err != nil {
				return err
			}
			updated = rule
		} else {
			updates := map[string]any{
				"target_type":          normalized.TargetType,
				"material_id":          normalized.MaterialID,
				"bom_id":               normalized.BOMID,
				"target_name_snapshot": normalized.TargetNameSnapshot,
				"target_code_snapshot": normalized.TargetCodeSnapshot,
				"threshold_qty":        normalized.ThresholdQty,
				"enabled":              normalized.Enabled,
				"notes":                normalized.Notes,
			}
			if err := tx.Model(&existing).Updates(updates).Error; err != nil {
				return err
			}
			if err := tx.First(&updated, "id = ?", id).Error; err != nil {
				return err
			}
		}

		newMaterialID := ""
		if normalized.MaterialID != nil {
			newMaterialID = strings.TrimSpace(*normalized.MaterialID)
		}

		if oldMaterialID != "" && oldMaterialID != newMaterialID {
			if err := syncMaterialThresholdProjectionTx(tx, oldMaterialID); err != nil {
				return err
			}
		}
		if newMaterialID != "" {
			if err := syncMaterialThresholdProjectionTx(tx, newMaterialID); err != nil {
				return err
			}
		}

		return nil
	})

	if err != nil {
		return models.InventoryThresholdRule{}, err
	}

	return updated, nil
}

func normalizeInventoryThresholdRuleInputTx(tx *gorm.DB, input InventoryThresholdRuleWriteInput) (normalizedInventoryThresholdRuleInput, error) {
	targetType := strings.ToUpper(strings.TrimSpace(input.TargetType))
	if input.ThresholdQty < 0 {
		return normalizedInventoryThresholdRuleInput{}, ErrInventoryThresholdRuleInvalidThreshold
	}

	notes := strings.TrimSpace(input.Notes)

	switch targetType {
	case InventoryThresholdTargetMaterial:
		materialID := normalizeOptionalID(input.MaterialID)
		if materialID == nil {
			return normalizedInventoryThresholdRuleInput{}, ErrInventoryThresholdRuleInvalidTarget
		}

		var material models.Material
		if err := tx.Select("id, code, name").First(&material, "id = ?", *materialID).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return normalizedInventoryThresholdRuleInput{}, ErrInventoryThresholdRuleInvalidTarget
			}
			return normalizedInventoryThresholdRuleInput{}, err
		}

		return normalizedInventoryThresholdRuleInput{
			TargetType:         InventoryThresholdTargetMaterial,
			MaterialID:         materialID,
			BOMID:              nil,
			ThresholdQty:       input.ThresholdQty,
			Enabled:            input.Enabled,
			Notes:              notes,
			TargetNameSnapshot: strings.TrimSpace(material.Name),
			TargetCodeSnapshot: strings.TrimSpace(material.Code),
		}, nil
	case InventoryThresholdTargetBOM:
		bomID := normalizeOptionalID(input.BOMID)
		if bomID == nil {
			return normalizedInventoryThresholdRuleInput{}, ErrInventoryThresholdRuleInvalidTarget
		}

		var bom models.BOM
		if err := tx.Preload("Product").First(&bom, "id = ?", *bomID).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return normalizedInventoryThresholdRuleInput{}, ErrInventoryThresholdRuleInvalidTarget
			}
			return normalizedInventoryThresholdRuleInput{}, err
		}

		targetNameSnapshot := strings.TrimSpace(bom.BOMNo)
		if bom.Product != nil && strings.TrimSpace(bom.Product.Name) != "" {
			targetNameSnapshot = strings.TrimSpace(bom.Product.Name)
		}

		return normalizedInventoryThresholdRuleInput{
			TargetType:         InventoryThresholdTargetBOM,
			MaterialID:         nil,
			BOMID:              bomID,
			ThresholdQty:       input.ThresholdQty,
			Enabled:            input.Enabled,
			Notes:              notes,
			TargetNameSnapshot: targetNameSnapshot,
			TargetCodeSnapshot: strings.TrimSpace(bom.BOMNo),
		}, nil
	default:
		return normalizedInventoryThresholdRuleInput{}, ErrInventoryThresholdRuleInvalidTargetType
	}
}

func ensureInventoryThresholdRuleTargetUniqueTx(tx *gorm.DB, currentID string, input normalizedInventoryThresholdRuleInput) error {
	query := tx.Model(&models.InventoryThresholdRule{})
	if currentID != "" {
		query = query.Where("id <> ?", currentID)
	}

	switch input.TargetType {
	case InventoryThresholdTargetMaterial:
		if input.MaterialID == nil {
			return ErrInventoryThresholdRuleInvalidTarget
		}
		query = query.Where("material_id = ?", *input.MaterialID)
	case InventoryThresholdTargetBOM:
		if input.BOMID == nil {
			return ErrInventoryThresholdRuleInvalidTarget
		}
		query = query.Where("bom_id = ?", *input.BOMID)
	default:
		return ErrInventoryThresholdRuleInvalidTargetType
	}

	var duplicateCount int64
	if err := query.Count(&duplicateCount).Error; err != nil {
		return err
	}
	if duplicateCount > 0 {
		return ErrInventoryThresholdRuleDuplicateTarget
	}

	return nil
}

func syncMaterialThresholdProjectionTx(tx *gorm.DB, materialID string) error {
	trimmedMaterialID := strings.TrimSpace(materialID)
	if trimmedMaterialID == "" {
		return nil
	}

	minStock := 0.0
	var rule models.InventoryThresholdRule
	if err := tx.
		Where("material_id = ? AND enabled = ?", trimmedMaterialID, true).
		Order("updated_at desc").
		First(&rule).Error; err != nil {
		if !errors.Is(err, gorm.ErrRecordNotFound) {
			return err
		}
	} else {
		minStock = rule.ThresholdQty
	}

	return tx.Model(&models.Material{}).
		Where("id = ?", trimmedMaterialID).
		Update("min_stock", minStock).Error
}

func normalizeOptionalID(value *string) *string {
	if value == nil {
		return nil
	}
	trimmed := strings.TrimSpace(*value)
	if trimmed == "" {
		return nil
	}
	return &trimmed
}
