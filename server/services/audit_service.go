package services

import (
	"encoding/json"
	"sort"
	"strings"
	"time"
	"xdfc-server/audit"
	"xdfc-server/models"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type AuditEntry struct {
	Module   string
	TargetID string
	Action   string
	Diff     json.RawMessage
	Operator string
	IP       string
}

type auditLogger interface {
	Write(tx *gorm.DB, entry AuditEntry) error
}

type defaultAuditLogger struct{}

func NormalizeAuditLogs(logs []models.AuditLog) []models.AuditLog {
	if len(logs) == 0 {
		return logs
	}

	normalized := make([]models.AuditLog, len(logs))
	for i := range logs {
		normalized[i] = logs[i]
		normalized[i].Diff = normalizeAuditDiff(logs[i].Diff)
	}
	return normalized
}

func normalizeAuditDiff(raw json.RawMessage) json.RawMessage {
	trimmed := strings.TrimSpace(string(raw))
	if trimmed == "" || trimmed == "null" || trimmed == "{}" {
		return json.RawMessage("[]")
	}

	var canonical []audit.DiffItem
	if err := json.Unmarshal(raw, &canonical); err == nil {
		if canonical == nil {
			return json.RawMessage("[]")
		}
		encoded, err := json.Marshal(canonical)
		if err == nil {
			return encoded
		}
	}

	var object map[string]any
	if err := json.Unmarshal(raw, &object); err == nil {
		encoded, err := json.Marshal(normalizeAuditDiffObject(object))
		if err == nil {
			return encoded
		}
	}

	return json.RawMessage("[]")
}

func normalizeAuditDiffObject(object map[string]any) []audit.DiffItem {
	if len(object) == 0 {
		return []audit.DiffItem{}
	}

	beforeMap := extractAuditObjectMap(object["before"])
	payloadMap := extractAuditObjectMap(object["payload"])
	if len(payloadMap) > 0 {
		keys := make([]string, 0, len(payloadMap))
		for key := range payloadMap {
			keys = append(keys, key)
		}
		sort.Strings(keys)

		items := make([]audit.DiffItem, 0, len(keys))
		for _, key := range keys {
			nextValue := payloadMap[key]
			if key == "deltaKeys" {
				nextValue = normalizeAuditStringList(nextValue)
			}
			items = append(items, audit.DiffItem{
				Field: key,
				Alias: key,
				Old:   beforeMap[key],
				New:   nextValue,
			})
		}
		return items
	}

	if deltaKeys, ok := object["deltaKeys"].([]any); ok {
		items := make([]audit.DiffItem, 0, len(deltaKeys))
		for _, value := range deltaKeys {
			key := strings.TrimSpace(stringifyAuditValue(value))
			if key == "" {
				continue
			}
			items = append(items, audit.DiffItem{
				Field: key,
				Alias: key,
				Old:   nil,
				New:   true,
			})
		}
		return items
	}

	keys := make([]string, 0, len(object))
	for key := range object {
		if key == "intent" || key == "actorId" || key == "operator" || key == "expectedVersion" || key == "nextVersion" || key == "before" {
			continue
		}
		keys = append(keys, key)
	}
	sort.Strings(keys)

	items := make([]audit.DiffItem, 0, len(keys))
	for _, key := range keys {
		items = append(items, audit.DiffItem{
			Field: key,
			Alias: key,
			Old:   beforeMap[key],
			New:   object[key],
		})
	}
	return items
}

func extractAuditObjectMap(value any) map[string]any {
	mapped, ok := value.(map[string]any)
	if !ok {
		return nil
	}
	return mapped
}

func stringifyAuditValue(value any) string {
	switch typed := value.(type) {
	case string:
		return typed
	default:
		encoded, err := json.Marshal(typed)
		if err != nil {
			return ""
		}
		return string(encoded)
	}
}

func normalizeAuditStringList(value any) []string {
	items, ok := value.([]any)
	if !ok {
		return nil
	}
	result := make([]string, 0, len(items))
	for _, item := range items {
		text := strings.TrimSpace(stringifyAuditValue(item))
		if text == "" {
			continue
		}
		result = append(result, text)
	}
	sort.Strings(result)
	return result
}

func (defaultAuditLogger) Write(tx *gorm.DB, entry AuditEntry) error {
	if tx == nil {
		return nil
	}

	module := normalizeAuditModule(entry.Module)
	targetID := strings.TrimSpace(entry.TargetID)
	action := strings.TrimSpace(entry.Action)
	if module == "" || targetID == "" || action == "" {
		return nil
	}

	operator := strings.TrimSpace(entry.Operator)
	if operator == "" {
		operator = "system"
	}

	diff := normalizeAuditDiff(entry.Diff)

	return tx.Create(&models.AuditLog{
		ID:        uuid.NewString(),
		Module:    module,
		TargetID:  targetID,
		Action:    action,
		Diff:      diff,
		Operator:  operator,
		IP:        strings.TrimSpace(entry.IP),
		CreatedAt: time.Now(),
	}).Error
}
