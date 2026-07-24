package models

import "time"

// ProductBarcodeState stores the shortest production execution state for one product barcode.
// It deliberately does not require prepreg roll binding, so cutting traceability cannot block
// ordinary production or outsourcing flow.
type ProductBarcodeState struct {
	BaseModel
	ProductBarcode       string                     `gorm:"size:120;uniqueIndex;not null" json:"productBarcode"`
	ProductID            string                     `gorm:"size:36;index" json:"productId"`
	ProductName          string                     `gorm:"size:255" json:"productName"`
	RouteID              string                     `gorm:"type:uuid;index" json:"routeId"`
	RouteStepID          string                     `gorm:"type:uuid;index" json:"routeStepId"`
	CurrentProcessStepID string                     `gorm:"type:uuid;index" json:"currentProcessStepId"`
	CurrentProcessStep   *ProcessStep               `gorm:"foreignKey:CurrentProcessStepID" json:"currentProcessStep,omitempty"`
	Status               string                     `gorm:"size:30;index;not null;default:'NOT_STARTED'" json:"status"`
	LastEventID          string                     `gorm:"type:uuid;index" json:"lastEventId"`
	StartedAt            *time.Time                 `json:"startedAt,omitempty"`
	CompletedAt          *time.Time                 `json:"completedAt,omitempty"`
	Events               []ProductBarcodeStateEvent `gorm:"foreignKey:StateID;constraint:OnUpdate:CASCADE,OnDelete:CASCADE" json:"events,omitempty"`
}

func (ProductBarcodeState) TableName() string {
	return "product_barcode_states"
}

// ProductBarcodeStateEvent is the append-only history for barcode process state changes.
type ProductBarcodeStateEvent struct {
	BaseModel
	StateID           string               `gorm:"type:uuid;index;not null" json:"stateId"`
	State             *ProductBarcodeState `gorm:"foreignKey:StateID;constraint:OnUpdate:CASCADE,OnDelete:CASCADE" json:"state,omitempty"`
	ProductBarcode    string               `gorm:"size:120;index;not null" json:"productBarcode"`
	EventType         string               `gorm:"size:40;index;not null" json:"eventType"`
	FromProcessStepID string               `gorm:"type:uuid;index" json:"fromProcessStepId"`
	ToProcessStepID   string               `gorm:"type:uuid;index" json:"toProcessStepId"`
	RouteID           string               `gorm:"type:uuid;index" json:"routeId"`
	RouteStepID       string               `gorm:"type:uuid;index" json:"routeStepId"`
	Operator          string               `gorm:"size:120;not null" json:"operator"`
	PayloadSnapshot   string               `gorm:"type:text;not null" json:"payloadSnapshot"`
	OccurredAt        *time.Time           `gorm:"index" json:"occurredAt,omitempty"`
}

func (ProductBarcodeStateEvent) TableName() string {
	return "product_barcode_state_events"
}

// ProductionExecutionLot optionally groups one product barcode into a plan/task/batch context.
// Barcode process state does not depend on this table; it is for batching, analytics, and trace lookup.
type ProductionExecutionLot struct {
	BaseModel
	ProductBarcode string  `gorm:"size:120;uniqueIndex;not null" json:"productBarcode"`
	ProductID      string  `gorm:"size:36;index" json:"productId"`
	ProductName    string  `gorm:"size:255" json:"productName"`
	PlanID         string  `gorm:"type:uuid;index" json:"planId"`
	TaskID         string  `gorm:"type:uuid;index" json:"taskId"`
	BatchNo        string  `gorm:"size:80;index" json:"batchNo"`
	Quantity       float64 `gorm:"not null;default:1" json:"quantity"`
	Status         string  `gorm:"size:30;index;not null;default:'ACTIVE'" json:"status"`
	Notes          string  `gorm:"type:text" json:"notes"`
	Operator       string  `gorm:"size:120" json:"operator"`
}

func (ProductionExecutionLot) TableName() string {
	return "production_execution_lots"
}

// ProductionOperationExecution records one barcode-level operation action.
// Route progression, warehouse custody, quality release, and outsourcing status remain separate facts.
type ProductionOperationExecution struct {
	BaseModel
	ProductBarcode string     `gorm:"size:120;index;not null" json:"productBarcode"`
	StateID        string     `gorm:"type:uuid;index" json:"stateId"`
	ExecutionLotID string     `gorm:"type:uuid;index" json:"executionLotId"`
	RouteID        string     `gorm:"type:uuid;index" json:"routeId"`
	RouteStepID    string     `gorm:"type:uuid;index" json:"routeStepId"`
	ProcessStepID  string     `gorm:"type:uuid;index;not null" json:"processStepId"`
	ExecutionMode  string     `gorm:"size:30;index;not null;default:'IN_HOUSE'" json:"executionMode"`
	PartnerID      string     `gorm:"type:uuid;index" json:"partnerId"`
	Action         string     `gorm:"size:40;index;not null" json:"action"`
	Status         string     `gorm:"size:30;index;not null" json:"status"`
	Result         string     `gorm:"size:60" json:"result"`
	Operator       string     `gorm:"size:120;not null" json:"operator"`
	StartedAt      *time.Time `json:"startedAt,omitempty"`
	CompletedAt    *time.Time `json:"completedAt,omitempty"`
	Notes          string     `gorm:"type:text" json:"notes"`
}

func (ProductionOperationExecution) TableName() string {
	return "production_operation_executions"
}
