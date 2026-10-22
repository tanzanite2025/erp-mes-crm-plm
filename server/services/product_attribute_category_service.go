package services

import (
	"encoding/json"
	"errors"
	"strings"
	"time"
	"xdfc-server/db"
	"xdfc-server/models"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type ProductAttributeCategoryListQuery struct {
	ActiveOnly bool
}

type SaveProductAttributeCategoryInput struct {
	ID            string     `json:"id"`
	Key           string     `json:"key"`
	NameZh        string     `json:"nameZh"`
	NameEn        string     `json:"nameEn"`
	Description   string     `json:"description"`
	SortOrder     int        `json:"sortOrder"`
	Active        bool       `json:"active"`
	RevisionNo    string     `json:"revisionNo"`
	ChangeType    string     `json:"changeType"`
	ChangeOrderNo string     `json:"changeOrderNo"`
	SiteCode      string     `json:"siteCode"`
	IsDefaultSite bool       `json:"isDefaultSite"`
	EffectiveFrom *time.Time `json:"effectiveFrom"`
	EffectiveTo   *time.Time `json:"effectiveTo"`
	Version       int        `json:"version"`
}

type ProductAttributeReorderInput struct {
	IDs []string `json:"ids"`
}

const productAttributeSortOrderStep = 10

func nextProductAttributeCategorySortOrder(tx *gorm.DB) (int, error) {
	var maxSortOrder int
	if err := tx.Model(&models.ProductAttributeCategory{}).
		Select("COALESCE(MAX(sort_order), 0)").
		Scan(&maxSortOrder).Error; err != nil {
		return 0, err
	}
	return maxSortOrder + productAttributeSortOrderStep, nil
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
			EffectiveFrom: input.EffectiveFrom,
			EffectiveTo:   input.EffectiveTo,
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
			return domainConflictError("产品属性分类编码重复")
		}
	}
	return nil
}

func isProductAttributeCategoryImmutableField(field string) bool {
	switch field {
	case "key":
		return true
	default:
		return false
	}
}

func classifyProductAttributeCategoryError(err error) error {
	if err == nil {
		return nil
	}
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return domainNotFoundError("产品属性分类不存在")
	}
	return err
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
	// Only BOM grade definitions remain in the standalone catalog. Product
	// attributes are projected from each owning template below.
	tx := db.DB.Model(&models.ProductAttributeCategory{}).Where("LOWER(key) = ?", "versionlevel")
	if query.ActiveOnly {
		tx = tx.Where("active = ?", true)
	}

	var items []models.ProductAttributeCategory
	if err := tx.Order("sort_order asc").Order("name_zh asc").Find(&items).Error; err != nil {
		return nil, err
	}
	ownedCategories, _, err := loadTemplateOwnedAttributeCatalog(db.DB)
	if err != nil {
		return nil, err
	}
	for _, category := range ownedCategories {
		if !query.ActiveOnly || category.Active {
			items = append(items, category)
		}
	}
	return items, nil
}

func CreateProductAttributeCategory(input SaveProductAttributeCategoryInput) (models.ProductAttributeCategory, error) {
	modelInput := toProductAttributeCategoryModel(input)
	normalizeProductAttributeCategory(&modelInput)
	if modelInput.NameZh == "" {
		return models.ProductAttributeCategory{}, domainValidationError("产品属性中文名称不能为空")
	}
	if modelInput.Key == "" || !isValidProductAttributeMachineValue(modelInput.Key) {
		return models.ProductAttributeCategory{}, domainError(DomainErrorValidation, "产品属性分类编码格式无效")
	}
	modelInput.Version = 1
	if err := db.DB.Transaction(func(tx *gorm.DB) error {
		if err := ensureProductAttributeCategoryKeyAvailable(tx, modelInput.Key, ""); err != nil {
			return err
		}
		if modelInput.SortOrder <= 0 {
			nextSortOrder, err := nextProductAttributeCategorySortOrder(tx)
			if err != nil {
				return err
			}
			modelInput.SortOrder = nextSortOrder
		}
		// Omit boolean defaults during Create so explicit false values survive GORM.
		if err := tx.Omit("Active", "IsDefaultSite").Create(&modelInput).Error; err != nil {
			return err
		}
		return tx.Model(&modelInput).Updates(map[string]interface{}{
			"active": modelInput.Active, "is_default_site": modelInput.IsDefaultSite,
		}).Error
	}); err != nil {
		return models.ProductAttributeCategory{}, err
	}
	return modelInput, nil
}

func BuildProductAttributeCategoryUpdates(payload map[string]json.RawMessage) (map[string]interface{}, error) {
	return buildProductAttributeCatalogColumnUpdates(payload, map[string]string{
		"key": "key", "nameZh": "name_zh", "nameEn": "name_en",
	})
}

func PatchProductAttributeCategory(id string, version int, updates map[string]interface{}) (models.ProductAttributeCategory, error) {
	if version < 1 {
		return models.ProductAttributeCategory{}, domainValidationError("编辑产品属性分类需要有效版本")
	}
	var existing models.ProductAttributeCategory
	if err := db.DB.Transaction(func(tx *gorm.DB) error {
		if err := tx.First(&existing, "id = ?", id).Error; err != nil {
			return classifyProductAttributeCategoryError(err)
		}
		if existing.Version != version {
			return domainConflictError("产品属性分类已被其他操作修改，请刷新后重新编辑")
		}
		if nextKey, ok := updates["key"].(string); ok {
			if nextKey == "" || !isValidProductAttributeMachineValue(nextKey) {
				return domainValidationError("产品属性分类编码格式无效")
			}
			if isProductAttributeCategoryImmutableField("key") && !sameProductAttributeCategoryKey(nextKey, existing.Key) {
				return domainConflictError("已有关联数据的分类编码不允许修改")
			}
			// Compatibility spellings must not rewrite identifiers referenced by products.
			delete(updates, "key")
		}
		if err := ensureProductAttributeCategoryKeyAvailable(tx, existing.Key, id); err != nil {
			return err
		}
		updates["version"] = version + 1
		result := tx.Model(&existing).Where("version = ?", version).Updates(updates)
		if result.Error != nil {
			return result.Error
		}
		if result.RowsAffected != 1 {
			return domainConflictError("产品属性分类已被其他操作修改，请刷新后重新编辑")
		}
		existing = models.ProductAttributeCategory{}
		return tx.First(&existing, "id = ?", id).Error
	}); err != nil {
		return models.ProductAttributeCategory{}, err
	}
	return existing, nil
}

func ReorderProductAttributeCategories(input ProductAttributeReorderInput) error {
	return db.DB.Transaction(func(tx *gorm.DB) error {
		var existingItems []models.ProductAttributeCategory
		if err := tx.Clauses(clause.Locking{Strength: "NO KEY UPDATE"}).Select("id").Order("id asc").Find(&existingItems).Error; err != nil {
			return err
		}
		if len(input.IDs) != len(existingItems) {
			return domainValidationError("产品属性分类排序列表必须包含全部分类")
		}

		existingIDs := make(map[string]struct{}, len(existingItems))
		for _, item := range existingItems {
			existingIDs[item.ID] = struct{}{}
		}
		seenIDs := make(map[string]struct{}, len(input.IDs))

		for index, id := range input.IDs {
			trimmedID := strings.TrimSpace(id)
			if trimmedID == "" {
				return domainValidationError("产品属性分类排序缺少 ID")
			}
			if _, exists := existingIDs[trimmedID]; !exists {
				return domainNotFoundError("产品属性分类不存在")
			}
			if _, exists := seenIDs[trimmedID]; exists {
				return domainValidationError("产品属性分类排序 ID 重复")
			}
			seenIDs[trimmedID] = struct{}{}
			result := tx.Model(&models.ProductAttributeCategory{}).
				Where("id = ?", trimmedID).
				Update("sort_order", (index+1)*productAttributeSortOrderStep)
			if result.Error != nil {
				return result.Error
			}
			if result.RowsAffected == 0 {
				return domainNotFoundError("产品属性分类不存在")
			}
		}
		return nil
	})
}

func DeleteProductAttributeCategory(id string) error {
	return db.DB.Transaction(func(tx *gorm.DB) error {
		var category models.ProductAttributeCategory
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&category, "id = ?", id).Error; err != nil {
			return classifyProductAttributeCategoryError(err)
		}
		if err := ensureProductAttributeCatalogRecordHasNoReferences(tx, category.Key, ""); err != nil {
			return err
		}
		options, err := listProductAttributeOptionsForCanonicalCategory(tx, category.Key)
		if err != nil {
			return err
		}
		if len(options) > 0 {
			optionIDs := make([]string, 0, len(options))
			for _, option := range options {
				optionIDs = append(optionIDs, option.ID)
			}
			if err := tx.Delete(&models.ProductAttributeOption{}, "id IN ?", optionIDs).Error; err != nil {
				return err
			}
		}
		return tx.Delete(&category).Error
	})
}

func SeedDefaultProductAttributeCategories(tx *gorm.DB) error {
	var existingCount int64
	if err := tx.Unscoped().Model(&models.ProductAttributeCategory{}).Count(&existingCount).Error; err != nil {
		return err
	}
	if existingCount > 0 {
		return nil
	}

	for _, category := range defaultProductAttributeCategories() {
		item := category
		normalizeProductAttributeCategory(&item)
		item.Version = 1
		if err := tx.Create(&item).Error; err != nil {
			return err
		}
	}
	return nil
}
