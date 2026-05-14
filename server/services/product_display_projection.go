package services

import (
	"strings"
	"xdfc-server/db"
	"xdfc-server/models"
)

const ProductDisplayStrategyVersion = "product-display-v2"

type ProductDisplaySummaryItem struct {
	Key   string `json:"key"`
	Label string `json:"label"`
	Value string `json:"value"`
	Empty bool   `json:"empty"`
}

type ProductDisplayProjection struct {
	Title           string                      `json:"title"`
	Subtitle        string                      `json:"subtitle"`
	Code            string                      `json:"code"`
	FullLabel       string                      `json:"fullLabel"`
	SummaryItems    []ProductDisplaySummaryItem  `json:"summaryItems"`
	StrategyVersion string                      `json:"strategyVersion"`
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
	return ""
}

func resolveOptionLabel(categoryKey string, rawValue string, options []models.ProductAttributeOption) string {
	normalizedCategoryKey := normalizeProductDisplayCategoryKey(categoryKey)
	normalizedRawValue := normalizeProductDisplayCategoryKey(rawValue)

	for _, option := range options {
		if normalizeProductDisplayCategoryKey(option.CategoryKey) != normalizedCategoryKey {
			continue
		}
		optionValue := normalizeProductDisplayValue(option.Value)
		if optionValue == rawValue {
			return resolveOptionDisplayLabel(option)
		}
		if normalizedRawValue != "" && normalizeProductDisplayCategoryKey(optionValue) == normalizedRawValue {
			return resolveOptionDisplayLabel(option)
		}
		labelZh := normalizeProductDisplayValue(option.LabelZh)
		if labelZh == rawValue {
			return resolveOptionDisplayLabel(option)
		}
	}
	return rawValue
}

func resolveOptionDisplayLabel(option models.ProductAttributeOption) string {
	label := normalizeProductDisplayValue(option.LabelZh)
	if label != "" {
		return label
	}
	label = normalizeProductDisplayValue(option.LabelEn)
	if label != "" {
		return label
	}
	return normalizeProductDisplayValue(option.Value)
}

func resolveCategoryDisplayLabel(categoryKey string, categories []models.ProductAttributeCategory) string {
	normalizedKey := normalizeProductDisplayCategoryKey(categoryKey)
	for _, category := range categories {
		if normalizeProductDisplayCategoryKey(category.Key) == normalizedKey {
			label := normalizeProductDisplayValue(category.NameZh)
			if label != "" {
				return label
			}
			return normalizeProductDisplayValue(category.NameEn)
		}
	}
	return categoryKey
}

// resolveProductDisplaySummaryItemsV2 generates summary items based on template attribute bindings.
func resolveProductDisplaySummaryItemsV2(
	product models.Product,
	bindings []models.ProductTemplateAttributeBinding,
	categories []models.ProductAttributeCategory,
	options []models.ProductAttributeOption,
) []ProductDisplaySummaryItem {
	if len(bindings) == 0 {
		return []ProductDisplaySummaryItem{}
	}

	items := make([]ProductDisplaySummaryItem, 0, len(bindings))
	for _, binding := range bindings {
		if !binding.Active {
			continue
		}
		rawValue := getProductDisplayAttributeValue(product, binding.CategoryKey)
		label := resolveCategoryDisplayLabel(binding.CategoryKey, categories)
		value := ""
		empty := rawValue == ""

		if !empty {
			value = resolveOptionLabel(binding.CategoryKey, rawValue, options)
		} else {
			value = "-"
		}

		items = append(items, ProductDisplaySummaryItem{
			Key:   normalizeProductDisplayCategoryKey(binding.CategoryKey),
			Label: label,
			Value: value,
			Empty: empty,
		})
	}
	return items
}

// ResolveProductDisplayProjectionV2 resolves display projection using template bindings (v2 strategy).
func ResolveProductDisplayProjectionV2(
	product *models.Product,
	bindings []models.ProductTemplateAttributeBinding,
	categories []models.ProductAttributeCategory,
	options []models.ProductAttributeOption,
) ProductDisplayProjection {
	code := ""
	title := "UNNAMED"

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
	}

	var summaryItems []ProductDisplaySummaryItem
	if product != nil {
		summaryItems = resolveProductDisplaySummaryItemsV2(*product, bindings, categories, options)
	} else {
		summaryItems = []ProductDisplaySummaryItem{}
	}

	summaryParts := make([]string, 0, len(summaryItems))
	for _, item := range summaryItems {
		if !item.Empty {
			summaryParts = append(summaryParts, item.Value)
		}
	}
	subtitle := strings.Join(summaryParts, " / ")

	fullLabel := title
	if subtitle != "" {
		fullLabel = title + " (" + subtitle + ")"
	}

	return ProductDisplayProjection{
		Title:           title,
		Subtitle:        subtitle,
		Code:            code,
		FullLabel:       fullLabel,
		SummaryItems:    summaryItems,
		StrategyVersion: ProductDisplayStrategyVersion,
	}
}

// ResolveProductDisplayProjection is the backward-compatible entry point.
// It delegates to V2 with empty bindings when no template context is available.
func ResolveProductDisplayProjection(product *models.Product) ProductDisplayProjection {
	return ResolveProductDisplayProjectionV2(product, nil, nil, nil)
}

// LoadProductDisplayProjections loads display projections for a batch of product IDs.
// Uses v2 strategy: resolves template bindings via type chain, then generates display text.
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

	// Load products with attribute values
	var products []models.Product
	if err := db.DB.Model(&models.Product{}).
		Preload("AttributeValues").
		Where("deleted_at IS NULL").
		Where("id IN ?", normalizedProductIDs).
		Find(&products).Error; err != nil {
		return nil, err
	}

	if len(products) == 0 {
		return map[string]ProductDisplayProjection{}, nil
	}

	// Load type bindings and resolve templates
	typeBindings, err := loadProductTypeTemplateBindings(db.DB)
	if err != nil {
		return nil, err
	}
	templatesByID, err := loadTemplateKeyByTemplateID(db.DB, typeBindings)
	if err != nil {
		return nil, err
	}

	// Collect all template IDs that are actually used
	templateIDSet := make(map[string]struct{})
	productTemplateMap := make(map[string]string, len(products)) // productID -> templateID
	for _, product := range products {
		typeID := strings.TrimSpace(product.TypeID)
		if typeID == "" {
			continue
		}
		templateID, _ := resolveTemplateIDFromProductTypeChain(typeBindings, typeID)
		if templateID == "" {
			continue
		}
		productTemplateMap[product.ID] = templateID
		templateIDSet[templateID] = struct{}{}
	}

	// Load attribute bindings for all relevant templates
	bindingsByTemplateID := make(map[string][]models.ProductTemplateAttributeBinding)
	if len(templateIDSet) > 0 {
		templateIDs := make([]string, 0, len(templateIDSet))
		for id := range templateIDSet {
			templateIDs = append(templateIDs, id)
		}
		var bindings []models.ProductTemplateAttributeBinding
		if err := db.DB.Where("template_id IN ?", templateIDs).
			Order("sort_order asc").
			Find(&bindings).Error; err != nil {
			return nil, err
		}
		for _, binding := range bindings {
			bindingsByTemplateID[binding.TemplateID] = append(bindingsByTemplateID[binding.TemplateID], binding)
		}
	}

	// Load all attribute categories and options for label resolution
	var categories []models.ProductAttributeCategory
	if err := db.DB.Where("active = ?", true).Find(&categories).Error; err != nil {
		return nil, err
	}

	var options []models.ProductAttributeOption
	if err := db.DB.Where("active = ?", true).Find(&options).Error; err != nil {
		return nil, err
	}

	// Filter out inactive templates
	activeTemplateIDs := make(map[string]bool)
	for id, tmpl := range templatesByID {
		activeTemplateIDs[id] = tmpl.Active
	}

	// Build projections
	result := make(map[string]ProductDisplayProjection, len(products))
	for idx := range products {
		product := &products[idx]
		templateID := productTemplateMap[product.ID]
		var bindings []models.ProductTemplateAttributeBinding

		if templateID != "" && activeTemplateIDs[templateID] {
			bindings = bindingsByTemplateID[templateID]
		}

		result[product.ID] = ResolveProductDisplayProjectionV2(product, bindings, categories, options)
	}

	return result, nil
}
