package services

import (
	"context"
	"encoding/json"
	"strings"
	"time"
	"xdfc-server/models"

	"gorm.io/gorm"
)

func bomAuditSnapshot(bom models.BOM) map[string]any {
	return map[string]any{
		"id":            strings.TrimSpace(bom.ID),
		"bomNo":         strings.TrimSpace(bom.BOMNo),
		"productId":     strings.TrimSpace(bom.ProductID),
		"version":       strings.TrimSpace(bom.VersionText),
		"status":        strings.TrimSpace(bom.Status),
		"description":   strings.TrimSpace(bom.Description),
		"revisionNo":    strings.TrimSpace(bom.RevisionNo),
		"effectiveFrom": bom.EffectiveFrom,
		"effectiveTo":   bom.EffectiveTo,
		"changeType":    strings.TrimSpace(bom.ChangeType),
		"changeOrderNo": strings.TrimSpace(bom.ChangeOrderNo),
		"siteCode":      strings.TrimSpace(bom.SiteCode),
		"isDefaultSite": bom.IsDefaultSite,
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
			"substitutes":    bomAuditSubstitutesSnapshot(item.Substitutes),
		})
	}
	return result
}

func bomAuditSubstitutesSnapshot(items []models.BOMSubstituteItem) []map[string]any {
	result := make([]map[string]any, 0, len(items))
	for _, item := range items {
		result = append(result, map[string]any{
			"id":             strings.TrimSpace(item.ID),
			"materialId":     strings.TrimSpace(item.MaterialID),
			"priority":       item.Priority,
			"conversionRate": item.ConversionRate,
			"notes":          strings.TrimSpace(item.Notes),
		})
	}
	return result
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
