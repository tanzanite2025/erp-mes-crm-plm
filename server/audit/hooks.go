package audit

import "gorm.io/gorm"

// RegisterHooks keeps the legacy GORM hook entrypoint as a no-op bridge during migration.
func RegisterHooks(db *gorm.DB) {
	if db == nil {
		return
	}
	// Legacy automatic update auditing has been superseded by explicit audit events.
	// Intentionally left blank to avoid double-writing audit logs.
}
