package services

import (
	"context"
	"encoding/json"
	"sort"
	"strings"
	"xdfc-server/audit"
	"xdfc-server/models"

	"gorm.io/gorm"
)

func productAuditSnapshot(product models.Product) map[string]any {
	restrictions := make([]string, 0)
	if len(product.Restrictions) > 0 {
		_ = json.Unmarshal(product.Restrictions, &restrictions)
	}

	return map[string]any{
		"id":                       strings.TrimSpace(product.ID),
		"sku":                      strings.TrimSpace(product.SKU),
		"name":                     strings.TrimSpace(product.Name),
		"modelCode":                strings.TrimSpace(product.ModelCode),
		"typeId":                   strings.TrimSpace(product.TypeID),
		"depth":                    product.Depth,
		"widthInternal":            product.WidthInternal,
		"widthExternal":            product.WidthExternal,
		"maxTirePressure":          product.MaxTirePressure,
		"tireType":                 strings.TrimSpace(product.TireType),
		"brakeType":                strings.TrimSpace(product.BrakeType),
		"techSeries":               strings.TrimSpace(product.TechSeries),
		"versionLevel":             strings.TrimSpace(product.VersionLevel),
		"weight":                   product.Weight,
		"length":                   product.Length,
		"angle":                    product.Angle,
		"clamp":                    strings.TrimSpace(product.Clamp),
		"offset":                   product.Offset,
		"axleCrown":                product.AxleCrown,
		"steerer":                  strings.TrimSpace(product.Steerer),
		"image":                    strings.TrimSpace(product.Image),
		"restrictions":             restrictions,
		"moldGroup":                strings.TrimSpace(product.MoldGroup),
		"description":              strings.TrimSpace(product.Description),
		"engineeringSpecId":        strings.TrimSpace(product.EngineeringSpecID),
		"attributeValues":          productAuditAttributeValuesSnapshot(product.AttributeValues),
		"techSpecs":                parseEngineeringJSON(product.TechnicalSpecs),
		"barcodeConfig":            parseEngineeringJSON(product.BarcodeConfig),
		"attachments":              parseEngineeringJSON(product.Attachments),
		"status":                   strings.TrimSpace(product.Status),
		"templateKey":              strings.TrimSpace(product.TemplateKey),
		"resolvedTemplateId":       strings.TrimSpace(product.ResolvedTemplateID),
		"resolvedTemplateKey":      strings.TrimSpace(product.ResolvedTemplateKey),
		"templateResolutionSource": strings.TrimSpace(product.TemplateResolutionSource),
		"templateResolutionError":  strings.TrimSpace(product.TemplateResolutionError),
		"revisionNo":               strings.TrimSpace(product.RevisionNo),
		"effectiveFrom":            cloneTime(product.EffectiveFrom),
		"effectiveTo":              cloneTime(product.EffectiveTo),
		"changeType":               strings.TrimSpace(product.ChangeType),
		"changeOrderNo":            strings.TrimSpace(product.ChangeOrderNo),
		"siteCode":                 strings.TrimSpace(product.SiteCode),
		"isDefaultSite":            product.IsDefaultSite,
		"version":                  product.Version,
	}
}

func productAuditAttributeValuesSnapshot(items []models.ProductAttributeValue) []map[string]any {
	result := make([]map[string]any, 0, len(items))
	for _, item := range items {
		result = append(result, map[string]any{
			"id":          strings.TrimSpace(item.ID),
			"productId":   strings.TrimSpace(item.ProductID),
			"categoryKey": strings.TrimSpace(item.CategoryKey),
			"optionValue": strings.TrimSpace(item.OptionValue),
			"sortOrder":   item.SortOrder,
			"version":     item.Version,
		})
	}
	return result
}

func productAuditPathValue(source map[string]any, path string) any {
	if len(source) == 0 {
		return nil
	}

	current := any(source)
	for _, part := range strings.Split(strings.TrimSpace(path), ".") {
		mapped, ok := current.(map[string]any)
		if !ok {
			return nil
		}
		next, exists := mapped[part]
		if !exists {
			return nil
		}
		current = next
	}

	return current
}

func productPatchAuditDiff(before map[string]any, values map[string]json.RawMessage) json.RawMessage {
	keys := make([]string, 0, len(values))
	for key := range values {
		keys = append(keys, key)
	}
	sort.Strings(keys)

	items := make([]audit.DiffItem, 0, len(keys))
	for _, key := range keys {
		var nextValue any
		if err := json.Unmarshal(values[key], &nextValue); err != nil {
			continue
		}
		items = append(items, audit.DiffItem{
			Field: key,
			Old:   productAuditPathValue(before, key),
			New:   nextValue,
			Alias: key,
		})
	}

	diff, _ := json.Marshal(items)
	return diff
}

func productStateAuditDiff(before map[string]any, payload map[string]any) json.RawMessage {
	keys := make([]string, 0, len(payload))
	for key := range payload {
		keys = append(keys, key)
	}
	sort.Strings(keys)

	items := make([]audit.DiffItem, 0, len(keys))
	for _, key := range keys {
		items = append(items, audit.DiffItem{
			Field: key,
			Old:   productAuditPathValue(before, key),
			New:   payload[key],
			Alias: key,
		})
	}

	diff, _ := json.Marshal(items)
	return diff
}

func writeProductAuditEntryWithContext(ctx context.Context, tx *gorm.DB, targetID string, action string, before map[string]any, payload map[string]any) error {
	return recordLegacyAuditEntryWithContext(ctx, tx, AuditModuleProduct, strings.TrimSpace(targetID), strings.TrimSpace(action), productStateAuditDiff(before, payload))
}

func writeProductAuditDiffEntryWithContext(ctx context.Context, tx *gorm.DB, targetID string, action string, diff json.RawMessage) error {
	return recordLegacyAuditEntryWithContext(ctx, tx, AuditModuleProduct, strings.TrimSpace(targetID), strings.TrimSpace(action), diff)
}
