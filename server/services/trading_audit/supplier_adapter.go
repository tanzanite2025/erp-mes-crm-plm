package trading_audit

import (
	"strings"
	"xdfc-server/audit"
	"xdfc-server/models"
)

func BuildSupplierCreateEvent(supplier models.Supplier, actor audit.AuditActor) audit.AuditEvent {
	event := audit.NewAuditEvent(audit.AuditEntitySupplier, supplier.ID, audit.AuditActionCreate, actor)
	event = event.WithMetadata("module", string(audit.AuditEntitySupplier))
	if strings.TrimSpace(supplier.Code) != "" {
		event = event.WithMetadata("code", supplier.Code)
	}
	if strings.TrimSpace(supplier.Name) != "" {
		event = event.WithMetadata("name", supplier.Name)
	}
	return event.Normalize()
}

func BuildSupplierDeleteEvent(supplierID string, actor audit.AuditActor) audit.AuditEvent {
	return audit.NewAuditEvent(audit.AuditEntitySupplier, supplierID, audit.AuditActionDelete, actor).Normalize()
}

func BuildSupplierStatusChangeEvent(supplierID, oldStatus, newStatus string, actor audit.AuditActor) audit.AuditEvent {
	event := audit.NewAuditEvent(audit.AuditEntitySupplier, supplierID, audit.AuditActionStatus, actor)
	event = event.WithChanges(audit.AuditChange{
		Field:     "status",
		OldValue:   oldStatus,
		NewValue:   newStatus,
		Label:     "Status",
		ValueType:  "string",
	})
	return event.Normalize()
}
