package services

import (
	"encoding/json"
	"strings"
	"xdfc-server/db"
	"xdfc-server/models"

	"github.com/google/uuid"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

func ListProductTemplates(query ProductTemplateListQuery) ([]models.ProductTemplate, int64, error) {
	page := query.Page
	pageSize := query.PageSize
	if page < 1 {
		page = 1
	}
	if pageSize < 1 {
		pageSize = 50
	}

	tx := db.DB.Model(&models.ProductTemplate{}).Preload("AttributeBindings", func(database *gorm.DB) *gorm.DB {
		return database.Order("sort_order asc").Order("category_key asc")
	})
	if err := ensureDefaultProductTemplates(db.DB); err != nil {
		return nil, 0, err
	}
	if query.Options {
		var templates []models.ProductTemplate
		if err := tx.Order("created_at desc").Find(&templates).Error; err != nil {
			return nil, 0, err
		}
		normalizeProductTemplateResponses(templates)
		return templates, int64(len(templates)), nil
	}

	var total int64
	if err := tx.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	var items []models.ProductTemplate
	if err := tx.Order("created_at desc").Limit(pageSize).Offset((page - 1) * pageSize).Find(&items).Error; err != nil {
		return nil, 0, err
	}
	normalizeProductTemplateResponses(items)
	return items, total, nil
}

func normalizeProductTemplateResponse(template *models.ProductTemplate) {
	if template == nil {
		return
	}
	if template.AttributeBindings == nil {
		template.AttributeBindings = []models.ProductTemplateAttributeBinding{}
	}
	for index := range template.AttributeBindings {
		if template.AttributeBindings[index].Options == nil {
			template.AttributeBindings[index].Options = []models.ProductTemplateAttributeOptionDefinition{}
		}
	}
}

func normalizeProductTemplateResponses(templates []models.ProductTemplate) {
	for idx := range templates {
		normalizeProductTemplateResponse(&templates[idx])
	}
}

func normalizeProductTemplateAttributeBinding(input *models.ProductTemplateAttributeBinding) {
	input.TemplateID = strings.TrimSpace(input.TemplateID)
	input.CategoryKey = strings.TrimSpace(input.CategoryKey)
	if input.SortOrder < 0 {
		input.SortOrder = 0
	}
	if input.Version == 0 {
		input.Version = 1
	}
}

func syncProductTemplateAttributeBindingsTx(tx *gorm.DB, templateID string, bindings []models.ProductTemplateAttributeBinding) error {
	if err := normalizeAndValidateTemplateOwnedAttributeDefinitions(bindings); err != nil {
		return err
	}
	if err := ensureTemplateOwnedAttributeEditsPreserveExistingProductValues(tx, templateID, bindings); err != nil {
		return err
	}
	if err := tx.Where("template_id = ?", templateID).Delete(&models.ProductTemplateAttributeBinding{}).Error; err != nil {
		return err
	}
	if len(bindings) == 0 {
		return nil
	}
	items := make([]models.ProductTemplateAttributeBinding, 0, len(bindings))
	for idx, binding := range bindings {
		item := binding
		item.ID = ""
		item.TemplateID = templateID
		item.SortOrder = idx + 1
		normalizeProductTemplateAttributeBinding(&item)
		items = append(items, item)
	}
	if err := tx.Create(&items).Error; err != nil {
		return err
	}
	// GORM applies default:true during Create, including explicitly false booleans.
	// Restore the submitted disabled states before this transaction becomes visible.
	inactiveDefinitionIDs := make([]string, 0)
	for index, binding := range bindings {
		if !binding.Active {
			inactiveDefinitionIDs = append(inactiveDefinitionIDs, items[index].ID)
		}
	}
	if len(inactiveDefinitionIDs) == 0 {
		return nil
	}
	return tx.Model(&models.ProductTemplateAttributeBinding{}).Where("id IN ?", inactiveDefinitionIDs).Update("active", false).Error
}

func SaveProductTemplate(input SaveProductTemplateInput) (models.ProductTemplate, error) {
	return saveProductTemplateWithinTransaction(db.DB, input)
}

func saveProductTemplateWithinTransaction(database *gorm.DB, input SaveProductTemplateInput) (models.ProductTemplate, error) {
	modelInput := models.ProductTemplate(input)
	bindings := append([]models.ProductTemplateAttributeBinding(nil), modelInput.AttributeBindings...)
	modelInput.AttributeBindings = nil
	var saved models.ProductTemplate

	err := database.Transaction(func(tx *gorm.DB) error {
		if modelInput.ID != "" {
			var existing models.ProductTemplate
			if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).Preload("AttributeBindings").Where("id = ?", modelInput.ID).First(&existing).Error; err != nil {
				return err
			}
			if modelInput.Version != existing.Version {
				return domainConflictError("product template version conflict")
			}

			modelInput.MasterDataControl.MergeMissingFrom(existing.MasterDataControl, "R1")
			modelInput.Version = existing.Version + 1
			if err := tx.Model(&existing).Select("Name", "Code", "ComponentKey", "Description", "Active", "Version", "MasterDataControl").Updates(modelInput).Error; err != nil {
				return err
			}
			if err := syncProductTemplateAttributeBindingsTx(tx, existing.ID, bindings); err != nil {
				return err
			}
			return tx.Preload("AttributeBindings", func(database *gorm.DB) *gorm.DB {
				return database.Order("sort_order asc").Order("category_key asc")
			}).First(&saved, "id = ?", existing.ID).Error
		}

		modelInput.MasterDataControl.Normalize("R1")
		modelInput.Version = 1
		if strings.TrimSpace(modelInput.ID) == "" {
			modelInput.ID = uuid.NewString()
		}
		if err := tx.Create(&modelInput).Error; err != nil {
			return err
		}
		if err := syncProductTemplateAttributeBindingsTx(tx, modelInput.ID, bindings); err != nil {
			return err
		}
		return tx.Preload("AttributeBindings", func(database *gorm.DB) *gorm.DB {
			return database.Order("sort_order asc").Order("category_key asc")
		}).First(&saved, "id = ?", modelInput.ID).Error
	})
	if err != nil {
		return models.ProductTemplate{}, err
	}
	normalizeProductTemplateResponse(&saved)
	return saved, nil
}

func BuildProductTemplateUpdates(payload map[string]json.RawMessage) (map[string]interface{}, error) {
	if err := validateSupportedTopLevelDeltaKeys(payload, "name", "code", "componentKey", "description", "active"); err != nil {
		return nil, err
	}

	updates := make(map[string]interface{})
	for key, raw := range payload {
		valueRaw, err := extractDeltaNewValue(raw)
		if err != nil {
			return nil, err
		}
		switch key {
		case "name", "code", "description", "componentKey":
			var value string
			if err := json.Unmarshal(valueRaw, &value); err != nil {
				return nil, err
			}
			if key == "componentKey" {
				updates["component_key"] = value
			} else {
				updates[key] = value
			}
		case "active":
			var value bool
			if err := json.Unmarshal(valueRaw, &value); err != nil {
				return nil, err
			}
			updates[key] = value
		}
	}
	return updates, nil
}

func PatchProductTemplate(id string, version int, updates map[string]interface{}) (models.ProductTemplate, error) {
	var saved models.ProductTemplate
	err := db.DB.Transaction(func(tx *gorm.DB) error {
		var existing models.ProductTemplate
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&existing, "id = ?", id).Error; err != nil {
			return err
		}
		if version > 0 && existing.Version != version {
			return domainConflictError("product template version conflict")
		}
		updates["version"] = existing.Version + 1
		if err := tx.Model(&existing).Updates(updates).Error; err != nil {
			return err
		}
		return tx.Preload("AttributeBindings", func(database *gorm.DB) *gorm.DB {
			return database.Order("sort_order asc").Order("category_key asc")
		}).First(&saved, "id = ?", id).Error
	})
	if err != nil {
		return models.ProductTemplate{}, err
	}
	normalizeProductTemplateResponse(&saved)
	return saved, nil
}

func DeleteProductTemplate(id string) error {
	return db.DB.Transaction(func(tx *gorm.DB) error {
		var template models.ProductTemplate
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&template, "id = ?", id).Error; err != nil {
			return err
		}
		var boundCategoryCount int64
		if err := tx.Model(&models.ProductType{}).Where("template_id = ?", id).Count(&boundCategoryCount).Error; err != nil {
			return err
		}
		if boundCategoryCount > 0 {
			return domainConflictError("该模板仍被产品分类或基础型号引用，请先在分类管理中调整模板关联")
		}
		if err := tx.Where("template_id = ?", id).Delete(&models.ProductTemplateAttributeBinding{}).Error; err != nil {
			return err
		}
		return tx.Delete(&template).Error
	})
}

func SyncProductTemplates(inputs []BulkSyncProductTemplateInput) error {
	return db.DB.Transaction(func(tx *gorm.DB) error {
		for _, in := range inputs {
			if _, err := saveProductTemplateWithinTransaction(tx, SaveProductTemplateInput(in)); err != nil {
				return err
			}
		}
		return nil
	})
}
