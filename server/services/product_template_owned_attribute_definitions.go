package services

import (
	"strings"
	"xdfc-server/models"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

func normalizeAndValidateTemplateOwnedAttributeDefinitions(bindings []models.ProductTemplateAttributeBinding) error {
	seenCategories := make(map[string]bool)
	for index := range bindings {
		binding := &bindings[index]
		binding.CategoryKey = strings.TrimSpace(binding.CategoryKey)
		binding.NameZh = strings.TrimSpace(binding.NameZh)
		binding.NameEn = strings.TrimSpace(binding.NameEn)
		binding.Description = strings.TrimSpace(binding.Description)
		key := normalizeProductAttributeCategoryKeyForCompare(binding.CategoryKey)
		if key == "" || len(binding.CategoryKey) > 50 || !isValidProductAttributeMachineValue(key) || seenCategories[key] {
			return domainValidationError("当前模板的属性标识无效或重复")
		}
		if sameProductAttributeCategoryKey(binding.CategoryKey, "versionLevel") {
			return domainValidationError("产品档次由 BOM 管理，不能添加到产品模板属性")
		}
		if binding.NameZh == "" || len([]rune(binding.NameZh)) > 255 || len([]rune(binding.NameEn)) > 255 {
			return domainValidationError("模板属性名称不能为空，且不能超过 255 个字符")
		}
		seenCategories[key] = true
		seenValues := make(map[string]bool)
		if binding.Options == nil {
			binding.Options = []models.ProductTemplateAttributeOptionDefinition{}
		}
		for optionIndex := range binding.Options {
			option := &binding.Options[optionIndex]
			option.Value = strings.TrimSpace(option.Value)
			option.LabelZh = strings.TrimSpace(option.LabelZh)
			option.LabelEn = strings.TrimSpace(option.LabelEn)
			option.Description = strings.TrimSpace(option.Description)
			value := normalizeProductAttributeMachineValue(option.Value)
			if value == "" || len(option.Value) > 100 || !isValidProductAttributeMachineValue(value) || seenValues[value] {
				return domainValidationError("同一模板属性下的选项标识无效或重复")
			}
			if option.LabelZh == "" || len([]rune(option.LabelZh)) > 255 || len([]rune(option.LabelEn)) > 255 {
				return domainValidationError("模板属性选项名称不能为空，且不能超过 255 个字符")
			}
			seenValues[value] = true
			option.SortOrder = optionIndex + 1
		}
		binding.DefinitionVersion = 1
		binding.SortOrder = index + 1
	}
	return nil
}

func findTemplateOwnedAttributeDefinition(bindings []models.ProductTemplateAttributeBinding, categoryKey string) *models.ProductTemplateAttributeBinding {
	for index := range bindings {
		if sameProductAttributeCategoryKey(bindings[index].CategoryKey, categoryKey) {
			return &bindings[index]
		}
	}
	return nil
}

func findTemplateOwnedAttributeOption(binding *models.ProductTemplateAttributeBinding, value string) *models.ProductTemplateAttributeOptionDefinition {
	if binding == nil {
		return nil
	}
	for index := range binding.Options {
		if sameProductAttributeMachineValue(binding.Options[index].Value, value) {
			return &binding.Options[index]
		}
	}
	return nil
}

func ensureTemplateOwnedAttributeEditsPreserveExistingProductValues(tx *gorm.DB, templateID string, definitions []models.ProductTemplateAttributeBinding) error {
	typeBindings, err := loadProductTypeTemplateBindings(tx)
	if err != nil {
		return err
	}
	typeIDs := make([]string, 0)
	for typeID := range typeBindings {
		resolvedTemplateID, _ := resolveTemplateIDFromProductTypeChain(typeBindings, typeID)
		if resolvedTemplateID == templateID {
			typeIDs = append(typeIDs, typeID)
		}
	}
	if len(typeIDs) == 0 {
		return nil
	}
	var references []models.ProductAttributeValue
	if err := tx.Table("product_attribute_values AS attribute_values").
		Select("attribute_values.category_key", "attribute_values.option_value").
		Joins("JOIN products ON products.id = attribute_values.product_id AND products.deleted_at IS NULL").
		Where("products.type_id IN ? AND attribute_values.deleted_at IS NULL", typeIDs).
		Scan(&references).Error; err != nil {
		return err
	}
	// Include persisted fixed fields until their independent storage cleanup.
	var products []models.Product
	if err := tx.Select("tech_series", "tire_type", "brake_type").Where("type_id IN ?", typeIDs).Find(&products).Error; err != nil {
		return err
	}
	for _, product := range products {
		for _, reference := range []models.ProductAttributeValue{
			{CategoryKey: "techSeries", OptionValue: product.TechSeries},
			{CategoryKey: "tireType", OptionValue: product.TireType},
			{CategoryKey: "brakeType", OptionValue: product.BrakeType},
		} {
			if reference.OptionValue != "" {
				references = append(references, reference)
			}
		}
	}
	for _, reference := range references {
		definition := findTemplateOwnedAttributeDefinition(definitions, reference.CategoryKey)
		if findTemplateOwnedAttributeOption(definition, reference.OptionValue) == nil {
			return domainConflictError("该模板属性或选项已有产品使用，请停用后续使用，保留已有产品数据")
		}
	}
	return nil
}

func validateAndLockProductValuesAgainstOwnedTemplate(tx *gorm.DB, typeID string, values []models.ProductAttributeValue, productID string) error {
	if len(values) == 0 {
		return nil
	}
	typeBindings, err := loadProductTypeTemplateBindings(tx)
	if err != nil {
		return err
	}
	templateID, _ := resolveTemplateIDFromProductTypeChain(typeBindings, typeID)
	if templateID == "" {
		return domainValidationError("当前基础型号未关联有效模板，请先配置产品分类与模板关系")
	}
	var template models.ProductTemplate
	if err := tx.Clauses(clause.Locking{Strength: "KEY SHARE"}).First(&template, "id = ?", templateID).Error; err != nil {
		return domainValidationError("当前产品模板不存在，请刷新后重新选择基础型号")
	}
	var definitions []models.ProductTemplateAttributeBinding
	if err := tx.Where("template_id = ?", templateID).Find(&definitions).Error; err != nil {
		return err
	}
	var existingValues []models.ProductAttributeValue
	if productID != "" {
		if err := tx.Where("product_id = ?", productID).Find(&existingValues).Error; err != nil {
			return err
		}
	}
	seen := make(map[string]bool)
	for index := range values {
		value := &values[index]
		definition := findTemplateOwnedAttributeDefinition(definitions, value.CategoryKey)
		option := findTemplateOwnedAttributeOption(definition, value.OptionValue)
		if definition == nil || option == nil {
			return domainValidationError("属性或选项不属于当前产品模板，请刷新后重新选择")
		}
		key := normalizeProductAttributeCategoryKeyForCompare(definition.CategoryKey)
		if seen[key] {
			return domainValidationError("同一产品不能重复填写同一个模板属性")
		}
		seen[key] = true
		if !definition.Active || !option.Active {
			retained := false
			for _, existing := range existingValues {
				if sameProductAttributeCategoryKey(existing.CategoryKey, definition.CategoryKey) && sameProductAttributeMachineValue(existing.OptionValue, option.Value) {
					retained = true
				}
			}
			if !retained {
				return domainValidationError("该模板属性或选项已停用，请选择当前可用选项")
			}
		}
		value.CategoryKey, value.OptionValue = definition.CategoryKey, option.Value
	}
	return nil
}

func projectTemplateOwnedAttributeDefinitionsToCatalog(definitions []models.ProductTemplateAttributeBinding) ([]models.ProductAttributeCategory, []models.ProductAttributeOption) {
	categories := make([]models.ProductAttributeCategory, 0, len(definitions))
	options := make([]models.ProductAttributeOption, 0)
	for _, definition := range definitions {
		categories = append(categories, models.ProductAttributeCategory{
			BaseModel: definition.BaseModel, TemplateID: definition.TemplateID, Key: definition.CategoryKey,
			NameZh: definition.NameZh, NameEn: definition.NameEn, Description: definition.Description,
			SortOrder: definition.SortOrder, Active: definition.Active, Version: definition.Version,
		})
		for _, option := range definition.Options {
			options = append(options, models.ProductAttributeOption{
				BaseModel: models.BaseModel{ID: definition.ID + ":" + option.Value}, TemplateID: definition.TemplateID,
				CategoryKey: definition.CategoryKey, Value: option.Value, LabelZh: option.LabelZh, LabelEn: option.LabelEn,
				Description: option.Description, SortOrder: option.SortOrder, Active: definition.Active && option.Active, Version: definition.Version,
			})
		}
	}
	return categories, options
}

func loadTemplateOwnedAttributeCatalog(tx *gorm.DB) ([]models.ProductAttributeCategory, []models.ProductAttributeOption, error) {
	var definitions []models.ProductTemplateAttributeBinding
	if err := tx.Order("template_id").Order("sort_order").Find(&definitions).Error; err != nil {
		return nil, nil, err
	}
	categories, options := projectTemplateOwnedAttributeDefinitionsToCatalog(definitions)
	return categories, options, nil
}
