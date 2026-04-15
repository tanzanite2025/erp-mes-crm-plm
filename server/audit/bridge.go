package audit

import (
	"encoding/json"
	"fmt"
	"reflect"
	"strings"
)

// AuditBridgeInput is a generic input used to bridge legacy hooks/services into AuditEvent.
type AuditBridgeInput struct {
	EntityKey AuditEntityKey
	EntityID  string
	Action    AuditAction
	Actor     AuditActor
	OldValue  any
	NewValue  any
	Metadata  map[string]string
}

// BuildAuditEventFromDiff converts an already built change set into a unified event.
func BuildAuditEventFromDiff(input AuditBridgeInput, changes []AuditChange) AuditEvent {
	event := NewAuditEvent(input.EntityKey, input.EntityID, input.Action, input.Actor)
	if len(input.Metadata) > 0 {
		for k, v := range input.Metadata {
			event = event.WithMetadata(k, v)
		}
	}
	if len(changes) > 0 {
		event = event.WithChanges(changes...)
	}
	return event.Normalize()
}

// BuildAuditEventFromModelChange compares two model snapshots and emits an event when changes exist.
func BuildAuditEventFromModelChange(entityKey AuditEntityKey, oldValue any, newValue any, actor AuditActor) (AuditEvent, bool) {
	changes := DiffModelValues(oldValue, newValue)
	if len(changes) == 0 {
		return AuditEvent{}, false
	}

	entityID := ExtractEntityID(newValue)
	if strings.TrimSpace(entityID) == "" {
		entityID = ExtractEntityID(oldValue)
	}

	input := AuditBridgeInput{
		EntityKey: entityKey,
		EntityID:  entityID,
		Action:    AuditActionUpdate,
		Actor:     actor,
	}
	return BuildAuditEventFromDiff(input, changes), true
}

// BuildAuditEventFromBulkSync creates one event per synced entity identifier.
func BuildAuditEventFromBulkSync(entityKey AuditEntityKey, entityIDs []string, actor AuditActor, metadata map[string]string) []AuditEvent {
	if len(entityIDs) == 0 {
		return nil
	}

	events := make([]AuditEvent, 0, len(entityIDs))
	for _, entityID := range entityIDs {
		input := AuditBridgeInput{
			EntityKey: entityKey,
			EntityID:  entityID,
			Action:    AuditActionBulkSync,
			Actor:     actor,
			Metadata:  metadata,
		}
		events = append(events, BuildAuditEventFromDiff(input, nil))
	}
	return events
}

// DiffModelValues tries to produce field-level changes between two snapshots.
// It intentionally falls back to a JSON object diff so the bridge can work with
// different model shapes without knowing business details.
func DiffModelValues(oldValue any, newValue any) []AuditChange {
	if oldValue == nil || newValue == nil {
		return nil
	}

	oldMap := toStringMap(oldValue)
	newMap := toStringMap(newValue)
	if len(oldMap) == 0 || len(newMap) == 0 {
		return nil
	}

	changes := make([]AuditChange, 0)
	for key, newItem := range newMap {
		oldItem, ok := oldMap[key]
		if ok && reflect.DeepEqual(oldItem, newItem) {
			continue
		}
		changes = append(changes, AuditChange{
			Field:    key,
			OldValue: oldItem,
			NewValue: newItem,
			ValueType: valueTypeName(newItem),
			Label:    key,
		})
	}
	return changes
}

// ExtractEntityID tries to find a canonical ID field from a model or map.
func ExtractEntityID(value any) string {
	if value == nil {
		return ""
	}

	if mapped, ok := value.(map[string]any); ok {
		for _, key := range []string{"id", "ID", "Id", "entityId", "entity_id"} {
			if raw, exists := mapped[key]; exists {
				return strings.TrimSpace(fmt.Sprint(raw))
			}
		}
		return ""
	}

	rv := reflect.ValueOf(value)
	if !rv.IsValid() {
		return ""
	}
	if rv.Kind() == reflect.Ptr {
		if rv.IsNil() {
			return ""
		}
		rv = rv.Elem()
	}
	if rv.Kind() != reflect.Struct {
		return ""
	}

	for _, fieldName := range []string{"ID", "Id", "EntityID", "EntityId"} {
		f := rv.FieldByName(fieldName)
		if f.IsValid() && f.CanInterface() {
			return strings.TrimSpace(fmt.Sprint(f.Interface()))
		}
	}
	return ""
}

func toStringMap(value any) map[string]any {
	if value == nil {
		return nil
	}

	if mapped, ok := value.(map[string]any); ok {
		return mapped
	}

	encoded, err := json.Marshal(value)
	if err != nil {
		return nil
	}

	var out map[string]any
	if err := json.Unmarshal(encoded, &out); err != nil {
		return nil
	}
	return out
}

func valueTypeName(value any) string {
	if value == nil {
		return ""
	}
	return reflect.TypeOf(value).String()
}
