package services

import (
	"context"
	"encoding/json"
	"sort"
	"strings"
	"time"
	"xdfc-server/audit"
	"xdfc-server/models"

	"gorm.io/gorm"
)

func bomAuditSnapshot(bom models.BOM) map[string]any {
	return map[string]any{
		"id":            strings.TrimSpace(bom.ID),
		"bomNo":         strings.TrimSpace(bom.BOMNo),
		"bomType":       strings.TrimSpace(bom.BOMType),
		"productId":     strings.TrimSpace(bom.ProductID),
		"sourceEbomId":  bom.SourceEBOMID,
		"version":       strings.TrimSpace(bom.VersionText),
		"status":        strings.TrimSpace(bom.Status),
		"isLocked":      bom.IsLocked,
		"ownerType":          strings.TrimSpace(bom.OwnerType),
		"ownerCustomerId":    strings.TrimSpace(bom.OwnerCustomerID),
		"measuredWeight":     bom.MeasuredWeight,
		"measuredWeightUnit": strings.TrimSpace(bom.MeasuredWeightUnit),
		"description":   strings.TrimSpace(bom.Description),
		"revisionNo":    strings.TrimSpace(bom.RevisionNo),
		"effectiveFrom": bom.EffectiveFrom,
		"effectiveTo":   bom.EffectiveTo,
		"changeType":    strings.TrimSpace(bom.ChangeType),
		"changeOrderNo": strings.TrimSpace(bom.ChangeOrderNo),
		"siteCode":      strings.TrimSpace(bom.SiteCode),
		"isDefaultSite": bom.IsDefaultSite,
		"relationSidecar": parseEngineeringJSON(bom.RelationSidecar),
		"items":         bomAuditItemsSnapshot(bom.Items),
	}
}

func bomAuditItemsSnapshot(items []models.BOMItem) []map[string]any {
	result := make([]map[string]any, 0, len(items))
	for _, item := range items {
		result = append(result, map[string]any{
			"id":             strings.TrimSpace(item.ID),
			"section":        strings.TrimSpace(item.Section),
			"materialId":     strings.TrimSpace(item.MaterialID),
			"unitPrice":      item.UnitPrice,
			"unit":           strings.TrimSpace(item.Unit),
			"unitUsage":      item.UnitUsage,
			"wastagePercent": item.WastagePercent,
			"standardUsage":  item.StandardUsage,
			"materialType":   strings.TrimSpace(item.MaterialType),
			"supplyChannel":  strings.TrimSpace(item.SupplyChannel),
			"sortOrder":      item.SortOrder, // ✅ 保存装配顺序到审计快照
		})
	}
	return result
}

func engineeringSpecAuditSnapshot(spec models.EngineeringSpec) map[string]any {
	return map[string]any{
		"id":            strings.TrimSpace(spec.ID),
		"name":          strings.TrimSpace(spec.Name),
		"code":          strings.TrimSpace(spec.Code),
		"type":          strings.TrimSpace(spec.Type),
		"description":   strings.TrimSpace(spec.Description),
		"active":        spec.Active,
		"revisionNo":    strings.TrimSpace(spec.RevisionNo),
		"effectiveFrom": cloneTime(spec.EffectiveFrom),
		"effectiveTo":   cloneTime(spec.EffectiveTo),
		"changeType":    strings.TrimSpace(spec.ChangeType),
		"changeOrderNo": strings.TrimSpace(spec.ChangeOrderNo),
		"siteCode":      strings.TrimSpace(spec.SiteCode),
		"isDefaultSite": spec.IsDefaultSite,
		"version":       spec.Version,
		"specData":      parseEngineeringJSON(spec.SpecData),
		"drillingData":  parseEngineeringJSON(spec.DrillingData),
		"cuttingData":   parseEngineeringJSON(spec.CuttingData),
		"labelingData":  parseEngineeringJSON(spec.LabelingData),
	}
}

func engineeringSpecAuditTargetID(spec models.EngineeringSpec) string {
	if strings.TrimSpace(spec.ID) != "" {
		return strings.TrimSpace(spec.ID)
	}
	return strings.TrimSpace(spec.Code)
}

func engineeringSpecAuditModuleForType(specType string) string {
	if strings.EqualFold(strings.TrimSpace(specType), drillingPlanSpecType) {
		return AuditModuleDrilling
	}
	return AuditModuleEngineeringSpec
}

func engineeringSpecPatchAuditDiff(before map[string]any, values map[string]json.RawMessage) json.RawMessage {
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
			Old:   engineeringSpecAuditPathValue(before, key),
			New:   nextValue,
			Alias: key,
		})
	}

	diff, _ := json.Marshal(items)
	return diff
}

func engineeringSpecStateAuditDiff(before map[string]any, payload map[string]any) json.RawMessage {
	keys := make([]string, 0, len(payload))
	for key := range payload {
		keys = append(keys, key)
	}
	sort.Strings(keys)

	items := make([]audit.DiffItem, 0, len(keys))
	for _, key := range keys {
		items = append(items, audit.DiffItem{
			Field: key,
			Old:   engineeringSpecAuditPathValue(before, key),
			New:   payload[key],
			Alias: key,
		})
	}

	diff, _ := json.Marshal(items)
	return diff
}

func engineeringSpecAuditPathValue(source map[string]any, path string) any {
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

func writeEngineeringSpecAuditEntryWithContext(ctx context.Context, tx *gorm.DB, specType string, targetID string, action string, before map[string]any, payload map[string]any) error {
	return recordLegacyAuditEntryWithContext(ctx, tx, engineeringSpecAuditModuleForType(specType), strings.TrimSpace(targetID), strings.TrimSpace(action), engineeringSpecStateAuditDiff(before, payload))
}

func writeEngineeringSpecAuditDiffEntryWithContext(ctx context.Context, tx *gorm.DB, specType string, targetID string, action string, diff json.RawMessage) error {
	return recordLegacyAuditEntryWithContext(ctx, tx, engineeringSpecAuditModuleForType(specType), strings.TrimSpace(targetID), strings.TrimSpace(action), diff)
}

func engineeringAuditDiff(before map[string]any, payload map[string]any) json.RawMessage {
	diff, _ := json.Marshal(map[string]any{
		"before":  before,
		"payload": payload,
	})
	return diff
}

func writeBOMAuditEntryWithContext(ctx context.Context, tx *gorm.DB, targetID string, action string, before map[string]any, payload map[string]any) error {
	return recordLegacyAuditEntryWithContext(ctx, tx, "BOM", strings.TrimSpace(targetID), strings.TrimSpace(action), engineeringAuditDiff(before, payload))
}

func bomAuditTargetID(bom models.BOM) string {
	if strings.TrimSpace(bom.ID) != "" {
		return strings.TrimSpace(bom.ID)
	}
	return strings.TrimSpace(bom.BOMNo)
}

func cloneTime(value *time.Time) *time.Time {
	if value == nil {
		return nil
	}
	copied := *value
	return &copied
}
