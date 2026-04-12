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

type ProductAttributeCategoryListQuery struct {
	ActiveOnly bool
}

type SaveProductAttributeCategoryInput struct {
	ID            string `json:"id"`
	Key           string `json:"key"`
	NameZh        string `json:"nameZh"`
	NameEn        string `json:"nameEn"`
	Description   string `json:"description"`
	SortOrder     int    `json:"sortOrder"`
	Active        bool   `json:"active"`
	RevisionNo    string `json:"revisionNo"`
	ChangeType    string `json:"changeType"`
	ChangeOrderNo string `json:"changeOrderNo"`
	SiteCode      string `json:"siteCode"`
	IsDefaultSite bool   `json:"isDefaultSite"`
	Version       int    `json:"version"`
}

func toProductAttributeCategoryModel(input SaveProductAttributeCategoryInput) models.ProductAttributeCategory {
	return models.ProductAttributeCategory{
		BaseModel: models.BaseModel{
			ID: input.ID,
		},
		MasterDataControl: models.MasterDataControl{
			RevisionNo:    input.RevisionNo,
			ChangeType:    input.ChangeType,
			ChangeOrderNo: input.ChangeOrderNo,
			SiteCode:      input.SiteCode,
			IsDefaultSite: input.IsDefaultSite,
		},
		Key:         input.Key,
		NameZh:      input.NameZh,
		NameEn:      input.NameEn,
		Description: input.Description,
		SortOrder:   input.SortOrder,
		Active:      input.Active,
		Version:     input.Version,
	}
}

func normalizeProductAttributeCategory(input *models.ProductAttributeCategory) {
	input.Key = normalizeProductAttributeMachineValue(input.Key)
	input.NameZh = strings.TrimSpace(input.NameZh)
	input.NameEn = strings.TrimSpace(input.NameEn)
	input.Description = strings.TrimSpace(input.Description)
	input.MasterDataControl.Normalize("R1")
}

func ensureProductAttributeCategoryKeyAvailable(tx *gorm.DB, nextKey string, excludeID string) error {
	var items []models.ProductAttributeCategory
	if err := tx.Select("id", "key").Find(&items).Error; err != nil {
		return err
	}
	for _, item := range items {
		if excludeID != "" && item.ID == excludeID {
			continue
		}
		if sameProductAttributeMachineValue(item.Key, nextKey) {
			return fmt.Errorf("[VALIDATION] 产品属性分类编码重复")
		}
	}
	return nil
}

func defaultProductAttributeCategories() []models.ProductAttributeCategory {
	return []models.ProductAttributeCategory{
		{Key: "techSeries", NameZh: "工艺系列", NameEn: "Technical Series", Description: "产品工艺系列分类", SortOrder: 10, Active: true},
		{Key: "tireType", NameZh: "轮圈类型", NameEn: "Rim Type", Description: "产品轮圈类型分类", SortOrder: 20, Active: true},
		{Key: "brakeType", NameZh: "制动类型", NameEn: "Brake Type", Description: "产品制动类型分类", SortOrder: 30, Active: true},
		{Key: "versionLevel", NameZh: "版本等级", NameEn: "Version Level", Description: "产品版本等级分类", SortOrder: 40, Active: true},
	}
}

func ListProductAttributeCategories(query ProductAttributeCategoryListQuery) ([]models.ProductAttributeCategory, error) {
	tx := db.DB.Model(&models.ProductAttributeCategory{})
	if query.ActiveOnly {
		tx = tx.Where("active = ?", true)
	}

	var items []models.ProductAttributeCategory
	if err := tx.Order("sort_order asc").Order("name_zh asc").Find(&items).Error; err != nil {
		return nil, err
	}
	return items, nil
}

func CreateProductAttributeCategory(input SaveProductAttributeCategoryInput) (models.ProductAttributeCategory, error) {
	modelInput := toProductAttributeCategoryModel(input)
	normalizeProductAttributeCategory(&modelInput)
	if modelInput.Key == "" || !isValidProductAttributeMachineValue(modelInput.Key) {
		return models.ProductAttributeCategory{}, fmt.Errorf("[VALIDATION] 产品属性分类编码格式无效")
	}
	if err := ensureProductAttributeCategoryKeyAvailable(db.DB, modelInput.Key, ""); err != nil {
		return models.ProductAttributeCategory{}, err
	}
	modelInput.Version = 1
	if err := db.DB.Create(&modelInput).Error; err != nil {
		return models.ProductAttributeCategory{}, err
	}
	return modelInput, nil
}

func BuildProductAttributeCategoryUpdates(payload map[string]json.RawMessage) (map[string]interface{}, error) {
	updates := make(map[string]interface{})
	for key, raw := range payload {
		switch key {
		case "key", "nameZh", "nameEn", "description", "revisionNo", "changeType", "changeOrderNo", "siteCode":
			var value string
			if err := json.Unmarshal(raw, &value); err != nil {
				return nil, err
			}
			switch key {
			case "key":
				updates[key] = normalizeProductAttributeMachineValue(value)
			case "nameZh":
				updates["name_zh"] = strings.TrimSpace(value)
			case "nameEn":
				updates["name_en"] = strings.TrimSpace(value)
			default:
				updates[key] = strings.TrimSpace(value)
			}
		case "sortOrder", "version":
			var value int
			if err := json.Unmarshal(raw, &value); err != nil {
				return nil, err
			}
			if key == "sortOrder" {
				updates["sort_order"] = value
			} else {
				updates[key] = value
			}
		case "active", "isDefaultSite":
			var value bool
			if err := json.Unmarshal(raw, &value); err != nil {
				return nil, err
			}
			updates[key] = value
		case "id", "createdAt", "updatedAt", "metadata":
		default:
		}
	}
	return updates, nil
}

func PatchProductAttributeCategory(id string, updates map[string]interface{}) (models.ProductAttributeCategory, error) {
	var existing models.ProductAttributeCategory
	if err := db.DB.First(&existing, "id = ?", id).Error; err != nil {
		return models.ProductAttributeCategory{}, err
	}
	if nextKey, ok := updates["key"].(string); ok {
		if nextKey == "" || !isValidProductAttributeMachineValue(nextKey) {
			return models.ProductAttributeCategory{}, fmt.Errorf("[VALIDATION] 产品属性分类编码格式无效")
		}
		if nextKey != existing.Key {
			return models.ProductAttributeCategory{}, fmt.Errorf("[VALIDATION] 已有关联数据的分类编码不允许修改")
		}
	}
	if err := ensureProductAttributeCategoryKeyAvailable(db.DB, existing.Key, id); err != nil {
		return models.ProductAttributeCategory{}, err
	}
	if err := db.DB.Transaction(func(tx *gorm.DB) error {
		if err := tx.Model(&existing).Updates(updates).Error; err != nil {
			return err
		}
		return tx.First(&existing, "id = ?", id).Error
	}); err != nil {
		return models.ProductAttributeCategory{}, err
	}
	return existing, nil
}

func DeleteProductAttributeCategory(id string) error {
	return db.DB.Transaction(func(tx *gorm.DB) error {
		var category models.ProductAttributeCategory
		if err := tx.First(&category, "id = ?", id).Error; err != nil {
			return err
		}
		if err := tx.Delete(&models.ProductAttributeOption{}, "category = ?", category.Key).Error; err != nil {
			return err
		}
		return tx.Delete(&category).Error
	})
}

func SeedDefaultProductAttributeCategories(tx *gorm.DB) error {
	for _, category := range defaultProductAttributeCategories() {
		item := category
		normalizeProductAttributeCategory(&item)
		item.Version = 1

		var existing models.ProductAttributeCategory
		err := tx.Where("key = ?", item.Key).First(&existing).Error
		if errors.Is(err, gorm.ErrRecordNotFound) {
			if err := tx.Create(&item).Error; err != nil {
				return err
			}
			continue
		}
		if err != nil {
			return err
		}
	}
	return nil
}
