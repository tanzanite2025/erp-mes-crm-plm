package services

import (
	"encoding/json"
	"errors"
	"strings"
	"xdfc-server/db"
	"xdfc-server/models"

	"gorm.io/gorm"
)

var (
	ErrProductVersionConflict         = errors.New("product version conflict")
	ErrProductTemplateVersionConflict = errors.New("product template version conflict")
)

type ProductListQuery struct {
	Page     int
	PageSize int
	Options  bool
}

type ProductTemplateListQuery struct {
	Page     int
	PageSize int
	Options  bool
}

type ProductTypeListQuery struct {
	Page     int
	PageSize int
	Options  bool
}

type SaveProductInput models.Product
type BulkSyncProductInput models.Product
type SaveProductTemplateInput models.ProductTemplate
type BulkSyncProductTemplateInput models.ProductTemplate
type SyncProductTypeInput models.ProductType

func normalizeEngineeringSpecID(raw string) string {
	return strings.TrimSpace(raw)
}

func ListProducts(query ProductListQuery) ([]models.Product, int64, error) {
	page := query.Page
	pageSize := query.PageSize
	if page < 1 {
		page = 1
	}
	if pageSize < 1 {
		pageSize = 50
	}

	tx := db.DB.Model(&models.Product{})
	if query.Options {
		var products []models.Product
		if err := tx.Order("sku asc").Find(&products).Error; err != nil {
			return nil, 0, err
		}
		return products, int64(len(products)), nil
	}

	var total int64
	if err := tx.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	var items []models.Product
	if err := tx.Order("sku asc").Limit(pageSize).Offset((page - 1) * pageSize).Find(&items).Error; err != nil {
		return nil, 0, err
	}

	return items, total, nil
}

func GetProductByID(id string) (models.Product, error) {
	var product models.Product
	if err := db.DB.First(&product, "id = ?", id).Error; err != nil {
		return models.Product{}, err
	}
	return product, nil
}

func SaveProduct(input SaveProductInput) (models.Product, error) {
	modelInput := models.Product(input)
	var saved models.Product

	err := db.DB.Transaction(func(tx *gorm.DB) error {
		modelInput.EngineeringSpecID = normalizeEngineeringSpecID(modelInput.EngineeringSpecID)
		if modelInput.EngineeringSpecID != "" {
			var spec models.EngineeringSpec
			if err := tx.Where("id = ?", modelInput.EngineeringSpecID).First(&spec).Error; err != nil {
				return err
			}
		}

		if modelInput.ID != "" {
			var existing models.Product
			if err := tx.Where("id = ?", modelInput.ID).First(&existing).Error; err != nil {
				return err
			}
			if modelInput.Version != existing.Version {
				return ErrProductVersionConflict
			}

			modelInput.MasterDataControl.MergeMissingFrom(existing.MasterDataControl, "R1")
			modelInput.Version = existing.Version + 1
			if err := tx.Model(&existing).Updates(modelInput).Error; err != nil {
				return err
			}
			if modelInput.EngineeringSpecID == "" {
				if err := tx.Model(&existing).Update("engineering_spec_id", nil).Error; err != nil {
					return err
				}
			}
			return tx.First(&saved, "id = ?", existing.ID).Error
		}

		modelInput.MasterDataControl.Normalize("R1")
		modelInput.Version = 1
		createTx := tx
		if modelInput.EngineeringSpecID == "" {
			createTx = createTx.Omit("EngineeringSpecID")
		}
		if err := createTx.Create(&modelInput).Error; err != nil {
			return err
		}
		saved = modelInput
		return nil
	})
	if err != nil {
		return models.Product{}, err
	}
	return saved, nil
}

func BulkSyncProducts(inputs []BulkSyncProductInput) error {
	return db.DB.Transaction(func(tx *gorm.DB) error {
		for _, in := range inputs {
			product := models.Product(in)
			product.EngineeringSpecID = normalizeEngineeringSpecID(product.EngineeringSpecID)
			if product.EngineeringSpecID != "" {
				var spec models.EngineeringSpec
				if err := tx.Where("id = ?", product.EngineeringSpecID).First(&spec).Error; err != nil {
					return err
				}
			}
			product.MasterDataControl.Normalize("R1")
			saveTx := tx
			if product.EngineeringSpecID == "" {
				saveTx = saveTx.Omit("EngineeringSpecID")
			}

			if product.ID != "" {
				if err := saveTx.Model(&models.Product{}).Where("id = ?", product.ID).Omit("CreatedAt", "BaseModel.CreatedAt").Updates(&product).Error; err != nil {
					return err
				}
			} else {
				if err := saveTx.Create(&product).Error; err != nil {
					return err
				}
			}

			if product.ID != "" && product.EngineeringSpecID == "" {
				if err := tx.Model(&models.Product{}).Where("id = ?", product.ID).Update("engineering_spec_id", nil).Error; err != nil {
					return err
				}
			}
		}
		return nil
	})
}

func ListProductTemplates(query ProductTemplateListQuery) ([]models.ProductTemplate, int64, error) {
	page := query.Page
	pageSize := query.PageSize
	if page < 1 {
		page = 1
	}
	if pageSize < 1 {
		pageSize = 50
	}

	tx := db.DB.Model(&models.ProductTemplate{})
	if query.Options {
		var templates []models.ProductTemplate
		if err := tx.Order("created_at desc").Find(&templates).Error; err != nil {
			return nil, 0, err
		}
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
	return items, total, nil
}

func SaveProductTemplate(input SaveProductTemplateInput) (models.ProductTemplate, error) {
	modelInput := models.ProductTemplate(input)
	var saved models.ProductTemplate

	err := db.DB.Transaction(func(tx *gorm.DB) error {
		if modelInput.ID != "" {
			var existing models.ProductTemplate
			if err := tx.Where("id = ?", modelInput.ID).First(&existing).Error; err != nil {
				return err
			}
			if modelInput.Version != existing.Version {
				return ErrProductTemplateVersionConflict
			}

			modelInput.MasterDataControl.MergeMissingFrom(existing.MasterDataControl, "R1")
			modelInput.Version = existing.Version + 1
			if err := tx.Model(&existing).Updates(modelInput).Error; err != nil {
				return err
			}
			return tx.First(&saved, "id = ?", existing.ID).Error
		}

		modelInput.MasterDataControl.Normalize("R1")
		modelInput.Version = 1
		if err := tx.Create(&modelInput).Error; err != nil {
			return err
		}
		saved = modelInput
		return nil
	})
	if err != nil {
		return models.ProductTemplate{}, err
	}
	return saved, nil
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

func ListProductTypes(query ProductTypeListQuery) ([]models.ProductType, int64, error) {
	page := query.Page
	pageSize := query.PageSize
	if page < 1 {
		page = 1
	}
	if pageSize < 1 {
		pageSize = 50
	}

	tx := db.DB.Model(&models.ProductType{})
	preloadChildren := func(database *gorm.DB) *gorm.DB {
		return database.Order("sort_order asc")
	}
	if query.Options {
		var types []models.ProductType
		if err := tx.Order("sort_order asc").Preload("Children", preloadChildren).Find(&types).Error; err != nil {
			return nil, 0, err
		}
		return types, int64(len(types)), nil
	}

	var total int64
	if err := tx.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	var items []models.ProductType
	if err := tx.Order("sort_order asc").Preload("Children", preloadChildren).Limit(pageSize).Offset((page - 1) * pageSize).Find(&items).Error; err != nil {
		return nil, 0, err
	}

	return items, total, nil
}

func BuildProductTypeUpdates(payload map[string]json.RawMessage) (map[string]interface{}, error) {
	updates := make(map[string]interface{})
	for key, raw := range payload {
		switch key {
		case "name", "code", "description":
			var value string
			if err := json.Unmarshal(raw, &value); err != nil {
				return nil, err
			}
			updates[key] = value
		case "active":
			var value bool
			if err := json.Unmarshal(raw, &value); err != nil {
				return nil, err
			}
			updates[key] = value
		case "sortOrder":
			var value int
			if err := json.Unmarshal(raw, &value); err != nil {
				return nil, err
			}
			updates["sort_order"] = value
		case "parentId", "templateId":
			if string(raw) == "null" {
				updates[key] = nil
				continue
			}
			var value string
			if err := json.Unmarshal(raw, &value); err != nil {
				return nil, err
			}
			updates[key] = value
		case "id", "createdAt", "updatedAt":
		default:
		}
	}
	return updates, nil
}

func PatchProductType(id string, updates map[string]interface{}) (models.ProductType, error) {
	var existing models.ProductType
	if err := db.DB.First(&existing, "id = ?", id).Error; err != nil {
		return models.ProductType{}, err
	}
	if err := db.DB.Model(&existing).Updates(updates).Error; err != nil {
		return models.ProductType{}, err
	}
	if err := db.DB.First(&existing, "id = ?", id).Error; err != nil {
		return models.ProductType{}, err
	}
	return existing, nil
}

func CreateProductType(input models.ProductType) (models.ProductType, error) {
	if err := db.DB.Create(&input).Error; err != nil {
		return models.ProductType{}, err
	}
	return input, nil
}

func SyncProductTypes(inputs []SyncProductTypeInput) error {
	return db.DB.Transaction(func(tx *gorm.DB) error {
		for _, in := range inputs {
			productType := models.ProductType(in)
			if productType.ID != "" {
				if err := tx.Model(&models.ProductType{}).Where("id = ?", productType.ID).Omit("CreatedAt").Updates(&productType).Error; err != nil {
					return err
				}
				continue
			}
			if err := tx.Create(&productType).Error; err != nil {
				return err
			}
		}
		return nil
	})
}
