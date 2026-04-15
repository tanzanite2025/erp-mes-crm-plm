package services

import (
	"xdfc-server/audit"

	"gorm.io/gorm"
)

func recordAuditEventTx(tx *gorm.DB, event audit.AuditEvent) error {
	if tx == nil {
		return nil
	}
	return audit.DefaultAuditWriter{DB: tx}.Write(event)
}

// RecordAuditEventTx is an exported compatibility wrapper for callers outside services.
func RecordAuditEventTx(tx *gorm.DB, event audit.AuditEvent) error {
	return recordAuditEventTx(tx, event)
}
