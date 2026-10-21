package services

import (
	"xdfc-server/models"

	"gorm.io/gorm"
)

func ensureProductAttributeCatalogRecordHasNoReferences(tx *gorm.DB, categoryKey, optionValue string) error {
	// Only these fixed columns consume catalog values outside the dynamic reference table.
	for _, field := range []struct {
		categoryKey string
		column      string
		model       interface{}
	}{
		{"techSeries", "tech_series", &models.Product{}},
		{"tireType", "tire_type", &models.Product{}},
		{"brakeType", "brake_type", &models.Product{}},
		{"versionLevel", "version_level", &models.BOM{}},
	} {
		if !sameProductAttributeCategoryKey(categoryKey, field.categoryKey) {
			continue
		}
		var values []string
		if err := tx.Model(field.model).Where(field.column+" IS NOT NULL AND "+field.column+" <> ''").Distinct().Pluck(field.column, &values).Error; err != nil {
			return err
		}
		for _, value := range values {
			if optionValue == "" || sameProductAttributeMachineValue(value, optionValue) {
				return domainConflictError("该产品属性已被产品或 BOM 使用，请停用而不要删除")
			}
		}
	}
	var productReferences []models.ProductAttributeValue
	if err := tx.Model(&models.ProductAttributeValue{}).Distinct("category_key", "option_value").Find(&productReferences).Error; err != nil {
		return err
	}
	for _, reference := range productReferences {
		if sameProductAttributeCategoryKey(reference.CategoryKey, categoryKey) &&
			(optionValue == "" || sameProductAttributeMachineValue(reference.OptionValue, optionValue)) {
			return domainConflictError("该产品属性已被产品使用，请停用而不要删除")
		}
	}
	if optionValue != "" {
		return nil
	}
	var templateReferences []models.ProductTemplateAttributeBinding
	if err := tx.Model(&models.ProductTemplateAttributeBinding{}).Distinct("category_key").Find(&templateReferences).Error; err != nil {
		return err
	}
	for _, reference := range templateReferences {
		if sameProductAttributeCategoryKey(reference.CategoryKey, categoryKey) {
			return domainConflictError("该产品属性分类已被产品模板使用，请停用而不要删除")
		}
	}
	return nil
}

func listProductAttributeOptionsForCanonicalCategory(tx *gorm.DB, categoryKey string) ([]models.ProductAttributeOption, error) {
	var options []models.ProductAttributeOption
	if err := tx.Select("id", "category").Find(&options).Error; err != nil {
		return nil, err
	}
	matchingOptions := make([]models.ProductAttributeOption, 0)
	for _, option := range options {
		if sameProductAttributeCategoryKey(option.CategoryKey, categoryKey) {
			matchingOptions = append(matchingOptions, option)
		}
	}
	return matchingOptions, nil
}
