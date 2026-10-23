package services

import (
	"strings"
	"xdfc-server/models"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

// Reference writers take key-share category locks; catalog deletions take update locks.
// Lock IDs in a stable order so transactions referencing several categories agree.
func lockProductAttributeCatalogCategoriesWithinTransaction(tx *gorm.DB, categoryKeys []string, strength string) ([]models.ProductAttributeCategory, error) {
	if len(categoryKeys) == 0 {
		return nil, nil
	}
	for _, key := range categoryKeys {
		if sameProductAttributeCategoryKey(key, "versionLevel") {
			if err := ensureBOMPerformanceVersionCatalogCategoryWithinTransaction(tx); err != nil {
				return nil, err
			}
			break
		}
	}
	var categories []models.ProductAttributeCategory
	if err := tx.Select("id", "key").Find(&categories).Error; err != nil {
		return nil, err
	}
	categoryIDs := make([]string, 0, len(categoryKeys))
	seenIDs := make(map[string]bool)
	for _, key := range categoryKeys {
		canonicalKey, found := resolveCanonicalProductAttributeCategoryKeyFromList(categories, key)
		if !found {
			return nil, domainValidationError("产品属性归属分类不存在或已删除，请刷新后重新选择")
		}
		for _, category := range categories {
			if category.Key == canonicalKey && !seenIDs[category.ID] {
				categoryIDs = append(categoryIDs, category.ID)
				seenIDs[category.ID] = true
			}
		}
	}
	var lockedCategories []models.ProductAttributeCategory
	if err := tx.Clauses(clause.Locking{Strength: strength}).Select("id", "key").
		Where("id IN ?", categoryIDs).Order("id asc").Find(&lockedCategories).Error; err != nil {
		return nil, err
	}
	if len(lockedCategories) != len(categoryIDs) {
		return nil, domainConflictError("产品属性分类已被删除，请刷新后重新选择")
	}
	return lockedCategories, nil
}

func validateAndLockProductAttributeValueReferences(tx *gorm.DB, references []models.ProductAttributeValue) error {
	if len(references) == 0 {
		return nil
	}
	categoryKeys := make([]string, 0, len(references))
	for _, reference := range references {
		categoryKeys = append(categoryKeys, reference.CategoryKey)
	}
	categories, err := lockProductAttributeCatalogCategoriesWithinTransaction(tx, categoryKeys, "KEY SHARE")
	if err != nil {
		return err
	}
	var options []models.ProductAttributeOption
	if err := tx.Select("category", "value").Find(&options).Error; err != nil {
		return err
	}
	for index := range references {
		canonicalKey, _ := resolveCanonicalProductAttributeCategoryKeyFromList(categories, references[index].CategoryKey)
		found := false
		for _, option := range options {
			if sameProductAttributeCategoryKey(option.CategoryKey, canonicalKey) && sameProductAttributeMachineValue(option.Value, references[index].OptionValue) {
				references[index].CategoryKey = canonicalKey
				references[index].OptionValue = option.Value
				found = true
				break
			}
		}
		if !found {
			return domainValidationError("产品属性分类项不存在或已删除，请刷新后重新选择")
		}
	}
	return nil
}

func validateAndLockProductLegacyAttributeFieldReferences(tx *gorm.DB, product *models.Product) error {
	fields := []struct {
		categoryKey string
		value       *string
	}{
		{"techSeries", &product.TechSeries}, {"tireType", &product.TireType}, {"brakeType", &product.BrakeType},
	}
	references := make([]models.ProductAttributeValue, 0, len(fields))
	for _, field := range fields {
		if strings.TrimSpace(*field.value) != "" {
			references = append(references, models.ProductAttributeValue{CategoryKey: field.categoryKey, OptionValue: *field.value})
		}
	}
	if err := validateAndLockProductValuesAgainstOwnedTemplate(tx, product.TypeID, references, product.ID); err != nil {
		return err
	}
	for _, reference := range references {
		for _, field := range fields {
			if sameProductAttributeCategoryKey(reference.CategoryKey, field.categoryKey) {
				*field.value = reference.OptionValue
			}
		}
	}
	return nil
}

func validateAndLockBOMVersionLevelAttributeReference(tx *gorm.DB, bom *models.BOM) error {
	if strings.TrimSpace(bom.VersionLevel) == "" {
		return nil
	}
	references := []models.ProductAttributeValue{{CategoryKey: "versionLevel", OptionValue: bom.VersionLevel}}
	if err := validateAndLockProductAttributeValueReferences(tx, references); err != nil {
		return err
	}
	bom.VersionLevel = references[0].OptionValue
	return nil
}
