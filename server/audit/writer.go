package audit

import (
	"encoding/json"
	"fmt"
	"strings"
	"time"
	"xdfc-server/models"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// AuditWriter persists audit events.
type AuditWriter interface {
	Write(event AuditEvent) error
}

// DefaultAuditWriter writes audit events into the audit_logs table.
type DefaultAuditWriter struct {
	DB *gorm.DB
}

// Write stores a normalized audit event as AuditLog.
func (w DefaultAuditWriter) Write(event AuditEvent) error {
	if w.DB == nil {
		return nil
	}

	normalized := event.Normalize()
	if normalized.EntityKey == "" || strings.TrimSpace(normalized.EntityID) == "" || normalized.Action == "" {
		return nil
	}

	logModel, err := ToAuditLogModel(normalized)
	if err != nil {
		return err
	}

	return w.DB.Create(logModel).Error
}

// ToAuditLogModel converts a unified audit event into the legacy audit log model.
func ToAuditLogModel(event AuditEvent) (*models.AuditLog, error) {
	encodedDiff, err := EncodeAuditChangeSet(event.ChangeSet)
	if err != nil {
		return nil, err
	}

	metadata, err := json.Marshal(event.Metadata)
	if err != nil {
		return nil, fmt.Errorf("encode audit metadata: %w", err)
	}

	if event.OccurredAt.IsZero() {
		event.OccurredAt = time.Now()
	}

	module := NormalizeAuditLogModule(event.EntityKey)
	operator := strings.TrimSpace(event.Actor.Username)
	if operator == "" {
		operator = strings.TrimSpace(event.Actor.UserID)
	}
	if operator == "" {
		operator = "system"
	}

	ip := strings.TrimSpace(event.Actor.IP)
	if ip == "" {
		ip = event.Actor.Source
	}

	// Keep metadata encoded in diff when no field-level change exists yet.
	if len(event.ChangeSet.Fields) == 0 {
		encodedDiff = json.RawMessage(`[]`)
	}
	if len(event.Metadata) > 0 {
		encodedMeta := string(metadata)
		if encodedDiff == nil || string(encodedDiff) == "[]" {
			encodedDiff = json.RawMessage(encodedMeta)
		}
	}

	return &models.AuditLog{
		ID:        uuid.NewString(),
		Module:    module,
		TargetID:  strings.TrimSpace(event.EntityID),
		Action:    string(event.Action),
		Diff:      encodedDiff,
		Operator:  operator,
		IP:        ip,
		CreatedAt: event.OccurredAt,
	}, nil
}

// NormalizeAuditLogModule converts an entity key to the stored module name.
func NormalizeAuditLogModule(entityKey AuditEntityKey) string {
	return strings.TrimSpace(string(entityKey))
}

// EncodeAuditChangeSet converts a change set into JSON payload.
func EncodeAuditChangeSet(changeSet AuditChangeSet) (json.RawMessage, error) {
	if len(changeSet.Fields) == 0 {
		return json.RawMessage(`[]`), nil
	}

	legacyItems := make([]DiffItem, 0, len(changeSet.Fields))
	for _, field := range changeSet.Fields {
		legacyItems = append(legacyItems, DiffItem{
			Field: field.Field,
			Old:   field.OldValue,
			New:   field.NewValue,
			Alias: field.Label,
		})
	}

	payload, err := json.Marshal(legacyItems)
	if err != nil {
		return nil, fmt.Errorf("encode audit change set: %w", err)
	}
	return payload, nil
}
