package services

import (
	"errors"
	"fmt"
	"strings"
	"xdfc-server/models"

	"gorm.io/gorm"
)

const (
	ProductInventoryMaterialResolutionExplicitMapping       = "EXPLICIT_MAPPING"
	ProductInventoryMaterialResolutionProductID             = "PRODUCT_ID_AS_MATERIAL_ID"
	ProductInventoryMaterialResolutionProductSKU            = "PRODUCT_SKU_TO_MATERIAL_CODE"
	ProductInventoryMaterialResolutionProductModelCode      = "PRODUCT_MODEL_CODE_TO_MATERIAL_CODE"
	ProductInventoryMaterialResolutionProductName           = "PRODUCT_NAME_TO_UNIQUE_MATERIAL_NAME"
	ProductInventoryMaterialResolutionSalesLineProductCode  = "SALES_LINE_PRODUCT_CODE_TO_MATERIAL_CODE"
	ProductInventoryMaterialResolutionSalesLineProductModel = "SALES_LINE_PRODUCT_MODEL_TO_MATERIAL_CODE"
	ProductInventoryMaterialResolutionSalesLineProductName  = "SALES_LINE_PRODUCT_MODEL_TO_UNIQUE_MATERIAL_NAME"
)

type ProductInventoryMaterialResolutionSnapshot struct {
	ProductID    string
	ProductCode  string
	ProductModel string
}

type ProductInventoryMaterialResolution struct {
	Material    models.Material
	Strategy    string
	SourceValue string
}

func ResolveInventoryMaterialForProductSnapshotTx(tx *gorm.DB, snapshot ProductInventoryMaterialResolutionSnapshot) (ProductInventoryMaterialResolution, error) {
	if tx == nil {
		return ProductInventoryMaterialResolution{}, errors.New("transaction is required")
	}

	normalized := ProductInventoryMaterialResolutionSnapshot{
		ProductID:    strings.TrimSpace(snapshot.ProductID),
		ProductCode:  strings.TrimSpace(snapshot.ProductCode),
		ProductModel: strings.TrimSpace(snapshot.ProductModel),
	}

	productNameCandidate := ""
	if normalized.ProductID != "" {
		resolution, found, err := resolveInventoryMaterialByExplicitProductMappingTx(tx, normalized.ProductID)
		if err != nil || found {
			return resolution, err
		}

		resolution, found, err = resolveInventoryMaterialByIDTx(
			tx,
			normalized.ProductID,
			ProductInventoryMaterialResolutionProductID,
			normalized.ProductID,
		)
		if err != nil || found {
			return resolution, err
		}

		product, found, err := loadProductForInventoryMaterialResolutionTx(tx, normalized.ProductID)
		if err != nil {
			return ProductInventoryMaterialResolution{}, err
		}
		if found {
			for _, candidate := range []struct {
				value    string
				strategy string
			}{
				{product.SKU, ProductInventoryMaterialResolutionProductSKU},
				{product.ModelCode, ProductInventoryMaterialResolutionProductModelCode},
			} {
				resolution, matched, err := resolveInventoryMaterialByCodeTx(tx, candidate.value, candidate.strategy)
				if err != nil || matched {
					return resolution, err
				}
			}
			productNameCandidate = product.Name
		}
	}

	for _, candidate := range []struct {
		value    string
		strategy string
	}{
		{normalized.ProductCode, ProductInventoryMaterialResolutionSalesLineProductCode},
		{normalized.ProductModel, ProductInventoryMaterialResolutionSalesLineProductModel},
	} {
		resolution, matched, err := resolveInventoryMaterialByCodeTx(tx, candidate.value, candidate.strategy)
		if err != nil || matched {
			return resolution, err
		}
	}

	for _, candidate := range []struct {
		value    string
		strategy string
	}{
		{productNameCandidate, ProductInventoryMaterialResolutionProductName},
		{normalized.ProductModel, ProductInventoryMaterialResolutionSalesLineProductName},
	} {
		resolution, matched, err := resolveInventoryMaterialByUniqueNameTx(tx, candidate.value, candidate.strategy)
		if err != nil || matched {
			return resolution, err
		}
	}

	return ProductInventoryMaterialResolution{}, fmt.Errorf(
		"[CRITICAL_DATA_INTEGRITY] product inventory material mapping not found: productId=%s productCode=%s productModel=%s",
		normalized.ProductID,
		normalized.ProductCode,
		normalized.ProductModel,
	)
}

func resolveInventoryMaterialByExplicitProductMappingTx(tx *gorm.DB, productID string) (ProductInventoryMaterialResolution, bool, error) {
	var mapping models.ProductInventoryMaterialMapping
	err := tx.Where("product_id = ? AND active = ?", productID, true).First(&mapping).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return ProductInventoryMaterialResolution{}, false, nil
	}
	if err != nil {
		return ProductInventoryMaterialResolution{}, false, err
	}

	resolution, found, err := resolveInventoryMaterialByIDTx(
		tx,
		mapping.MaterialID,
		ProductInventoryMaterialResolutionExplicitMapping,
		productID,
	)
	if err != nil {
		return ProductInventoryMaterialResolution{}, false, err
	}
	if !found {
		return ProductInventoryMaterialResolution{}, false, fmt.Errorf(
			"[CRITICAL_DATA_INTEGRITY] product inventory material mapping references missing material: productId=%s materialId=%s",
			productID,
			mapping.MaterialID,
		)
	}
	return resolution, true, nil
}

func resolveInventoryMaterialByIDTx(tx *gorm.DB, materialID string, strategy string, sourceValue string) (ProductInventoryMaterialResolution, bool, error) {
	trimmedMaterialID := strings.TrimSpace(materialID)
	if trimmedMaterialID == "" {
		return ProductInventoryMaterialResolution{}, false, nil
	}

	var material models.Material
	err := tx.Where("id = ?", trimmedMaterialID).First(&material).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return ProductInventoryMaterialResolution{}, false, nil
	}
	if err != nil {
		return ProductInventoryMaterialResolution{}, false, err
	}
	return ProductInventoryMaterialResolution{
		Material:    material,
		Strategy:    strategy,
		SourceValue: strings.TrimSpace(sourceValue),
	}, true, nil
}

func loadProductForInventoryMaterialResolutionTx(tx *gorm.DB, productID string) (models.Product, bool, error) {
	var product models.Product
	err := tx.Where("id = ?", productID).First(&product).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return models.Product{}, false, nil
	}
	if err != nil {
		return models.Product{}, false, err
	}
	return product, true, nil
}

func resolveInventoryMaterialByCodeTx(tx *gorm.DB, code string, strategy string) (ProductInventoryMaterialResolution, bool, error) {
	trimmedCode := strings.TrimSpace(code)
	if trimmedCode == "" {
		return ProductInventoryMaterialResolution{}, false, nil
	}

	var material models.Material
	err := tx.Where("code = ?", trimmedCode).First(&material).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return ProductInventoryMaterialResolution{}, false, nil
	}
	if err != nil {
		return ProductInventoryMaterialResolution{}, false, err
	}
	return ProductInventoryMaterialResolution{
		Material:    material,
		Strategy:    strategy,
		SourceValue: trimmedCode,
	}, true, nil
}

func resolveInventoryMaterialByUniqueNameTx(tx *gorm.DB, name string, strategy string) (ProductInventoryMaterialResolution, bool, error) {
	trimmedName := strings.TrimSpace(name)
	if trimmedName == "" {
		return ProductInventoryMaterialResolution{}, false, nil
	}

	var materials []models.Material
	if err := tx.Where("name = ?", trimmedName).Limit(2).Find(&materials).Error; err != nil {
		return ProductInventoryMaterialResolution{}, false, err
	}
	if len(materials) == 1 {
		return ProductInventoryMaterialResolution{
			Material:    materials[0],
			Strategy:    strategy,
			SourceValue: trimmedName,
		}, true, nil
	}
	if len(materials) > 1 {
		return ProductInventoryMaterialResolution{}, false, fmt.Errorf(
			"[CRITICAL_DATA_INTEGRITY] product inventory material mapping is ambiguous: value=%s matched multiple material names",
			trimmedName,
		)
	}

	return ProductInventoryMaterialResolution{}, false, nil
}
