package services

import (
	"encoding/json"
	"strings"
	"xdfc-server/db"
	"xdfc-server/models"

	"github.com/google/uuid"
	"gorm.io/gorm"
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
	return tx.Create(&items).Error
}

func SaveProductTemplate(input SaveProductTemplateInput) (models.ProductTemplate, error) {
	modelInput := models.ProductTemplate(input)
	bindings := append([]models.ProductTemplateAttributeBinding(nil), modelInput.AttributeBindings...)
	modelInput.AttributeBindings = nil
	var saved models.ProductTemplate

	err := db.DB.Transaction(func(tx *gorm.DB) error {
		if modelInput.ID != "" {
			var existing models.ProductTemplate
			if err := tx.Preload("AttributeBindings").Where("id = ?", modelInput.ID).First(&existing).Error; err != nil {
				return err
			}
			if modelInput.Version != existing.Version {
				return domainConflictError("product template version conflict")
			}

			modelInput.MasterDataControl.MergeMissingFrom(existing.MasterDataControl, "R1")
			modelInput.Version = existing.Version + 1
			if err := tx.Model(&existing).Updates(modelInput).Error; err != nil {
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
	var existing models.ProductTemplate
	if err := db.DB.First(&existing, "id = ?", id).Error; err != nil {
		return models.ProductTemplate{}, err
	}
	if version > 0 && existing.Version != version {
		return models.ProductTemplate{}, domainConflictError("product template version conflict")
	}

	updates["version"] = existing.Version + 1
	if err := db.DB.Model(&existing).Updates(updates).Error; err != nil {
		return models.ProductTemplate{}, err
	}
	if err := db.DB.Preload("AttributeBindings", func(database *gorm.DB) *gorm.DB {
		return database.Order("sort_order asc").Order("category_key asc")
	}).First(&existing, "id = ?", id).Error; err != nil {
		return models.ProductTemplate{}, err
	}
	normalizeProductTemplateResponse(&existing)
	return existing, nil
}

func DeleteProductTemplate(id string) error {
	return db.DB.Delete(&models.ProductTemplate{}, "id = ?", id).Error
}

func SyncProductTemplates(inputs []BulkSyncProductTemplateInput) error {
	return db.DB.Transaction(func(tx *gorm.DB) error {
		for _, in := range inputs {
			template := models.ProductTemplate(in)
			template.MasterDataControl.Normalize("R1")
			if template.ID != "" {
				if err := tx.Model(&models.ProductTemplate{}).Where("id = ?", template.ID).Omit("CreatedAt", "CreatedBy").Updates(&template).Error; err != nil {
					return err
				}
				continue
			}

			if err := tx.Create(&template).Error; err != nil {
				return err
			}
		}
		return nil
	})
}
