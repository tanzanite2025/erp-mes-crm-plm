package trading_audit

import (
	"strings"
	"xdfc-server/audit"
	"xdfc-server/models"
)

func BuildCustomerCreateEvent(customer models.Customer, actor audit.AuditActor) audit.AuditEvent {
	event := audit.NewAuditEvent(audit.AuditEntityCustomer, customer.ID, audit.AuditActionCreate, actor)
	event = event.WithMetadata("module", string(audit.AuditEntityCustomer))
	if strings.TrimSpace(customer.Code) != "" {
		event = event.WithMetadata("code", customer.Code)
	}
	if strings.TrimSpace(customer.Name) != "" {
		event = event.WithMetadata("name", customer.Name)
	}
	return event.Normalize()
}

func BuildCustomerDeleteEvent(customerID string, actor audit.AuditActor) audit.AuditEvent {
	return audit.NewAuditEvent(audit.AuditEntityCustomer, customerID, audit.AuditActionDelete, actor).Normalize()
}

func BuildCustomerStatusChangeEvent(customerID, oldStatus, newStatus string, actor audit.AuditActor) audit.AuditEvent {
	event := audit.NewAuditEvent(audit.AuditEntityCustomer, customerID, audit.AuditActionStatus, actor)
	event = event.WithChanges(audit.AuditChange{
		Field:     "status",
		OldValue:   oldStatus,
		NewValue:   newStatus,
		Label:     "Status",
		ValueType:  "string",
	})
	return event.Normalize()
}
