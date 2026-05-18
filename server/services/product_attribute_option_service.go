// Package services - 产品属性选项(动态字段下拉值)主数据。
//
// 产品属性 = (category, option):
//   - category: 一组属性的集合(如 versionLevel/tireType/brakeType)
//   - option : category 下的具体可选值(如 std/lightweight)
//
// 此文件管理 option 的 CRUD + 数据治理:
//   - List/Create/Patch/Delete/Reorder 标准 CRUD
//   - SeedDefaultProductAttributeOptions 启动种子(系统级 option,不允许删)
//   - CleanupDuplicateProductAttributeOptions 数据治理:历史脏数据清理
//   - EnsureProductAttributeOptionValueUniqueIndex DB 唯一索引兜底
//
// 关键不变量:
//   - categoryKey 大小写规范化(canonicalize),避免 "TireType" 和 "tireType" 双写
//   - value 在同 category 内全局唯一(部分唯一索引保证)
//   - 系统级 option 由 isProductAttributeOptionImmutableField 标记,UI 不允许改 categoryKey/value 等关键字段
//   - 重排(reorder)走整批 sortOrder 重写,避免冲突
package services

import (
	"encoding/json"
	"errors"
	"sort"
	"strings"
	"xdfc-server/db"
	"xdfc-server/models"

	"gorm.io/gorm"
)

type productAttributeOptionDuplicateGroup struct {
	CategoryKey     string
	NormalizedValue string
	CanonicalID     string
	CanonicalValue  string
	DuplicateIDs    []string
	DuplicateValues []string
}

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

func nextProductAttributeOptionSortOrder(tx *gorm.DB, categoryKey string) (int, error) {
	var maxSortOrder int
	if err := tx.Model(&models.ProductAttributeOption{}).
		Where("category = ?", categoryKey).
		Select("COALESCE(MAX(sort_order), 0)").
		Scan(&maxSortOrder).Error; err != nil {
		return 0, err
	}
	return maxSortOrder + productAttributeSortOrderStep, nil
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

func listProductAttributeCategoriesTx(tx *gorm.DB) ([]models.ProductAttributeCategory, error) {
	var categories []models.ProductAttributeCategory
	if err := tx.Select("key").Find(&categories).Error; err != nil {
		return nil, err
	}
	return categories, nil
}

func resolveCanonicalProductAttributeCategoryKeyFromList(categories []models.ProductAttributeCategory, rawKey string) (string, bool) {
	trimmed := strings.TrimSpace(rawKey)
	if trimmed == "" {
		return "", false
	}

	for _, category := range categories {
		if strings.TrimSpace(category.Key) == trimmed {
			return category.Key, true
		}
	}

	for _, category := range categories {
		if sameProductAttributeCategoryKey(category.Key, trimmed) {
			return category.Key, true
		}
	}

	return trimmed, false
}

func resolveCanonicalProductAttributeCategoryKeyTx(tx *gorm.DB, rawKey string) (string, error) {
	categories, err := listProductAttributeCategoriesTx(tx)
	if err != nil {
		return "", err
	}

	if canonicalKey, ok := resolveCanonicalProductAttributeCategoryKeyFromList(categories, rawKey); ok {
		return canonicalKey, nil
	}

	if strings.TrimSpace(rawKey) == "" {
		return "", domainValidationError("产品属性归属分类不能为空")
	}

	return "", domainValidationError("产品属性归属分类不存在")
}

func canonicalizeProductAttributeOptionCategoryKeys(categories []models.ProductAttributeCategory, items []models.ProductAttributeOption) {
	for index := range items {
		if canonicalKey, ok := resolveCanonicalProductAttributeCategoryKeyFromList(categories, items[index].CategoryKey); ok {
			items[index].CategoryKey = canonicalKey
			continue
		}
		items[index].CategoryKey = strings.TrimSpace(items[index].CategoryKey)
	}
}

func chooseCanonicalProductAttributeOption(items []models.ProductAttributeOption, normalizedValue string) models.ProductAttributeOption {
	ordered := append([]models.ProductAttributeOption(nil), items...)
	sort.SliceStable(ordered, func(i, j int) bool {
		leftMatches := ordered[i].Value == normalizedValue
		rightMatches := ordered[j].Value == normalizedValue
		if leftMatches != rightMatches {
			return leftMatches
		}
		if ordered[i].SortOrder != ordered[j].SortOrder {
			return ordered[i].SortOrder < ordered[j].SortOrder
		}
		return ordered[i].ID < ordered[j].ID
	})
	return ordered[0]
}

func cleanupDuplicateProductAttributeOptionsTx(tx *gorm.DB) ([]productAttributeOptionDuplicateGroup, error) {
	var options []models.ProductAttributeOption
	if err := tx.Order("category asc").Order("sort_order asc").Order("id asc").Find(&options).Error; err != nil {
		return nil, err
	}

	grouped := make(map[string][]models.ProductAttributeOption)
	for _, option := range options {
		normalizedValue := normalizeProductAttributeMachineValue(option.Value)
		if normalizedValue == "" {
			continue
		}
		key := option.CategoryKey + "::" + normalizedValue
		grouped[key] = append(grouped[key], option)
	}

	cleanups := make([]productAttributeOptionDuplicateGroup, 0)
	for _, group := range grouped {
		if len(group) == 0 {
			continue
		}
		normalizedValue := normalizeProductAttributeMachineValue(group[0].Value)
		canonical := chooseCanonicalProductAttributeOption(group, normalizedValue)
		duplicateIDs := make([]string, 0)
		duplicateValues := make([]string, 0)
		for _, item := range group {
			if item.ID == canonical.ID {
				continue
			}
			duplicateIDs = append(duplicateIDs, item.ID)
			duplicateValues = append(duplicateValues, item.Value)
		}

		needsCanonicalNormalize := canonical.Value != normalizedValue
		if !needsCanonicalNormalize && len(duplicateIDs) == 0 {
			continue
		}

		if needsCanonicalNormalize {
			if err := tx.Model(&models.ProductAttributeOption{}).
				Where("id = ?", canonical.ID).
				Updates(map[string]interface{}{"value": normalizedValue}).Error; err != nil {
				return nil, err
			}
		}

		candidateValues := append([]string{canonical.Value, normalizedValue}, duplicateValues...)
		uniqueValues := make([]string, 0, len(candidateValues))
		seenValues := make(map[string]struct{}, len(candidateValues))
		for _, value := range candidateValues {
			trimmed := strings.TrimSpace(value)
			if trimmed == "" {
				continue
			}
			if _, exists := seenValues[trimmed]; exists {
				continue
			}
			seenValues[trimmed] = struct{}{}
			uniqueValues = append(uniqueValues, trimmed)
		}

		if len(uniqueValues) > 0 {
			if err := tx.Model(&models.ProductAttributeValue{}).
				Where("category_key = ? AND option_value IN ?", canonical.CategoryKey, uniqueValues).
				Update("option_value", normalizedValue).Error; err != nil {
				return nil, err
			}
		}

		if len(duplicateIDs) > 0 {
			if err := tx.Delete(&models.ProductAttributeOption{}, "id IN ?", duplicateIDs).Error; err != nil {
				return nil, err
			}
		}

		cleanups = append(cleanups, productAttributeOptionDuplicateGroup{
			CategoryKey:     canonical.CategoryKey,
			NormalizedValue: normalizedValue,
			CanonicalID:     canonical.ID,
			CanonicalValue:  normalizedValue,
			DuplicateIDs:    duplicateIDs,
			DuplicateValues: duplicateValues,
		})
	}

	return cleanups, nil
}

func CleanupDuplicateProductAttributeOptions() ([]productAttributeOptionDuplicateGroup, error) {
	if db.DB == nil {
		return nil, nil
	}

	var cleanups []productAttributeOptionDuplicateGroup
	err := db.DB.Transaction(func(tx *gorm.DB) error {
		var err error
		cleanups, err = cleanupDuplicateProductAttributeOptionsTx(tx)
		return err
	})
	if err != nil {
		return nil, err
	}

	return cleanups, nil
}

func EnsureProductAttributeOptionValueUniqueIndex(tx *gorm.DB) error {
	if tx == nil || !tx.Migrator().HasTable(&models.ProductAttributeOption{}) {
		return nil
	}
	if err := tx.Exec("DROP INDEX IF EXISTS idx_product_attribute_options_category_value_ci").Error; err != nil {
		return err
	}
	return tx.Exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_product_attribute_options_category_value_ci ON product_attribute_options (category, LOWER(value)) WHERE deleted_at IS NULL").Error
}

func ensureProductAttributeOptionValueAvailable(tx *gorm.DB, categoryKey string, nextValue string, excludeID string) error {
	var items []models.ProductAttributeOption
	canonicalCategoryKey, err := resolveCanonicalProductAttributeCategoryKeyTx(tx, categoryKey)
	if err != nil {
		return err
	}
	if err := tx.Select("id", "category", "value").Find(&items).Error; err != nil {
		return err
	}
	for _, item := range items {
		if excludeID != "" && item.ID == excludeID {
			continue
		}
		if sameProductAttributeCategoryKey(item.CategoryKey, canonicalCategoryKey) && sameProductAttributeMachineValue(item.Value, nextValue) {
			return domainConflictError("产品属性分类项值重复")
		}
	}
	return nil
}

func isProductAttributeOptionImmutableField(field string) bool {
	switch field {
	case "category", "value":
		return true
	default:
		return false
	}
}

func classifyProductAttributeOptionError(err error) error {
	if err == nil {
		return nil
	}
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return domainNotFoundError("产品属性分类项不存在")
	}
	return err
}

func ListProductAttributeOptions(query ProductAttributeOptionListQuery) ([]models.ProductAttributeOption, error) {
	tx := db.DB.Model(&models.ProductAttributeOption{})
	if query.ActiveOnly {
		tx = tx.Where("active = ?", true)
	}

	var items []models.ProductAttributeOption
	if err := tx.Order("category asc").Order("sort_order asc").Order("label asc").Find(&items).Error; err != nil {
		return nil, err
	}
	categories, err := listProductAttributeCategoriesTx(db.DB)
	if err != nil {
		return nil, err
	}
	canonicalizeProductAttributeOptionCategoryKeys(categories, items)
	if strings.TrimSpace(query.CategoryKey) == "" {
		return items, nil
	}

	filtered := make([]models.ProductAttributeOption, 0, len(items))
	for _, item := range items {
		if sameProductAttributeCategoryKey(item.CategoryKey, query.CategoryKey) {
			filtered = append(filtered, item)
		}
	}
	return filtered, nil
}

func CreateProductAttributeOption(input SaveProductAttributeOptionInput) (models.ProductAttributeOption, error) {
	modelInput := toProductAttributeOptionModel(input)
	normalizeProductAttributeOption(&modelInput)
	if modelInput.Value == "" || !isValidProductAttributeMachineValue(modelInput.Value) {
		return models.ProductAttributeOption{}, domainValidationError("产品属性分类项机器值格式无效")
	}
	modelInput.Version = 1
	if err := db.DB.Transaction(func(tx *gorm.DB) error {
		canonicalCategoryKey, err := resolveCanonicalProductAttributeCategoryKeyTx(tx, modelInput.CategoryKey)
		if err != nil {
			return err
		}
		modelInput.CategoryKey = canonicalCategoryKey
		if err := ensureProductAttributeOptionValueAvailable(tx, modelInput.CategoryKey, modelInput.Value, ""); err != nil {
			return err
		}
		if modelInput.SortOrder <= 0 {
			nextSortOrder, err := nextProductAttributeOptionSortOrder(tx, modelInput.CategoryKey)
			if err != nil {
				return err
			}
			modelInput.SortOrder = nextSortOrder
		}
		return tx.Create(&modelInput).Error
	}); err != nil {
		return models.ProductAttributeOption{}, err
	}
	return modelInput, nil
}

func BuildProductAttributeOptionUpdates(payload map[string]json.RawMessage) (map[string]interface{}, error) {
	if err := validateSupportedTopLevelDeltaKeys(payload, "categoryKey", "value", "labelZh", "labelEn", "description", "sortOrder", "active", "revisionNo", "changeType", "changeOrderNo", "siteCode", "isDefaultSite", "version", "effectiveFrom", "effectiveTo"); err != nil {
		return nil, err
	}

	updates := make(map[string]interface{})
	for key, raw := range payload {
		valueRaw, err := extractDeltaNewValue(raw)
		if err != nil {
			return nil, err
		}
		switch key {
		case "categoryKey", "value", "labelZh", "labelEn", "description", "revisionNo", "changeType", "changeOrderNo", "siteCode":
			var value string
			if err := json.Unmarshal(valueRaw, &value); err != nil {
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
			if err := json.Unmarshal(valueRaw, &value); err != nil {
				return nil, err
			}
			if key == "sortOrder" {
				updates["sort_order"] = value
			} else {
				updates[key] = value
			}
		case "active", "isDefaultSite":
			var value bool
			if err := json.Unmarshal(valueRaw, &value); err != nil {
				return nil, err
			}
			updates[key] = value
		case "effectiveFrom", "effectiveTo":
			if string(valueRaw) == "null" {
				if key == "effectiveFrom" {
					updates["effective_from"] = nil
				} else {
					updates["effective_to"] = nil
				}
				continue
			}
			var value string
			if err := json.Unmarshal(valueRaw, &value); err != nil {
				return nil, err
			}
			if key == "effectiveFrom" {
				updates["effective_from"] = value
			} else {
				updates["effective_to"] = value
			}
		}
	}
	return updates, nil
}

func PatchProductAttributeOption(id string, updates map[string]interface{}) (models.ProductAttributeOption, error) {
	var existing models.ProductAttributeOption
	if err := db.DB.First(&existing, "id = ?", id).Error; err != nil {
		return models.ProductAttributeOption{}, classifyProductAttributeOptionError(err)
	}
	if nextCategory, ok := updates["category"].(string); ok {
		canonicalCategoryKey, err := resolveCanonicalProductAttributeCategoryKeyTx(db.DB, nextCategory)
		if err != nil {
			return models.ProductAttributeOption{}, err
		}
		updates["category"] = canonicalCategoryKey
		if isProductAttributeOptionImmutableField("category") && !sameProductAttributeCategoryKey(canonicalCategoryKey, existing.CategoryKey) {
			return models.ProductAttributeOption{}, domainError(DomainErrorConflict, "已有关联数据的分类项归属分类不允许修改")
		}
	}
	if nextValue, ok := updates["value"].(string); ok {
		if nextValue == "" || !isValidProductAttributeMachineValue(nextValue) {
			return models.ProductAttributeOption{}, domainError(DomainErrorValidation, "产品属性分类项机器值格式无效")
		}
		if isProductAttributeOptionImmutableField("value") && nextValue != existing.Value {
			return models.ProductAttributeOption{}, domainConflictError("已有关联数据的分类项机器值不允许修改")
		}
	}
	categoryKeyForValidation := existing.CategoryKey
	if nextCategory, ok := updates["category"].(string); ok {
		categoryKeyForValidation = nextCategory
	}
	if err := ensureProductAttributeOptionValueAvailable(db.DB, categoryKeyForValidation, existing.Value, id); err != nil {
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
	if canonicalCategoryKey, err := resolveCanonicalProductAttributeCategoryKeyTx(db.DB, existing.CategoryKey); err == nil {
		existing.CategoryKey = canonicalCategoryKey
	}
	return existing, nil
}

func ReorderProductAttributeOptions(categoryKey string, input ProductAttributeReorderInput) error {
	return db.DB.Transaction(func(tx *gorm.DB) error {
		canonicalCategoryKey, err := resolveCanonicalProductAttributeCategoryKeyTx(tx, categoryKey)
		if err != nil {
			return err
		}

		var existingItems []models.ProductAttributeOption
		if err := tx.Select("id").Where("category = ?", canonicalCategoryKey).Find(&existingItems).Error; err != nil {
			return err
		}
		if len(input.IDs) != len(existingItems) {
			return domainValidationError("产品属性分类项排序列表必须包含当前分类下全部分类项")
		}

		existingIDs := make(map[string]struct{}, len(existingItems))
		for _, item := range existingItems {
			existingIDs[item.ID] = struct{}{}
		}
		seenIDs := make(map[string]struct{}, len(input.IDs))

		for index, id := range input.IDs {
			trimmedID := strings.TrimSpace(id)
			if trimmedID == "" {
				return domainValidationError("产品属性分类项排序缺少 ID")
			}
			if _, exists := existingIDs[trimmedID]; !exists {
				return domainNotFoundError("产品属性分类项不存在")
			}
			if _, exists := seenIDs[trimmedID]; exists {
				return domainValidationError("产品属性分类项排序 ID 重复")
			}
			seenIDs[trimmedID] = struct{}{}
			result := tx.Model(&models.ProductAttributeOption{}).
				Where("id = ? AND category = ?", trimmedID, canonicalCategoryKey).
				Update("sort_order", (index+1)*productAttributeSortOrderStep)
			if result.Error != nil {
				return result.Error
			}
			if result.RowsAffected == 0 {
				return domainNotFoundError("产品属性分类项不存在")
			}
		}
		return nil
	})
}

func DeleteProductAttributeOption(id string) error {
	return db.DB.Delete(&models.ProductAttributeOption{}, "id = ?", id).Error
}

func SeedDefaultProductAttributeOptions(tx *gorm.DB) error {
	var existingCount int64
	if err := tx.Unscoped().Model(&models.ProductAttributeOption{}).Count(&existingCount).Error; err != nil {
		return err
	}
	if existingCount > 0 {
		return nil
	}

	for _, option := range defaultProductAttributeOptions() {
		item := option
		normalizeProductAttributeOption(&item)
		item.Version = 1
		if err := tx.Create(&item).Error; err != nil {
			return err
		}
	}

	return nil
}
