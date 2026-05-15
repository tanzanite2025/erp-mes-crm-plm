package services

import (
	"encoding/json"
	"fmt"
	"xdfc-server/db"
	"xdfc-server/models"

	"gorm.io/gorm"
)

func ListProductTypes(query ProductTypeListQuery) ([]models.ProductType, int64, error) {
	page := query.Page
	pageSize := query.PageSize
	if page < 1 {
		page = 1
	}
	if pageSize < 1 {
		pageSize = 50
	}

	tx := db.DB.Model(&models.ProductType{})
	preloadChildren := func(database *gorm.DB) *gorm.DB {
		return database.Order("sort_order asc")
	}
	if query.Options {
		var types []models.ProductType
		if err := tx.Order("sort_order asc").Preload("Children", preloadChildren).Find(&types).Error; err != nil {
			return nil, 0, err
		}
		return types, int64(len(types)), nil
	}

	var total int64
	if err := tx.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	var items []models.ProductType
	if err := tx.Order("sort_order asc").Preload("Children", preloadChildren).Limit(pageSize).Offset((page - 1) * pageSize).Find(&items).Error; err != nil {
		return nil, 0, err
	}

	return items, total, nil
}

func BuildProductTypeUpdates(payload map[string]json.RawMessage) (map[string]interface{}, error) {
	if err := validateSupportedTopLevelDeltaKeys(payload, "parentId", "templateId", "name", "code", "description", "active", "sortOrder"); err != nil {
		return nil, err
	}
	updates := make(map[string]interface{})
	for key, raw := range payload {
		valueRaw, err := extractDeltaNewValue(raw)
		if err != nil {
			return nil, err
		}
		switch key {
		case "name", "code", "description":
			var value string
			if err := json.Unmarshal(valueRaw, &value); err != nil {
				return nil, err
			}
			updates[key] = value
		case "active":
			var value bool
			if err := json.Unmarshal(valueRaw, &value); err != nil {
				return nil, err
			}
			updates[key] = value
		case "sortOrder":
			var value int
			if err := json.Unmarshal(valueRaw, &value); err != nil {
				return nil, err
			}
			updates["sort_order"] = value
		case "parentId", "templateId":
			if string(valueRaw) == "null" {
				updates[key] = nil
				continue
			}
			var value string
			if err := json.Unmarshal(valueRaw, &value); err != nil {
				return nil, err
			}
			updates[key] = value
		default:
		}
	}
	return updates, nil
}

func PatchProductType(id string, version int, updates map[string]interface{}) (models.ProductType, error) {
	var existing models.ProductType
	if err := db.DB.First(&existing, "id = ?", id).Error; err != nil {
		return models.ProductType{}, err
	}
	if version > 0 && existing.Version != version {
		return models.ProductType{}, domainConflictError("product type version conflict")
	}
	updates["version"] = existing.Version + 1
	if err := db.DB.Model(&existing).Updates(updates).Error; err != nil {
		return models.ProductType{}, err
	}
	if err := db.DB.First(&existing, "id = ?", id).Error; err != nil {
		return models.ProductType{}, err
	}
	return existing, nil
}

func CreateProductType(input models.ProductType) (models.ProductType, error) {
	if input.Version == 0 {
		input.Version = 1
	}
	if err := db.DB.Create(&input).Error; err != nil {
		return models.ProductType{}, err
	}
	return input, nil
}

func DeleteProductType(id string) error {
	return db.DB.Transaction(func(tx *gorm.DB) error {
		var relatedProductCount int64
		if err := tx.Model(&models.Product{}).Where("type_id = ?", id).Count(&relatedProductCount).Error; err != nil {
			return err
		}
		if relatedProductCount > 0 {
			return domainConflictError(fmt.Sprintf("product type is not empty: still has %d related products", relatedProductCount))
		}

		var childCategoryCount int64
		if err := tx.Model(&models.ProductType{}).Where("parent_id = ?", id).Count(&childCategoryCount).Error; err != nil {
			return err
		}
		if childCategoryCount > 0 {
			return domainConflictError(fmt.Sprintf("product type is not empty: still has %d child categories", childCategoryCount))
		}

		return tx.Delete(&models.ProductType{}, "id = ?", id).Error
	})
}

func SyncProductTypes(inputs []SyncProductTypeInput) error {
	return db.DB.Transaction(func(tx *gorm.DB) error {
		for _, in := range inputs {
			productType := models.ProductType(in)
			if productType.ID != "" {
				if err := tx.Model(&models.ProductType{}).Where("id = ?", productType.ID).Omit("CreatedAt").Updates(&productType).Error; err != nil {
					return err
				}
				continue
			}
			if err := tx.Create(&productType).Error; err != nil {
				return err
			}
		}
		return nil
	})
}
