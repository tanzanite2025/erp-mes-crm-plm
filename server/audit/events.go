package audit

import "time"

// AuditAction describes the type of audited change.
type AuditAction string

const (
	AuditActionCreate   AuditAction = "Create"
	AuditActionUpdate   AuditAction = "Update"
	AuditActionDelete   AuditAction = "Delete"
	AuditActionPatch    AuditAction = "Patch"
	AuditActionBulkSync AuditAction = "BulkSync"
	AuditActionStatus   AuditAction = "StatusChange"
	AuditActionWorkflow AuditAction = "WorkflowUpdate"
)

// AuditEntityKey identifies the audited business entity.
type AuditEntityKey string

const (
	AuditEntitySalesOrder     AuditEntityKey = "sales-order"
	AuditEntityPurchaseOrder  AuditEntityKey = "purchase-order"
	AuditEntityCustomer       AuditEntityKey = "customer"
	AuditEntitySupplier       AuditEntityKey = "supplier"
	AuditEntityEmployee       AuditEntityKey = "employee"
	AuditEntityProductionLine AuditEntityKey = "production-line"
)

// AuditActor captures the operator context for an audit event.
type AuditActor struct {
	UserID   string `json:"userId,omitempty"`
	Username string `json:"username,omitempty"`
	IP       string `json:"ip,omitempty"`
	Source   string `json:"source,omitempty"`
}

// Normalize fills default values for the actor context.
func (a AuditActor) Normalize() AuditActor {
	if a.Source == "" {
		a.Source = "system"
	}
	return a
}

// AuditChange describes a field-level mutation.
type AuditChange struct {
	Field     string `json:"field"`
	OldValue  any    `json:"oldValue,omitempty"`
	NewValue  any    `json:"newValue,omitempty"`
	ValueType string `json:"valueType,omitempty"`
	Label     string `json:"label,omitempty"`
}

// AuditChangeSet groups all field-level changes for one event.
type AuditChangeSet struct {
	Fields []AuditChange `json:"fields"`
}

// IsEmpty reports whether the change set contains any field changes.
func (s AuditChangeSet) IsEmpty() bool {
	return len(s.Fields) == 0
}

// AuditEvent is the unified audit domain event used by adapters and writers.
type AuditEvent struct {
	EntityKey  AuditEntityKey    `json:"entityKey"`
	EntityID   string            `json:"entityId"`
	Action     AuditAction       `json:"action"`
	Actor      AuditActor        `json:"actor"`
	ChangeSet  AuditChangeSet    `json:"changeSet"`
	Metadata   map[string]string `json:"metadata,omitempty"`
	OccurredAt time.Time         `json:"occurredAt"`
}

// NewAuditEvent creates a normalized audit event shell.
func NewAuditEvent(entityKey AuditEntityKey, entityID string, action AuditAction, actor AuditActor) AuditEvent {
	return AuditEvent{
		EntityKey:  entityKey,
		EntityID:   entityID,
		Action:     action,
		Actor:      actor.Normalize(),
		ChangeSet:  AuditChangeSet{Fields: []AuditChange{}},
		Metadata:   map[string]string{},
		OccurredAt: time.Now(),
	}
}

// WithChanges appends field changes into the event.
func (e AuditEvent) WithChanges(changes ...AuditChange) AuditEvent {
	if len(changes) == 0 {
		return e
	}
	e.ChangeSet.Fields = append(e.ChangeSet.Fields, changes...)
	return e
}

// WithMetadata attaches a metadata key/value pair into the event.
func (e AuditEvent) WithMetadata(key, value string) AuditEvent {
	if e.Metadata == nil {
		e.Metadata = map[string]string{}
	}
	e.Metadata[key] = value
	return e
}

// Normalize applies default values to the event.
func (e AuditEvent) Normalize() AuditEvent {
	e.Actor = e.Actor.Normalize()
	if e.Metadata == nil {
		e.Metadata = map[string]string{}
	}
	if e.OccurredAt.IsZero() {
		e.OccurredAt = time.Now()
	}
	return e
}
