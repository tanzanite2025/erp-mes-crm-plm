package services

import (
	"strings"
	"xdfc-server/db"
	"xdfc-server/models"

	"gorm.io/gorm"
)

type productTypeTemplateBinding struct {
	ID         string
	ParentID   *string
	TemplateID *string
}

type ProductTemplateResolutionResult struct {
	TemplateID  string
	TemplateKey string
	Source      string
	Error       string
}

func resolveTemplateIDFromProductTypeChain(bindings map[string]productTypeTemplateBinding, typeID string) (string, string) {
	currentTypeID := strings.TrimSpace(typeID)
	if currentTypeID == "" {
		return "", "missingTypeId"
	}
	visited := make(map[string]struct{})

	for currentTypeID != "" {
		if _, exists := visited[currentTypeID]; exists {
			return "", "cyclicTypeChain"
		}
		visited[currentTypeID] = struct{}{}

		binding, ok := bindings[currentTypeID]
		if !ok {
			return "", "missingTypeBinding"
		}

		if binding.TemplateID != nil {
			templateID := strings.TrimSpace(*binding.TemplateID)
			if templateID != "" {
				return templateID, "typeBinding"
			}
		}

		if binding.ParentID == nil {
			return "", "missingTemplateBinding"
		}

		currentTypeID = strings.TrimSpace(*binding.ParentID)
	}

	return "", "missingTemplateBinding"
}

func loadProductTypeTemplateBindings(tx *gorm.DB) (map[string]productTypeTemplateBinding, error) {
	var productTypes []productTypeTemplateBinding
	if err := tx.Table(models.ProductType{}.TableName()).Select("id", "parent_id", "template_id").Find(&productTypes).Error; err != nil {
		return nil, err
	}

	bindings := make(map[string]productTypeTemplateBinding, len(productTypes))
	for _, productType := range productTypes {
		bindings[productType.ID] = productType
	}

	return bindings, nil
}

func loadTemplateKeyByTemplateID(tx *gorm.DB, bindings map[string]productTypeTemplateBinding) (map[string]models.ProductTemplate, error) {
	templateIDs := make([]string, 0, len(bindings))
	seenTemplateIDs := make(map[string]struct{}, len(bindings))
	for _, productType := range bindings {
		templateID, _ := resolveTemplateIDFromProductTypeChain(bindings, productType.ID)
		if templateID == "" {
			continue
		}
		if _, exists := seenTemplateIDs[templateID]; exists {
			continue
		}
		seenTemplateIDs[templateID] = struct{}{}
		templateIDs = append(templateIDs, templateID)
	}

	templateByID := make(map[string]models.ProductTemplate, len(templateIDs))
	if len(templateIDs) == 0 {
		return templateByID, nil
	}

	var templates []models.ProductTemplate
	if err := tx.Select("id", "component_key", "active").Where("id IN ?", templateIDs).Find(&templates).Error; err != nil {
		return nil, err
	}

	for _, template := range templates {
		template.ComponentKey = strings.TrimSpace(template.ComponentKey)
		templateByID[template.ID] = template
	}

	return templateByID, nil
}

func resolveProductTemplate(bindings map[string]productTypeTemplateBinding, templates map[string]models.ProductTemplate, typeID string) ProductTemplateResolutionResult {
	templateID, source := resolveTemplateIDFromProductTypeChain(bindings, typeID)
	if templateID == "" {
		return ProductTemplateResolutionResult{
			Source: source,
			Error:  source,
		}
	}

	template, ok := templates[templateID]
	if !ok {
		return ProductTemplateResolutionResult{
			TemplateID: templateID,
			Source:     source,
			Error:      "templateNotFound",
		}
	}

	if !template.Active {
		return ProductTemplateResolutionResult{
			TemplateID:  templateID,
			TemplateKey: template.ComponentKey,
			Source:      source,
			Error:       "templateInactive",
		}
	}

	if template.ComponentKey == "" {
		return ProductTemplateResolutionResult{
			TemplateID: templateID,
			Source:     source,
			Error:      "templateKeyMissing",
		}
	}

	return ProductTemplateResolutionResult{
		TemplateID:  templateID,
		TemplateKey: template.ComponentKey,
		Source:      source,
	}
}

func ResolveProductTypeTemplate(typeID string) (ProductTemplateResolutionResult, error) {
	bindings, err := loadProductTypeTemplateBindings(db.DB)
	if err != nil {
		return ProductTemplateResolutionResult{}, err
	}

	templatesByID, err := loadTemplateKeyByTemplateID(db.DB, bindings)
	if err != nil {
		return ProductTemplateResolutionResult{}, err
	}

	return resolveProductTemplate(bindings, templatesByID, typeID), nil
}

func enrichProductsForEditRead(tx *gorm.DB, products []models.Product) error {
	if len(products) == 0 {
		return nil
	}

	typeIDs := make([]string, 0, len(products))
	seenTypeIDs := make(map[string]struct{}, len(products))
	for _, product := range products {
		typeID := strings.TrimSpace(product.TypeID)
		if typeID == "" {
			continue
		}
		if _, exists := seenTypeIDs[typeID]; exists {
			continue
		}
		seenTypeIDs[typeID] = struct{}{}
		typeIDs = append(typeIDs, typeID)
	}

	if len(typeIDs) == 0 {
		for idx := range products {
			products[idx].TemplateKey = ""
		}
		return nil
	}

	bindings, err := loadProductTypeTemplateBindings(tx)
	if err != nil {
		return err
	}

	templatesByID, err := loadTemplateKeyByTemplateID(tx, bindings)
	if err != nil {
		return err
	}

	for idx := range products {
		typeID := strings.TrimSpace(products[idx].TypeID)
		resolution := resolveProductTemplate(bindings, templatesByID, typeID)
		products[idx].ResolvedTemplateID = resolution.TemplateID
		products[idx].ResolvedTemplateKey = resolution.TemplateKey
		products[idx].TemplateResolutionSource = resolution.Source
		products[idx].TemplateResolutionError = resolution.Error
		products[idx].TemplateKey = resolution.TemplateKey
	}

	return nil
}
