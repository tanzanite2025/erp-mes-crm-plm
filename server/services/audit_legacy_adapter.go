package services

import (
	"encoding/json"

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
	return recordLegacyAuditEntryTx(
		tx,
		entry.Module,
		entry.TargetID,
		entry.Action,
		entry.Diff,
		entry.Operator,
		"",
		entry.IP,
	)
}
