package db

import (
	"fmt"
	"xdfc-server/models"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

// MigrateProductTemplateOwnedAttributeDefinitions copies the old references once.
// Product attribute keys and values stay unchanged, so existing products retain
// their selections. Subsequent template edits no longer read the old catalog.
func MigrateProductTemplateOwnedAttributeDefinitions(database *gorm.DB) error {
	return database.Transaction(func(tx *gorm.DB) error {
		if tx.Dialector.Name() == "postgres" {
			if err := tx.Exec("SELECT pg_advisory_xact_lock(2026102201)").Error; err != nil {
				return err
			}
		}
		if err := backfillTemplateAttributeBindingsRequiredByExistingProducts(tx); err != nil {
			return err
		}
		var bindings []models.ProductTemplateAttributeBinding
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).Where("definition_version = 0").Order("id").Find(&bindings).Error; err != nil {
			return err
		}
		if len(bindings) == 0 {
			return nil
		}
		var categories []models.ProductAttributeCategory
		if err := tx.Find(&categories).Error; err != nil {
			return err
		}
		var options []models.ProductAttributeOption
		if err := tx.Order("sort_order").Order("id").Find(&options).Error; err != nil {
			return err
		}
		for _, binding := range bindings {
			var category *models.ProductAttributeCategory
			for index := range categories {
				if normalizeProductAttributeMachineValueForDB(categories[index].Key) == normalizeProductAttributeMachineValueForDB(binding.CategoryKey) {
					category = &categories[index]
					break
				}
			}
			if category == nil {
				return fmt.Errorf("template %s attribute %s has no definition; migration rolled back", binding.TemplateID, binding.CategoryKey)
			}
			binding.NameZh, binding.NameEn, binding.Description = category.NameZh, category.NameEn, category.Description
			binding.Options = make([]models.ProductTemplateAttributeOptionDefinition, 0)
			for _, option := range options {
				if normalizeProductAttributeMachineValueForDB(option.CategoryKey) == normalizeProductAttributeMachineValueForDB(category.Key) {
					binding.Options = append(binding.Options, models.ProductTemplateAttributeOptionDefinition{
						Value: option.Value, LabelZh: option.LabelZh, LabelEn: option.LabelEn,
						Description: option.Description, SortOrder: option.SortOrder, Active: option.Active,
					})
				}
			}
			binding.DefinitionVersion = 1
			if err := tx.Model(&binding).Select("NameZh", "NameEn", "Description", "Options", "DefinitionVersion").Updates(&binding).Error; err != nil {
				return err
			}
		}
		return nil
	})
}

func backfillTemplateAttributeBindingsRequiredByExistingProducts(tx *gorm.DB) error {
	if !tx.Migrator().HasTable(&models.Product{}) || !tx.Migrator().HasTable(&models.ProductType{}) || !tx.Migrator().HasTable(&models.ProductTemplate{}) {
		return nil
	}
	var productTypes []models.ProductType
	if err := tx.Select("id", "parent_id", "template_id").Find(&productTypes).Error; err != nil {
		return err
	}
	typesByID := make(map[string]models.ProductType, len(productTypes))
	for _, productType := range productTypes {
		typesByID[productType.ID] = productType
	}
	var templates []models.ProductTemplate
	if err := tx.Select("id").Find(&templates).Error; err != nil {
		return err
	}
	existingTemplateIDs := make(map[string]bool, len(templates))
	for _, template := range templates {
		existingTemplateIDs[template.ID] = true
	}
	var bindings []models.ProductTemplateAttributeBinding
	if err := tx.Find(&bindings).Error; err != nil {
		return err
	}
	keysByTemplate := make(map[string]map[string]bool)
	maxSortOrderByTemplate := make(map[string]int)
	for _, binding := range bindings {
		if keysByTemplate[binding.TemplateID] == nil {
			keysByTemplate[binding.TemplateID] = make(map[string]bool)
		}
		keysByTemplate[binding.TemplateID][normalizeProductAttributeMachineValueForDB(binding.CategoryKey)] = true
		if binding.SortOrder > maxSortOrderByTemplate[binding.TemplateID] {
			maxSortOrderByTemplate[binding.TemplateID] = binding.SortOrder
		}
	}
	var products []models.Product
	if err := tx.Select("id", "type_id", "tech_series", "tire_type", "brake_type").Preload("AttributeValues").Find(&products).Error; err != nil {
		return err
	}
	for _, product := range products {
		templateID := ""
		visited := make(map[string]bool)
		for typeID := product.TypeID; typeID != "" && !visited[typeID]; {
			visited[typeID] = true
			productType, found := typesByID[typeID]
			if !found {
				break
			}
			if productType.TemplateID != nil && *productType.TemplateID != "" {
				templateID = *productType.TemplateID
				break
			}
			if productType.ParentID == nil {
				break
			}
			typeID = *productType.ParentID
		}
		if !existingTemplateIDs[templateID] {
			continue
		}
		if keysByTemplate[templateID] == nil {
			keysByTemplate[templateID] = make(map[string]bool)
		}
		values := append(product.AttributeValues,
			models.ProductAttributeValue{CategoryKey: "techSeries", OptionValue: product.TechSeries},
			models.ProductAttributeValue{CategoryKey: "tireType", OptionValue: product.TireType},
			models.ProductAttributeValue{CategoryKey: "brakeType", OptionValue: product.BrakeType})
		for _, value := range values {
			key := normalizeProductAttributeMachineValueForDB(value.CategoryKey)
			if value.OptionValue == "" || key == "versionlevel" || keysByTemplate[templateID][key] {
				continue
			}
			maxSortOrderByTemplate[templateID]++
			binding := models.ProductTemplateAttributeBinding{TemplateID: templateID, CategoryKey: value.CategoryKey, SortOrder: maxSortOrderByTemplate[templateID], Active: true, Version: 1}
			if err := tx.Create(&binding).Error; err != nil {
				return err
			}
			keysByTemplate[templateID][key] = true
		}
	}
	return nil
}
