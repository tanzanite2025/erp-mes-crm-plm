package services

import (
	"strings"
	"xdfc-server/db"
	"xdfc-server/models"
)

const ProductDisplayStrategyVersion = "product-display-v1"

type ProductDisplayProjection struct {
	Title           string `json:"title"`
	Subtitle        string `json:"subtitle"`
	Code            string `json:"code"`
	FullLabel       string `json:"fullLabel"`
	StrategyVersion string `json:"strategyVersion"`
}

func normalizeProductDisplayValue(value string) string {
	return strings.TrimSpace(value)
}

func normalizeProductDisplayCategoryKey(value string) string {
	return strings.ToLower(strings.TrimSpace(value))
}

func getProductDisplayAttributeValue(product models.Product, categoryKey string) string {
	normalizedCategoryKey := normalizeProductDisplayCategoryKey(categoryKey)
	for _, item := range product.AttributeValues {
		if normalizeProductDisplayCategoryKey(item.CategoryKey) == normalizedCategoryKey {
			return normalizeProductDisplayValue(item.OptionValue)
		}
	}

	switch normalizedCategoryKey {
	case "techseries":
		return normalizeProductDisplayValue(product.TechSeries)
	case "braketype":
		return normalizeProductDisplayValue(product.BrakeType)
	case "versionlevel":
		return normalizeProductDisplayValue(product.VersionLevel)
	default:
		return ""
	}
}

func buildProductDisplaySubtitle(product models.Product) string {
	series := getProductDisplayAttributeValue(product, "techSeries")
	if series == "" {
		series = "normal"
	}

	brake := getProductDisplayAttributeValue(product, "brakeType")
	if brake == "" {
		brake = "UNKNOWN"
	}

	version := getProductDisplayAttributeValue(product, "versionLevel")
	if version == "" {
		version = "std"
	}

	return strings.Join([]string{series, brake, version}, "/")
}

func ResolveProductDisplayProjection(product *models.Product) ProductDisplayProjection {
	code := ""
	title := "UNNAMED"
	subtitle := ""

	if product != nil {
		code = normalizeProductDisplayValue(product.SKU)
		if code == "" {
			code = normalizeProductDisplayValue(product.ModelCode)
		}

		title = normalizeProductDisplayValue(product.Name)
		if title == "" {
			title = code
		}
		if title == "" {
			title = "UNNAMED"
		}

		subtitle = buildProductDisplaySubtitle(*product)
	}

	fullLabel := title
	if subtitle != "" {
		fullLabel = title + " (" + subtitle + ")"
	}

	return ProductDisplayProjection{
		Title:           title,
		Subtitle:        subtitle,
		Code:            code,
		FullLabel:       fullLabel,
		StrategyVersion: ProductDisplayStrategyVersion,
	}
}

func LoadProductDisplayProjections(productIDs []string) (map[string]ProductDisplayProjection, error) {
	normalizedProductIDs := make([]string, 0, len(productIDs))
	seen := make(map[string]struct{}, len(productIDs))
	for _, productID := range productIDs {
		normalizedProductID := strings.TrimSpace(productID)
		if normalizedProductID == "" {
			continue
		}
		if _, exists := seen[normalizedProductID]; exists {
			continue
		}
		seen[normalizedProductID] = struct{}{}
		normalizedProductIDs = append(normalizedProductIDs, normalizedProductID)
	}

	if len(normalizedProductIDs) == 0 {
		return map[string]ProductDisplayProjection{}, nil
	}

	var products []models.Product
	if err := db.DB.Model(&models.Product{}).
		Select("id", "sku", "name", "model_code", "tech_series", "brake_type", "version_level").
		Where("deleted_at IS NULL").
		Where("id IN ?", normalizedProductIDs).
		Find(&products).Error; err != nil {
		return nil, err
	}

	result := make(map[string]ProductDisplayProjection, len(products))
	for idx := range products {
		result[products[idx].ID] = ResolveProductDisplayProjection(&products[idx])
	}

	return result, nil
}
