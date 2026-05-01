package trading_audit

import (
	"strings"
	"xdfc-server/audit"
	"xdfc-server/models"
)

func BuildSalesOrderCreateEvent(order models.SalesOrder, actor audit.AuditActor) audit.AuditEvent {
	event := audit.NewAuditEvent(audit.AuditEntitySalesOrder, order.ID, audit.AuditActionCreate, actor)
	event = event.WithMetadata("module", string(audit.AuditEntitySalesOrder))
	if strings.TrimSpace(order.OrderNo) != "" {
		event = event.WithMetadata("orderNo", order.OrderNo)
	}
	return event.Normalize()
}

func BuildSalesOrderStatusChangeEvent(orderID, oldStatus, newStatus string, actor audit.AuditActor) audit.AuditEvent {
	event := audit.NewAuditEvent(audit.AuditEntitySalesOrder, orderID, audit.AuditActionStatus, actor)
	event = event.WithChanges(audit.AuditChange{
		Field:     "status",
		OldValue:  oldStatus,
		NewValue:  newStatus,
		Label:     "Status",
		ValueType: "string",
	})
	return event.Normalize()
}
