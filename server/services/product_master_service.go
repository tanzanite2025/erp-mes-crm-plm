package services

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"strconv"
	"strings"
	"time"
	"xdfc-server/db"
	"xdfc-server/models"
	"xdfc-server/productidentity"

	"gorm.io/gorm"
)

var ()

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

type productWriteAuditOptions struct {
	Action    string
	PatchDiff json.RawMessage
}

func normalizeEngineeringSpecID(raw string) string {
	return strings.TrimSpace(raw)
}

func normalizeProductWriteInput(input ProductWriteInput) ProductWriteInput {
	input.SKU = strings.ToUpper(strings.TrimSpace(input.SKU))
	input.Name = strings.TrimSpace(input.Name)
	input.TypeID = strings.TrimSpace(input.TypeID)
	input.ModelCode = strings.TrimSpace(input.ModelCode)
	input.VersionLevel = strings.ToUpper(strings.TrimSpace(input.VersionLevel))
	input.Status = strings.TrimSpace(input.Status)
	return input
}

func normalizeProductTypeCode(raw string) string {
	return productidentity.NormalizeTypeCode(raw)
}

func normalizeProductModelCode(raw string) string {
	return productidentity.NormalizeModelCode(raw)
}

func normalizeProductVersionLevel(raw string) string {
	return productidentity.NormalizeVersionLevel(raw)
}

func deriveVersionLevelFromAttributes(items []ProductAttributeValueAPIRequest) string {
	for _, item := range items {
		if !sameProductAttributeCategoryKey(strings.TrimSpace(item.CategoryKey), "versionLevel") {
			continue
		}
		return normalizeProductVersionLevel(item.OptionValue)
	}
	return ""
}

func deriveIssuedProductSKU(typeCode string, modelCode string, versionLevel string) string {
	return productidentity.DeriveSKU(typeCode, modelCode, versionLevel)
}

func issueProductIdentity(tx *gorm.DB, input ProductWriteInput) (ProductWriteInput, error) {
	if input.TypeID == "" {
		return input, domainValidationError("type id is required to issue sku")
	}

	var productType models.ProductType
	if err := tx.Select("id", "code").Where("id = ?", input.TypeID).First(&productType).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return input, domainNotFoundError(fmt.Sprintf("product type %s was not found for sku issuance", input.TypeID))
		}
		return input, err
	}

	typeCode := normalizeProductTypeCode(productType.Code)
	if typeCode == "" {
		return input, domainValidationError(fmt.Sprintf("product type %s has no code for sku issuance", productType.ID))
	}

	input.ModelCode = normalizeProductModelCode(input.ModelCode)
	if versionLevel := deriveVersionLevelFromAttributes(input.AttributeValues); versionLevel != "" {
		input.VersionLevel = versionLevel
	}
	input.VersionLevel = normalizeProductVersionLevel(input.VersionLevel)
	input.SKU = deriveIssuedProductSKU(typeCode, input.ModelCode, input.VersionLevel)

	return input, nil
}

func validateProductWriteInput(input ProductWriteInput) error {
	if input.SKU == "" {
		return domainValidationError("sku issuance produced an empty sku")
	}
	if input.Name == "" {
		return domainValidationError("name is required")
	}
	if input.TypeID == "" {
		return domainValidationError("type id is required")
	}
	return nil
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
	return enrichProductsForEditRead(tx, products)
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

func saveProductFromWriteInput(ctx context.Context, input ProductWriteInput, auditOptions productWriteAuditOptions) (models.Product, error) {
	input = normalizeProductWriteInput(input)
	var saved models.Product

	err := db.DB.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		issuedInput, err := issueProductIdentity(tx, input)
		if err != nil {
			return err
		}
		if err := validateProductWriteInput(issuedInput); err != nil {
			return err
		}

		modelInput := toProductModel(issuedInput)
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
			beforeItems := []models.Product{existing}
			if err := applyDerivedTemplateKeys(tx, beforeItems); err != nil {
				return err
			}
			before := productAuditSnapshot(beforeItems[0])
			if modelInput.Version != existing.Version {
				return domainConflictError("product version conflict")
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
			if len(auditOptions.PatchDiff) > 0 {
				return writeProductAuditDiffEntryWithContext(ctx, tx, saved.ID, strings.TrimSpace(auditOptions.Action), auditOptions.PatchDiff)
			}
			payload := productAuditSnapshot(saved)
			payload["operation"] = "update"
			return writeProductAuditEntryWithContext(ctx, tx, saved.ID, strings.TrimSpace(auditOptions.Action), before, payload)
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
		payload := productAuditSnapshot(saved)
		payload["operation"] = "create"
		return writeProductAuditEntryWithContext(ctx, tx, saved.ID, strings.TrimSpace(auditOptions.Action), nil, payload)
	})
	if err != nil {
		return models.Product{}, err
	}
	return saved, nil
}

func SaveProduct(ctx context.Context, input SaveProductAPIRequest) (models.Product, error) {
	return saveProductFromWriteInput(ctx, toProductWriteInput(input), productWriteAuditOptions{Action: "SAVE"})
}

func BuildProductPatchInput(id string, version int, payload map[string]json.RawMessage) (ProductWriteInput, error) {
	if err := validateSupportedTopLevelDeltaKeys(
		payload,
		"sku",
		"name",
		"modelCode",
		"typeId",
		"depth",
		"widthInternal",
		"widthExternal",
		"maxTirePressure",
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
		return ProductWriteInput{}, err
	}

	current, err := GetProductByID(id)
	if err != nil {
		return ProductWriteInput{}, err
	}

	input := toProductWriteInput(toProductAPIRequest(current))
	input.ID = id
	input.Version = version

	for key, raw := range payload {
		valueRaw, err := extractDeltaNewValue(raw)
		if err != nil {
			return ProductWriteInput{}, err
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
		case "maxTirePressure":
			err = json.Unmarshal(valueRaw, &input.MaxTirePressure)
		case "tireType":
			err = json.Unmarshal(valueRaw, &input.TireType)
		case "brakeType":
			err = json.Unmarshal(valueRaw, &input.BrakeType)
		case "techSeries":
			err = json.Unmarshal(valueRaw, &input.TechSeries)
		case "versionLevel":
			err = json.Unmarshal(valueRaw, &input.VersionLevel)
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
			return ProductWriteInput{}, err
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

func PatchProduct(ctx context.Context, id string, version int, payload map[string]json.RawMessage) (models.Product, error) {
	input, err := BuildProductPatchInput(id, version, payload)
	if err != nil {
		return models.Product{}, err
	}
	before, err := GetProductByID(id)
	if err != nil {
		return models.Product{}, err
	}
	return saveProductFromWriteInput(ctx, input, productWriteAuditOptions{
		Action:    "PATCH",
		PatchDiff: productPatchAuditDiff(productAuditSnapshot(before), payload),
	})
}
func GetNextProductModelCode(typeID string) (string, error) {
	normalizedTypeID := strings.TrimSpace(typeID)
	if normalizedTypeID == "" {
		return "", domainValidationError("type id is required")
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
		return "", domainConflictError(fmt.Sprintf("product model code exhausted for type %s", normalizedTypeID))
	}
	return fmt.Sprintf("%02d", nextCode), nil
}

func DeleteProduct(ctx context.Context, id string) error {
	referenceChecks := []any{
		&models.BOM{},
		&models.SalesOrderLine{},
		&models.SalesReturnLine{},
		&models.SalesExchangeLine{},
		&models.LogisticsRecord{},
		&models.PrintBatch{},
		&models.ProductInventoryMaterialMapping{},
		&models.ProductionPlan{},
		&models.InspectionTask{},
		&models.PieceworkRate{},
		&models.PieceworkRecord{},
	}

	for _, model := range referenceChecks {
		var count int64
		if err := db.DB.Model(model).Where("product_id = ?", id).Count(&count).Error; err != nil {
			return err
		}
		if count > 0 {
			return domainConflictError("product still referenced by downstream records")
		}
	}

	return db.DB.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var product models.Product
		if err := tx.Preload("AttributeValues", func(database *gorm.DB) *gorm.DB {
			return database.Order("sort_order asc").Order("category_key asc")
		}).First(&product, "id = ?", id).Error; err != nil {
			return err
		}
		items := []models.Product{product}
		if err := applyDerivedTemplateKeys(tx, items); err != nil {
			return err
		}
		product = items[0]
		before := productAuditSnapshot(product)
		if err := tx.Delete(&models.Product{}, "id = ?", id).Error; err != nil {
			return err
		}
		payload := map[string]any{
			"id":     strings.TrimSpace(product.ID),
			"sku":    strings.TrimSpace(product.SKU),
			"name":   strings.TrimSpace(product.Name),
			"typeId": strings.TrimSpace(product.TypeID),
		}
		return writeProductAuditEntryWithContext(ctx, tx, strings.TrimSpace(product.ID), "DELETE", before, payload)
	})
}
