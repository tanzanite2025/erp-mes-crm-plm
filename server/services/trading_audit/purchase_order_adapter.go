package trading_audit

import (
	"strings"
	"xdfc-server/audit"
	"xdfc-server/models"
)

func BuildPurchaseOrderCreateEvent(order models.PurchaseOrder, actor audit.AuditActor) audit.AuditEvent {
	event := audit.NewAuditEvent(audit.AuditEntityPurchaseOrder, order.ID, audit.AuditActionCreate, actor)
	event = event.WithMetadata("module", string(audit.AuditEntityPurchaseOrder))
	if strings.TrimSpace(order.OrderNo) != "" {
		event = event.WithMetadata("orderNo", order.OrderNo)
	}
	if strings.TrimSpace(order.SupplierID) != "" {
		event = event.WithMetadata("supplierId", order.SupplierID)
	}
	return event.Normalize()
}

func BuildPurchaseOrderWorkflowEvent(orderID, workflowInstanceID string, actor audit.AuditActor) audit.AuditEvent {
	event := audit.NewAuditEvent(audit.AuditEntityPurchaseOrder, orderID, audit.AuditActionWorkflow, actor)
	return event.WithMetadata("workflowInstanceId", strings.TrimSpace(workflowInstanceID)).Normalize()
}

func BuildPurchaseOrderStatusChangeEvent(orderID, oldStatus, newStatus string, actor audit.AuditActor) audit.AuditEvent {
	event := audit.NewAuditEvent(audit.AuditEntityPurchaseOrder, orderID, audit.AuditActionStatus, actor)
	event = event.WithChanges(audit.AuditChange{
		Field:     "status",
		OldValue:   oldStatus,
		NewValue:   newStatus,
		Label:     "Status",
		ValueType:  "string",
	})
	return event.Normalize()
}
