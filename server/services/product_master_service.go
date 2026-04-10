package services

import (
	"encoding/json"
	"errors"
	"fmt"
	"strconv"
	"strings"
	"time"
	"xdfc-server/db"
	"xdfc-server/models"

	"gorm.io/gorm"
)

var (
	ErrProductVersionConflict         = errors.New("product version conflict")
	ErrProductInUse                   = errors.New("product still referenced by downstream records")
	ErrProductTemplateVersionConflict = errors.New("product template version conflict")
	ErrProductTypeVersionConflict     = errors.New("product type version conflict")
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

type SaveProductTemplateInput models.ProductTemplate
type BulkSyncProductTemplateInput models.ProductTemplate
type SyncProductTypeInput models.ProductType

func normalizeEngineeringSpecID(raw string) string {
	return strings.TrimSpace(raw)
}

func normalizeProductAttributeValues(items []models.ProductAttributeValue) []models.ProductAttributeValue {
	result := make([]models.ProductAttributeValue, 0, len(items))
	for idx, item := range items {
		item.ProductID = strings.TrimSpace(item.ProductID)
		item.CategoryKey = strings.TrimSpace(item.CategoryKey)
		item.OptionValue = strings.TrimSpace(item.OptionValue)
		if item.CategoryKey == "" || item.OptionValue == "" {
			continue
		}
		if item.SortOrder == 0 {
			item.SortOrder = idx + 1
		}
		if item.Version == 0 {
			item.Version = 1
		}
		result = append(result, item)
	}
	return result
}

func replaceProductAttributeValues(tx *gorm.DB, productID string, items []models.ProductAttributeValue) error {
	if err := tx.Where("product_id = ?", productID).Delete(&models.ProductAttributeValue{}).Error; err != nil {
		return err
	}
	if len(items) == 0 {
		return nil
	}
	for idx := range items {
		items[idx].ID = ""
		items[idx].ProductID = productID
		items[idx].SortOrder = idx + 1
		if items[idx].Version == 0 {
			items[idx].Version = 1
		}
	}
	return tx.Create(&items).Error
}

func applyDerivedTemplateKeys(tx *gorm.DB, products []models.Product) error {
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

	var productTypes []models.ProductType
	if err := tx.Select("id", "template_id").Where("id IN ?", typeIDs).Find(&productTypes).Error; err != nil {
		return err
	}

	typeToTemplateID := make(map[string]string, len(productTypes))
	templateIDs := make([]string, 0, len(productTypes))
	seenTemplateIDs := make(map[string]struct{}, len(productTypes))
	for _, productType := range productTypes {
		if productType.TemplateID == nil {
			continue
		}
		templateID := strings.TrimSpace(*productType.TemplateID)
		if templateID == "" {
			continue
		}
		typeToTemplateID[productType.ID] = templateID
		if _, exists := seenTemplateIDs[templateID]; exists {
			continue
		}
		seenTemplateIDs[templateID] = struct{}{}
		templateIDs = append(templateIDs, templateID)
	}

	templateKeyByID := make(map[string]string, len(templateIDs))
	if len(templateIDs) > 0 {
		var templates []models.ProductTemplate
		if err := tx.Select("id", "component_key").Where("id IN ?", templateIDs).Find(&templates).Error; err != nil {
			return err
		}
		for _, template := range templates {
			templateKeyByID[template.ID] = strings.TrimSpace(template.ComponentKey)
		}
	}

	for idx := range products {
		typeID := strings.TrimSpace(products[idx].TypeID)
		templateID, ok := typeToTemplateID[typeID]
		if !ok {
			products[idx].TemplateKey = ""
			continue
		}
		products[idx].TemplateKey = templateKeyByID[templateID]
	}

	return nil
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

	tx := db.DB.Model(&models.Product{}).Preload("AttributeValues", func(database *gorm.DB) *gorm.DB {
		return database.Order("sort_order asc").Order("category_key asc")
	})
	if query.Options {
		var products []models.Product
		if err := tx.Order("sku asc").Find(&products).Error; err != nil {
			return nil, 0, err
		}
		if err := applyDerivedTemplateKeys(db.DB, products); err != nil {
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
	if err := applyDerivedTemplateKeys(db.DB, items); err != nil {
		return nil, 0, err
	}

	return items, total, nil
}

func GetProductByID(id string) (models.Product, error) {
	var product models.Product
	if err := db.DB.Preload("AttributeValues", func(database *gorm.DB) *gorm.DB {
		return database.Order("sort_order asc").Order("category_key asc")
	}).First(&product, "id = ?", id).Error; err != nil {
		return models.Product{}, err
	}
	items := []models.Product{product}
	if err := applyDerivedTemplateKeys(db.DB, items); err != nil {
		return models.Product{}, err
	}
	return items[0], nil
}

func SaveProduct(input SaveProductAPIRequest) (models.Product, error) {
	modelInput := toProductModel(input)
	var saved models.Product

	err := db.DB.Transaction(func(tx *gorm.DB) error {
		modelInput.EngineeringSpecID = normalizeEngineeringSpecID(modelInput.EngineeringSpecID)
		modelInput.AttributeValues = normalizeProductAttributeValues(modelInput.AttributeValues)
		if modelInput.EngineeringSpecID != "" {
			var spec models.EngineeringSpec
			if err := tx.Where("id = ?", modelInput.EngineeringSpecID).First(&spec).Error; err != nil {
				return err
			}
		}

		if modelInput.ID != "" {
			var existing models.Product
			if err := tx.Preload("AttributeValues").Where("id = ?", modelInput.ID).First(&existing).Error; err != nil {
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
			if err := replaceProductAttributeValues(tx, existing.ID, modelInput.AttributeValues); err != nil {
				return err
			}
			if modelInput.EngineeringSpecID == "" {
				if err := tx.Model(&existing).Update("engineering_spec_id", nil).Error; err != nil {
					return err
				}
			}
			if err := tx.Preload("AttributeValues", func(database *gorm.DB) *gorm.DB {
				return database.Order("sort_order asc").Order("category_key asc")
			}).First(&saved, "id = ?", existing.ID).Error; err != nil {
				return err
			}
			items := []models.Product{saved}
			if err := applyDerivedTemplateKeys(tx, items); err != nil {
				return err
			}
			saved = items[0]
			return nil
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
		if err := replaceProductAttributeValues(tx, modelInput.ID, modelInput.AttributeValues); err != nil {
			return err
		}
		if err := tx.Preload("AttributeValues", func(database *gorm.DB) *gorm.DB {
			return database.Order("sort_order asc").Order("category_key asc")
		}).First(&saved, "id = ?", modelInput.ID).Error; err != nil {
			return err
		}
		items := []models.Product{saved}
		if err := applyDerivedTemplateKeys(tx, items); err != nil {
			return err
		}
		saved = items[0]
		return nil
	})
	if err != nil {
		return models.Product{}, err
	}
	return saved, nil
}

func BuildProductPatchInput(id string, version int, payload map[string]json.RawMessage) (SaveProductAPIRequest, error) {
	if err := validateSupportedTopLevelDeltaKeys(
		payload,
		"sku",
		"name",
		"modelCode",
		"typeId",
		"depth",
		"widthInternal",
		"widthExternal",
		"tireType",
		"brakeType",
		"techSeries",
		"versionLevel",
		"weight",
		"length",
		"angle",
		"clamp",
		"offset",
		"axleCrown",
		"steerer",
		"image",
		"restrictions",
		"moldGroup",
		"description",
		"engineeringSpecId",
		"attributeValues",
		"techSpecs",
		"barcodeConfig",
		"attachments",
		"status",
		"revisionNo",
		"effectiveFrom",
		"effectiveTo",
		"changeType",
		"changeOrderNo",
		"siteCode",
		"isDefaultSite",
	); err != nil {
		return SaveProductAPIRequest{}, err
	}

	current, err := GetProductByID(id)
	if err != nil {
		return SaveProductAPIRequest{}, err
	}

	input := toProductAPIRequest(current)
	input.ID = id
	input.Version = version

	for key, raw := range payload {
		valueRaw, err := extractDeltaNewValue(raw)
		if err != nil {
			return SaveProductAPIRequest{}, err
		}

		switch key {
		case "sku":
			err = json.Unmarshal(valueRaw, &input.SKU)
		case "name":
			err = json.Unmarshal(valueRaw, &input.Name)
		case "modelCode":
			err = json.Unmarshal(valueRaw, &input.ModelCode)
		case "typeId":
			err = json.Unmarshal(valueRaw, &input.TypeID)
		case "depth":
			err = json.Unmarshal(valueRaw, &input.Depth)
		case "widthInternal":
			err = json.Unmarshal(valueRaw, &input.WidthInternal)
		case "widthExternal":
			err = json.Unmarshal(valueRaw, &input.WidthExternal)
		case "tireType":
			err = json.Unmarshal(valueRaw, &input.TireType)
		case "brakeType":
			err = json.Unmarshal(valueRaw, &input.BrakeType)
		case "techSeries":
			err = json.Unmarshal(valueRaw, &input.TechSeries)
		case "versionLevel":
			err = json.Unmarshal(valueRaw, &input.VersionLevel)
		case "weight":
			err = json.Unmarshal(valueRaw, &input.Weight)
		case "length":
			err = json.Unmarshal(valueRaw, &input.Length)
		case "angle":
			err = json.Unmarshal(valueRaw, &input.Angle)
		case "clamp":
			err = json.Unmarshal(valueRaw, &input.Clamp)
		case "offset":
			err = json.Unmarshal(valueRaw, &input.Offset)
		case "axleCrown":
			err = json.Unmarshal(valueRaw, &input.AxleCrown)
		case "steerer":
			err = json.Unmarshal(valueRaw, &input.Steerer)
		case "image":
			err = json.Unmarshal(valueRaw, &input.Image)
		case "restrictions":
			if string(valueRaw) == "null" {
				input.Restrictions = nil
				continue
			}
			err = json.Unmarshal(valueRaw, &input.Restrictions)
		case "moldGroup":
			err = json.Unmarshal(valueRaw, &input.MoldGroup)
		case "description":
			err = json.Unmarshal(valueRaw, &input.Description)
		case "engineeringSpecId":
			if string(valueRaw) == "null" {
				input.EngineeringSpecID = ""
				continue
			}
			err = json.Unmarshal(valueRaw, &input.EngineeringSpecID)
		case "attributeValues":
			if string(valueRaw) == "null" {
				input.AttributeValues = nil
				continue
			}
			err = json.Unmarshal(valueRaw, &input.AttributeValues)
		case "techSpecs":
			if string(valueRaw) == "null" {
				input.TechSpecs = nil
				continue
			}
			input.TechSpecs = cloneProductRawMessage(valueRaw)
			continue
		case "barcodeConfig":
			if string(valueRaw) == "null" {
				input.BarcodeConfig = nil
				continue
			}
			input.BarcodeConfig = cloneProductRawMessage(valueRaw)
			continue
		case "attachments":
			if string(valueRaw) == "null" {
				input.Attachments = nil
				continue
			}
			input.Attachments = cloneProductRawMessage(valueRaw)
			continue
		case "status":
			err = json.Unmarshal(valueRaw, &input.Status)
		case "revisionNo":
			err = json.Unmarshal(valueRaw, &input.RevisionNo)
		case "effectiveFrom":
			if string(valueRaw) == "null" {
				input.EffectiveFrom = nil
				continue
			}
			input.EffectiveFrom, err = parseRFC3339Time(valueRaw)
		case "effectiveTo":
			if string(valueRaw) == "null" {
				input.EffectiveTo = nil
				continue
			}
			input.EffectiveTo, err = parseRFC3339Time(valueRaw)
		case "changeType":
			err = json.Unmarshal(valueRaw, &input.ChangeType)
		case "changeOrderNo":
			err = json.Unmarshal(valueRaw, &input.ChangeOrderNo)
		case "siteCode":
			err = json.Unmarshal(valueRaw, &input.SiteCode)
		case "isDefaultSite":
			err = json.Unmarshal(valueRaw, &input.IsDefaultSite)
		}

		if err != nil {
			return SaveProductAPIRequest{}, err
		}
	}

	return input, nil
}

func parseRFC3339Time(raw json.RawMessage) (*time.Time, error) {
	var value string
	if err := json.Unmarshal(raw, &value); err != nil {
		return nil, err
	}
	trimmed := strings.TrimSpace(value)
	if trimmed == "" {
		return nil, nil
	}
	parsed, err := time.Parse(time.RFC3339, trimmed)
	if err != nil {
		return nil, err
	}
	return &parsed, nil
}

func PatchProduct(id string, version int, payload map[string]json.RawMessage) (models.Product, error) {
	input, err := BuildProductPatchInput(id, version, payload)
	if err != nil {
		return models.Product{}, err
	}
	return SaveProduct(input)
}

func BulkSyncProducts(input BulkSyncProductsAPIPayload) error {
	return db.DB.Transaction(func(tx *gorm.DB) error {
		for _, in := range input.Products {
			product := toProductModel(in)
			product.EngineeringSpecID = normalizeEngineeringSpecID(product.EngineeringSpecID)
			product.AttributeValues = normalizeProductAttributeValues(product.AttributeValues)
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
				if err := replaceProductAttributeValues(tx, product.ID, product.AttributeValues); err != nil {
					return err
				}
			} else {
				if err := saveTx.Create(&product).Error; err != nil {
					return err
				}
				if err := replaceProductAttributeValues(tx, product.ID, product.AttributeValues); err != nil {
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

func GetNextProductModelCode(typeID string) (string, error) {
	normalizedTypeID := strings.TrimSpace(typeID)
	if normalizedTypeID == "" {
		return "", errors.New("type id is required")
	}

	var codes []string
	if err := db.DB.Model(&models.Product{}).Where("type_id = ?", normalizedTypeID).Pluck("model_code", &codes).Error; err != nil {
		return "", err
	}

	maxCode := 0
	for _, code := range codes {
		value, err := strconv.Atoi(strings.TrimSpace(code))
		if err != nil {
			continue
		}
		if value > maxCode {
			maxCode = value
		}
	}

	nextCode := maxCode + 1
	if nextCode < 1 {
		nextCode = 1
	}
	if nextCode > 99 {
		return "", fmt.Errorf("product model code exhausted for type %s", normalizedTypeID)
	}
	return fmt.Sprintf("%02d", nextCode), nil
}

func DeleteProduct(id string) error {
	referenceChecks := []any{
		&models.BOM{},
		&models.ChangeOrder{},
		&models.SalesOrderLine{},
		&models.LogisticsRecord{},
		&models.ProductionPlan{},
		&models.InspectionTask{},
		&models.PieceworkRate{},
	}

	for _, model := range referenceChecks {
		var count int64
		if err := db.DB.Model(model).Where("product_id = ?", id).Count(&count).Error; err != nil {
			return err
		}
		if count > 0 {
			return ErrProductInUse
		}
	}

	return db.DB.Delete(&models.Product{}, "id = ?", id).Error
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
	if err := ensureDefaultProductTemplates(db.DB); err != nil {
		return nil, 0, err
	}
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
		return models.ProductTemplate{}, ErrProductTemplateVersionConflict
	}

	updates["version"] = existing.Version + 1
	if err := db.DB.Model(&existing).Updates(updates).Error; err != nil {
		return models.ProductTemplate{}, err
	}
	if err := db.DB.First(&existing, "id = ?", id).Error; err != nil {
		return models.ProductTemplate{}, err
	}
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
	if err := validateSupportedTopLevelDeltaKeys(payload, "parentId", "templateId", "name", "code", "description", "active", "sortOrder"); err != nil {
		return nil, err
	}
	updates := make(map[string]interface{})
	for key, raw := range payload {
		valueRaw, err := extractDeltaNewValue(raw)
		if err != nil {
			return nil, err
		}
		switch key {
		case "name", "code", "description":
			var value string
			if err := json.Unmarshal(valueRaw, &value); err != nil {
				return nil, err
			}
			updates[key] = value
		case "active":
			var value bool
			if err := json.Unmarshal(valueRaw, &value); err != nil {
				return nil, err
			}
			updates[key] = value
		case "sortOrder":
			var value int
			if err := json.Unmarshal(valueRaw, &value); err != nil {
				return nil, err
			}
			updates["sort_order"] = value
		case "parentId", "templateId":
			if string(valueRaw) == "null" {
				updates[key] = nil
				continue
			}
			var value string
			if err := json.Unmarshal(valueRaw, &value); err != nil {
				return nil, err
			}
			updates[key] = value
		default:
		}
	}
	return updates, nil
}

func PatchProductType(id string, version int, updates map[string]interface{}) (models.ProductType, error) {
	var existing models.ProductType
	if err := db.DB.First(&existing, "id = ?", id).Error; err != nil {
		return models.ProductType{}, err
	}
	if version > 0 && existing.Version != version {
		return models.ProductType{}, ErrProductTypeVersionConflict
	}
	updates["version"] = existing.Version + 1
	if err := db.DB.Model(&existing).Updates(updates).Error; err != nil {
		return models.ProductType{}, err
	}
	if err := db.DB.First(&existing, "id = ?", id).Error; err != nil {
		return models.ProductType{}, err
	}
	return existing, nil
}

func CreateProductType(input models.ProductType) (models.ProductType, error) {
	if input.Version == 0 {
		input.Version = 1
	}
	if err := db.DB.Create(&input).Error; err != nil {
		return models.ProductType{}, err
	}
	return input, nil
}

func DeleteProductType(id string) error {
	return db.DB.Delete(&models.ProductType{}, "id = ?", id).Error
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
