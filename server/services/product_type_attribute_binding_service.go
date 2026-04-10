package services

import (
	"encoding/json"
	"errors"
	"strings"
	"xdfc-server/db"
	"xdfc-server/models"

	"gorm.io/gorm"
)

type ProductTypeAttributeBindingListQuery struct {
	ProductTypeID string
	ActiveOnly    bool
}

var ErrProductTypeAttributeBindingVersionConflict = errors.New("product type attribute binding version conflict")

type SyncProductTypeAttributeBindingsInput struct {
	ProductTypeID string                               `json:"productTypeId"`
	Bindings      []models.ProductTypeAttributeBinding `json:"bindings"`
}

func normalizeProductTypeAttributeBinding(input *models.ProductTypeAttributeBinding) {
	input.ProductTypeID = strings.TrimSpace(input.ProductTypeID)
	input.CategoryKey = strings.TrimSpace(input.CategoryKey)
}

func ListProductTypeAttributeBindings(query ProductTypeAttributeBindingListQuery) ([]models.ProductTypeAttributeBinding, error) {
	tx := db.DB.Model(&models.ProductTypeAttributeBinding{})
	if query.ProductTypeID != "" {
		tx = tx.Where("product_type_id = ?", query.ProductTypeID)
	}
	if query.ActiveOnly {
		tx = tx.Where("active = ?", true)
	}
	var items []models.ProductTypeAttributeBinding
	if err := tx.Order("sort_order asc").Order("category_key asc").Find(&items).Error; err != nil {
		return nil, err
	}
	return items, nil
}

func CreateProductTypeAttributeBinding(input models.ProductTypeAttributeBinding) (models.ProductTypeAttributeBinding, error) {
	normalizeProductTypeAttributeBinding(&input)
	input.Version = 1
	if err := db.DB.Create(&input).Error; err != nil {
		return models.ProductTypeAttributeBinding{}, err
	}
	return input, nil
}

func BuildProductTypeAttributeBindingUpdates(payload map[string]json.RawMessage) (map[string]interface{}, error) {
	if err := validateSupportedTopLevelDeltaKeys(payload, "productTypeId", "categoryKey", "sortOrder", "required", "active"); err != nil {
		return nil, err
	}
	updates := make(map[string]interface{})
	for key, raw := range payload {
		valueRaw, err := extractDeltaNewValue(raw)
		if err != nil {
			return nil, err
		}
		switch key {
		case "productTypeId", "categoryKey":
			var value string
			if err := json.Unmarshal(valueRaw, &value); err != nil {
				return nil, err
			}
			if key == "productTypeId" {
				updates["product_type_id"] = strings.TrimSpace(value)
			} else {
				updates["category_key"] = strings.TrimSpace(value)
			}
		case "sortOrder":
			var value int
			if err := json.Unmarshal(valueRaw, &value); err != nil {
				return nil, err
			}
			updates["sort_order"] = value
		case "required", "active":
			var value bool
			if err := json.Unmarshal(valueRaw, &value); err != nil {
				return nil, err
			}
			updates[key] = value
		default:
		}
	}
	return updates, nil
}

func PatchProductTypeAttributeBinding(id string, version int, updates map[string]interface{}) (models.ProductTypeAttributeBinding, error) {
	var existing models.ProductTypeAttributeBinding
	if err := db.DB.First(&existing, "id = ?", id).Error; err != nil {
		return models.ProductTypeAttributeBinding{}, err
	}
	if version > 0 && existing.Version != version {
		return models.ProductTypeAttributeBinding{}, ErrProductTypeAttributeBindingVersionConflict
	}
	if err := db.DB.Transaction(func(tx *gorm.DB) error {
		updates["version"] = existing.Version + 1
		if err := tx.Model(&existing).Updates(updates).Error; err != nil {
			return err
		}
		return tx.First(&existing, "id = ?", id).Error
	}); err != nil {
		return models.ProductTypeAttributeBinding{}, err
	}
	return existing, nil
}

func DeleteProductTypeAttributeBinding(id string) error {
	return db.DB.Delete(&models.ProductTypeAttributeBinding{}, "id = ?", id).Error
}

func SyncProductTypeAttributeBindings(input SyncProductTypeAttributeBindingsInput) error {
	productTypeID := strings.TrimSpace(input.ProductTypeID)
	return db.DB.Transaction(func(tx *gorm.DB) error {
		if err := tx.Where("product_type_id = ?", productTypeID).Delete(&models.ProductTypeAttributeBinding{}).Error; err != nil {
			return err
		}
		for idx, binding := range input.Bindings {
			item := binding
			item.ProductTypeID = productTypeID
			normalizeProductTypeAttributeBinding(&item)
			item.SortOrder = idx + 1
			item.Version = 1
			if err := tx.Create(&item).Error; err != nil {
				return err
			}
		}
		return nil
	})
}
