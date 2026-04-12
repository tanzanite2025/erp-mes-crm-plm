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

type ProductAttributeOptionListQuery struct {
	CategoryKey string
	ActiveOnly  bool
}

type SaveProductAttributeOptionInput struct {
	ID            string `json:"id"`
	CategoryKey   string `json:"categoryKey"`
	Value         string `json:"value"`
	LabelZh       string `json:"labelZh"`
	LabelEn       string `json:"labelEn"`
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

func toProductAttributeOptionModel(input SaveProductAttributeOptionInput) models.ProductAttributeOption {
	return models.ProductAttributeOption{
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
		CategoryKey: input.CategoryKey,
		Value:       input.Value,
		LabelZh:     input.LabelZh,
		LabelEn:     input.LabelEn,
		Description: input.Description,
		SortOrder:   input.SortOrder,
		Active:      input.Active,
		Version:     input.Version,
	}
}

func defaultProductAttributeOptions() []models.ProductAttributeOption {
	return []models.ProductAttributeOption{
		{CategoryKey: "techSeries", Value: "normal", LabelZh: "常规系列", LabelEn: "Standard Series", Description: "常温常规工艺系列", SortOrder: 10, Active: true},
		{CategoryKey: "techSeries", Value: "high-tg", LabelZh: "高温系列", LabelEn: "High TG Series", Description: "高温工艺系列", SortOrder: 20, Active: true},
		{CategoryKey: "tireType", Value: "hooked", LabelZh: "有钩", LabelEn: "Hooked", Description: "有钩车圈类型", SortOrder: 10, Active: true},
		{CategoryKey: "tireType", Value: "hookless", LabelZh: "无钩", LabelEn: "Hookless", Description: "无钩车圈类型", SortOrder: 20, Active: true},
		{CategoryKey: "tireType", Value: "tubular", LabelZh: "管胎", LabelEn: "Tubular", Description: "管胎车圈类型", SortOrder: 30, Active: true},
		{CategoryKey: "brakeType", Value: "disc", LabelZh: "碟刹", LabelEn: "Disc", Description: "碟刹制动类型", SortOrder: 10, Active: true},
		{CategoryKey: "versionLevel", Value: "std", LabelZh: "标准版", LabelEn: "Standard", Description: "标准版本等级", SortOrder: 10, Active: true},
		{CategoryKey: "versionLevel", Value: "lightweight", LabelZh: "轻量版", LabelEn: "Lightweight", Description: "轻量化版本等级", SortOrder: 20, Active: true},
		{CategoryKey: "versionLevel", Value: "ultralight", LabelZh: "超轻版", LabelEn: "Ultralight", Description: "超轻版本等级", SortOrder: 30, Active: true},
		{CategoryKey: "versionLevel", Value: "reinforced", LabelZh: "加强版", LabelEn: "Reinforced", Description: "加强型版本等级", SortOrder: 40, Active: true},
	}
}

func normalizeProductAttributeOption(input *models.ProductAttributeOption) {
	input.CategoryKey = strings.TrimSpace(input.CategoryKey)
	input.Value = normalizeProductAttributeMachineValue(input.Value)
	input.LabelZh = strings.TrimSpace(input.LabelZh)
	input.LabelEn = strings.TrimSpace(input.LabelEn)
	input.Description = strings.TrimSpace(input.Description)
	input.MasterDataControl.Normalize("R1")
}

func ensureProductAttributeOptionValueAvailable(tx *gorm.DB, categoryKey string, nextValue string, excludeID string) error {
	var items []models.ProductAttributeOption
	if err := tx.Select("id", "category", "value").Where("category = ?", categoryKey).Find(&items).Error; err != nil {
		return err
	}
	for _, item := range items {
		if excludeID != "" && item.ID == excludeID {
			continue
		}
		if sameProductAttributeMachineValue(item.Value, nextValue) {
			return fmt.Errorf("[VALIDATION] 产品属性分类项值重复")
		}
	}
	return nil
}

func ListProductAttributeOptions(query ProductAttributeOptionListQuery) ([]models.ProductAttributeOption, error) {
	tx := db.DB.Model(&models.ProductAttributeOption{})
	if query.CategoryKey != "" {
		tx = tx.Where("category = ?", query.CategoryKey)
	}
	if query.ActiveOnly {
		tx = tx.Where("active = ?", true)
	}

	var items []models.ProductAttributeOption
	if err := tx.Order("category asc").Order("sort_order asc").Order("label asc").Find(&items).Error; err != nil {
		return nil, err
	}
	return items, nil
}

func CreateProductAttributeOption(input SaveProductAttributeOptionInput) (models.ProductAttributeOption, error) {
	modelInput := toProductAttributeOptionModel(input)
	normalizeProductAttributeOption(&modelInput)
	if modelInput.Value == "" || !isValidProductAttributeMachineValue(modelInput.Value) {
		return models.ProductAttributeOption{}, fmt.Errorf("[VALIDATION] 产品属性分类项机器值格式无效")
	}
	if err := ensureProductAttributeOptionValueAvailable(db.DB, modelInput.CategoryKey, modelInput.Value, ""); err != nil {
		return models.ProductAttributeOption{}, err
	}
	modelInput.Version = 1
	if err := db.DB.Create(&modelInput).Error; err != nil {
		return models.ProductAttributeOption{}, err
	}
	return modelInput, nil
}

func BuildProductAttributeOptionUpdates(payload map[string]json.RawMessage) (map[string]interface{}, error) {
	updates := make(map[string]interface{})
	for key, raw := range payload {
		switch key {
		case "categoryKey", "value", "labelZh", "labelEn", "description", "revisionNo", "changeType", "changeOrderNo", "siteCode":
			var value string
			if err := json.Unmarshal(raw, &value); err != nil {
				return nil, err
			}
			switch key {
			case "categoryKey":
				updates["category"] = strings.TrimSpace(value)
			case "value":
				updates[key] = normalizeProductAttributeMachineValue(value)
			case "labelZh":
				updates["label"] = strings.TrimSpace(value)
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
		case "effectiveFrom", "effectiveTo":
			if string(raw) == "null" {
				if key == "effectiveFrom" {
					updates["effective_from"] = nil
				} else {
					updates["effective_to"] = nil
				}
				continue
			}
			var value string
			if err := json.Unmarshal(raw, &value); err != nil {
				return nil, err
			}
			if key == "effectiveFrom" {
				updates["effective_from"] = value
			} else {
				updates["effective_to"] = value
			}
		case "id", "createdAt", "updatedAt", "metadata":
		default:
		}
	}
	return updates, nil
}

func PatchProductAttributeOption(id string, updates map[string]interface{}) (models.ProductAttributeOption, error) {
	var existing models.ProductAttributeOption
	if err := db.DB.First(&existing, "id = ?", id).Error; err != nil {
		return models.ProductAttributeOption{}, err
	}
	if nextCategory, ok := updates["category"].(string); ok && nextCategory != existing.CategoryKey {
		return models.ProductAttributeOption{}, fmt.Errorf("[VALIDATION] 已有关联数据的分类项归属分类不允许修改")
	}
	if nextValue, ok := updates["value"].(string); ok {
		if nextValue == "" || !isValidProductAttributeMachineValue(nextValue) {
			return models.ProductAttributeOption{}, fmt.Errorf("[VALIDATION] 产品属性分类项机器值格式无效")
		}
		if nextValue != existing.Value {
			return models.ProductAttributeOption{}, fmt.Errorf("[VALIDATION] 已有关联数据的分类项机器值不允许修改")
		}
	}
	if err := ensureProductAttributeOptionValueAvailable(db.DB, existing.CategoryKey, existing.Value, id); err != nil {
		return models.ProductAttributeOption{}, err
	}
	if err := db.DB.Transaction(func(tx *gorm.DB) error {
		if err := tx.Model(&existing).Updates(updates).Error; err != nil {
			return err
		}
		return tx.First(&existing, "id = ?", id).Error
	}); err != nil {
		return models.ProductAttributeOption{}, err
	}
	return existing, nil
}

func DeleteProductAttributeOption(id string) error {
	return db.DB.Delete(&models.ProductAttributeOption{}, "id = ?", id).Error
}

func SeedDefaultProductAttributeOptions(tx *gorm.DB) error {
	for _, option := range defaultProductAttributeOptions() {
		item := option
		normalizeProductAttributeOption(&item)
		item.Version = 1

		var existing models.ProductAttributeOption
		err := tx.Where("category = ? AND value = ?", item.CategoryKey, item.Value).First(&existing).Error
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
