package services

import (
	"encoding/json"
	"fmt"
	"sort"
	"strings"
	"xdfc-server/audit"

	"gorm.io/gorm"
)

func recordLegacyAuditEntryTx(tx *gorm.DB, module, targetID, action string, diff json.RawMessage, operator, actorID, ip string) error {
	source := ""
	if strings.TrimSpace(ip) != "" {
		source = "http"
	}

	event := audit.NewAuditEvent(
		audit.AuditEntityKey(NormalizeAuditModule(module)),
		strings.TrimSpace(targetID),
		audit.AuditAction(strings.TrimSpace(action)),
		audit.AuditActor{
			UserID:   strings.TrimSpace(actorID),
			Username: strings.TrimSpace(operator),
			IP:       strings.TrimSpace(ip),
			Source:   source,
		},
	)

	changes := legacyAuditDiffToChanges(diff)
	if len(changes) > 0 {
		event = event.WithChanges(changes...)
	}

	return recordAuditEventTx(tx, event.Normalize())
}

func legacyAuditDiffToChanges(raw json.RawMessage) []audit.AuditChange {
	trimmed := strings.TrimSpace(string(raw))
	if trimmed == "" || trimmed == "null" || trimmed == "{}" {
		return nil
	}

	var canonical []audit.DiffItem
	if err := json.Unmarshal(raw, &canonical); err == nil {
		if len(canonical) == 0 {
			return nil
		}
		return legacyDiffItemsToChanges(canonical)
	}

	var object map[string]any
	if err := json.Unmarshal(raw, &object); err == nil {
		return legacyAuditDiffObjectToChanges(object)
	}

	return nil
}

func legacyDiffItemsToChanges(items []audit.DiffItem) []audit.AuditChange {
	changes := make([]audit.AuditChange, 0, len(items))
	for _, item := range items {
		changes = append(changes, audit.AuditChange{
			Field:     item.Field,
			OldValue:  item.Old,
			NewValue:  item.New,
			ValueType: legacyAuditValueType(item.New),
			Label:     item.Alias,
		})
	}
	return changes
}

func legacyAuditDiffObjectToChanges(object map[string]any) []audit.AuditChange {
	if len(object) == 0 {
		return nil
	}

	beforeMap := legacyAuditObjectMap(object["before"])
	payloadMap := legacyAuditObjectMap(object["payload"])
	if len(payloadMap) > 0 {
		keys := make([]string, 0, len(payloadMap))
		for key := range payloadMap {
			keys = append(keys, key)
		}
		sort.Strings(keys)

		changes := make([]audit.AuditChange, 0, len(keys))
		for _, key := range keys {
			nextValue := payloadMap[key]
			if key == "deltaKeys" {
				nextValue = legacyAuditStringList(nextValue)
			}
			changes = append(changes, audit.AuditChange{
				Field:     key,
				OldValue:  beforeMap[key],
				NewValue:  nextValue,
				ValueType: legacyAuditValueType(nextValue),
				Label:     key,
			})
		}
		return changes
	}

	if deltaKeys, ok := object["deltaKeys"].([]any); ok {
		changes := make([]audit.AuditChange, 0, len(deltaKeys))
		for _, value := range deltaKeys {
			key := strings.TrimSpace(legacyAuditStringify(value))
			if key == "" {
				continue
			}
			changes = append(changes, audit.AuditChange{
				Field:     key,
				OldValue:  nil,
				NewValue:  true,
				ValueType: "bool",
				Label:     key,
			})
		}
		return changes
	}

	keys := make([]string, 0, len(object))
	for key := range object {
		if key == "intent" || key == "actorId" || key == "operator" || key == "expectedVersion" || key == "nextVersion" || key == "before" {
			continue
		}
		keys = append(keys, key)
	}
	if len(keys) == 0 {
		return nil
	}
	sort.Strings(keys)

	changes := make([]audit.AuditChange, 0, len(keys))
	for _, key := range keys {
		changes = append(changes, audit.AuditChange{
			Field:     key,
			OldValue:  beforeMap[key],
			NewValue:  object[key],
			ValueType: legacyAuditValueType(object[key]),
			Label:     key,
		})
	}
	return changes
}

func legacyAuditObjectMap(value any) map[string]any {
	mapped, ok := value.(map[string]any)
	if !ok {
		return nil
	}
	return mapped
}

func legacyAuditStringify(value any) string {
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

func legacyAuditStringList(value any) []string {
	items, ok := value.([]any)
	if !ok {
		return nil
	}
	result := make([]string, 0, len(items))
	for _, item := range items {
		text := strings.TrimSpace(legacyAuditStringify(item))
		if text == "" {
			continue
		}
		result = append(result, text)
	}
	sort.Strings(result)
	return result
}

func legacyAuditValueType(value any) string {
	if value == nil {
		return ""
	}
	return fmt.Sprintf("%T", value)
}
