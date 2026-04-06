package services

import (
	"encoding/json"
	"strings"
	"time"
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

func (defaultAuditLogger) Write(tx *gorm.DB, entry AuditEntry) error {
	if tx == nil {
		return nil
	}

	module := strings.TrimSpace(entry.Module)
	targetID := strings.TrimSpace(entry.TargetID)
	action := strings.TrimSpace(entry.Action)
	if module == "" || targetID == "" || action == "" {
		return nil
	}

	operator := strings.TrimSpace(entry.Operator)
	if operator == "" {
		operator = "system"
	}

	diff := entry.Diff
	if len(diff) == 0 {
		diff = json.RawMessage(`{}`)
	}

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
