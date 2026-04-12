package services

import (
	"strings"
	"xdfc-server/models"

	"gorm.io/gorm"
)

type productTypeTemplateBinding struct {
	ID         string
	ParentID   *string
	TemplateID *string
}

func resolveTemplateIDFromProductTypeChain(bindings map[string]productTypeTemplateBinding, typeID string) string {
	currentTypeID := strings.TrimSpace(typeID)
	visited := make(map[string]struct{})

	for currentTypeID != "" {
		if _, exists := visited[currentTypeID]; exists {
			return ""
		}
		visited[currentTypeID] = struct{}{}

		binding, ok := bindings[currentTypeID]
		if !ok {
			return ""
		}

		if binding.TemplateID != nil {
			templateID := strings.TrimSpace(*binding.TemplateID)
			if templateID != "" {
				return templateID
			}
		}

		if binding.ParentID == nil {
			return ""
		}

		currentTypeID = strings.TrimSpace(*binding.ParentID)
	}

	return ""
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

func loadTemplateKeyByTemplateID(tx *gorm.DB, bindings map[string]productTypeTemplateBinding) (map[string]string, error) {
	templateIDs := make([]string, 0, len(bindings))
	seenTemplateIDs := make(map[string]struct{}, len(bindings))
	for _, productType := range bindings {
		templateID := resolveTemplateIDFromProductTypeChain(bindings, productType.ID)
		if templateID == "" {
			continue
		}
		if _, exists := seenTemplateIDs[templateID]; exists {
			continue
		}
		seenTemplateIDs[templateID] = struct{}{}
		templateIDs = append(templateIDs, templateID)
	}

	templateKeyByID := make(map[string]string, len(templateIDs))
	if len(templateIDs) == 0 {
		return templateKeyByID, nil
	}

	var templates []models.ProductTemplate
	if err := tx.Select("id", "component_key").Where("id IN ?", templateIDs).Find(&templates).Error; err != nil {
		return nil, err
	}

	for _, template := range templates {
		templateKeyByID[template.ID] = strings.TrimSpace(template.ComponentKey)
	}

	return templateKeyByID, nil
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

	templateKeyByID, err := loadTemplateKeyByTemplateID(tx, bindings)
	if err != nil {
		return err
	}

	for idx := range products {
		typeID := strings.TrimSpace(products[idx].TypeID)
		templateID := resolveTemplateIDFromProductTypeChain(bindings, typeID)
		if templateID == "" {
			products[idx].TemplateKey = ""
			continue
		}
		products[idx].TemplateKey = templateKeyByID[templateID]
	}

	return nil
}
