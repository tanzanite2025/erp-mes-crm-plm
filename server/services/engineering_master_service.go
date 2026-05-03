package services

import (
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"xdfc-server/db"
	"xdfc-server/models"

	"gorm.io/gorm"
)

var (
	ErrEngineeringSpecVersionConflict = errors.New("engineering spec version conflict")
	ErrEngineeringSpecLinkedProducts  = errors.New("engineering spec linked by products")
	ErrEngineeringSpecLinkedBOM       = errors.New("engineering spec linked by bom")
	ErrEngineeringSpecLinkedDrilling  = errors.New("engineering spec linked by drilling plan")
	ErrEngineeringSpecDuplicateKey    = errors.New("engineering spec duplicate normalized ratio key")
)

const (
	engineeringMasterWeavingModeType = "ENGINEERING_MASTER_WEAVING_MODE"
	drillingPlanSpecType             = "DRILLING_PLAN"
)

type EngineeringSpecListQuery struct {
	Page     int
	PageSize int
	Options  bool
	SpecType string
}

type SaveEngineeringSpecInput = models.EngineeringSpec
type BulkSyncEngineeringSpecInput = models.EngineeringSpec

func parseEngineeringJSON(raw []byte) map[string]any {
	if len(raw) == 0 {
		return nil
	}

	var payload map[string]any
	if err := json.Unmarshal(raw, &payload); err != nil {
		return nil
	}

	return payload
}

func engineeringJSONString(raw []byte, key string) string {
	payload := parseEngineeringJSON(raw)
	if payload == nil {
		return ""
	}

	value, ok := payload[key]
	if !ok || value == nil {
		return ""
	}

	return strings.TrimSpace(fmt.Sprint(value))
}

func ensureWeavingModeNormalizedKeyUnique(tx *gorm.DB, input models.EngineeringSpec) error {
	if input.Type != engineeringMasterWeavingModeType {
		return nil
	}

	normalizedRatioKey := engineeringJSONString(input.SpecData, "normalizedRatioKey")
	if normalizedRatioKey == "" {
		return nil
	}

	var specs []models.EngineeringSpec
	if err := tx.Where("type = ?", engineeringMasterWeavingModeType).Find(&specs).Error; err != nil {
		return err
	}

	for _, item := range specs {
		if item.ID == input.ID {
			continue
		}
		if engineeringJSONString(item.SpecData, "normalizedRatioKey") == normalizedRatioKey {
			return ErrEngineeringSpecDuplicateKey
		}
	}

	return nil
}

func countDrillingPlansReferencingWeavingMode(tx *gorm.DB, weavingModeID string) (int64, error) {
	var specs []models.EngineeringSpec
	if err := tx.Where("type = ?", drillingPlanSpecType).Find(&specs).Error; err != nil {
		return 0, err
	}

	var count int64
	for _, item := range specs {
		if engineeringJSONString(item.DrillingData, "weavingModeId") == weavingModeID {
			count++
		}
	}

	return count, nil
}

func ListEngineeringSpecs(query EngineeringSpecListQuery) ([]models.EngineeringSpec, int64, error) {
	page := query.Page
	pageSize := query.PageSize
	if page < 1 {
		page = 1
	}
	if pageSize < 1 {
		pageSize = 50
	}

	specType := strings.TrimSpace(query.SpecType)
	tx := db.DB.Model(&models.EngineeringSpec{})
	if specType != "" {
		tx = tx.Where("type = ?", specType)
	}

	if query.Options {
		var specs []models.EngineeringSpec
		if err := tx.Order("type asc, code asc").Find(&specs).Error; err != nil {
			return nil, 0, err
		}
		return specs, int64(len(specs)), nil
	}

	var total int64
	if err := tx.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	var items []models.EngineeringSpec
	if err := tx.Order("type asc, code asc").Limit(pageSize).Offset((page - 1) * pageSize).Find(&items).Error; err != nil {
		return nil, 0, err
	}

	return items, total, nil
}

func GetEngineeringSpecByID(id string) (models.EngineeringSpec, error) {
	var spec models.EngineeringSpec
	if err := db.DB.First(&spec, "id = ?", id).Error; err != nil {
		return models.EngineeringSpec{}, err
	}
	return spec, nil
}

func SaveEngineeringSpec(input SaveEngineeringSpecInput) (models.EngineeringSpec, error) {
	var saved models.EngineeringSpec

	err := db.DB.Transaction(func(tx *gorm.DB) error {
		if err := ensureWeavingModeNormalizedKeyUnique(tx, input); err != nil {
			return err
		}

		if input.ID != "" {
			var existing models.EngineeringSpec
			if err := tx.Where("id = ?", input.ID).First(&existing).Error; err != nil {
				return err
			}
			if input.Version != existing.Version {
				return ErrEngineeringSpecVersionConflict
			}

			input.MasterDataControl.MergeMissingFrom(existing.MasterDataControl, "R1")
			input.Version = existing.Version + 1
			if err := tx.Model(&existing).Updates(input).Error; err != nil {
				return err
			}
			return tx.First(&saved, "id = ?", existing.ID).Error
		}

		input.MasterDataControl.Normalize("R1")
		input.Version = 1
		if err := tx.Create(&input).Error; err != nil {
			return err
		}
		saved = input
		return nil
	})
	if err != nil {
		return models.EngineeringSpec{}, err
	}
	return saved, nil
}

func BulkSyncEngineeringSpecs(inputs []BulkSyncEngineeringSpecInput) error {
	return db.DB.Transaction(func(tx *gorm.DB) error {
		for _, in := range inputs {
			spec := in
			if strings.TrimSpace(spec.Name) == "" || strings.TrimSpace(spec.Code) == "" {
				return errors.New("name/code is required")
			}
			spec.MasterDataControl.Normalize("R1")
			if err := ensureWeavingModeNormalizedKeyUnique(tx, spec); err != nil {
				return err
			}

			if spec.ID != "" {
				if err := tx.Model(&models.EngineeringSpec{}).Where("id = ?", spec.ID).Omit("CreatedAt", "BaseModel.CreatedAt").Updates(&spec).Error; err != nil {
					return err
				}
				continue
			}

			if err := tx.Create(&spec).Error; err != nil {
				return err
			}
		}
		return nil
	})
}

func DeleteEngineeringSpec(id string) error {
	var target models.EngineeringSpec
	if err := db.DB.First(&target, "id = ?", id).Error; err != nil {
		return err
	}

	if target.Type == engineeringMasterWeavingModeType {
		drillingCount, err := countDrillingPlansReferencingWeavingMode(db.DB, id)
		if err != nil {
			return err
		}
		if drillingCount > 0 {
			return ErrEngineeringSpecLinkedDrilling
		}
	}

	var pCount int64
	if err := db.DB.Model(&models.Product{}).Where("engineering_spec_id = ?", id).Count(&pCount).Error; err != nil {
		return err
	}
	if pCount > 0 {
		return ErrEngineeringSpecLinkedProducts
	}

	var bCount int64
	if err := db.DB.Model(&models.BOM{}).Where("description LIKE ?", "%"+id+"%").Count(&bCount).Error; err != nil {
		return err
	}
	if bCount > 0 {
		return ErrEngineeringSpecLinkedBOM
	}

	return db.DB.Delete(&models.EngineeringSpec{}, "id = ?", id).Error
}
