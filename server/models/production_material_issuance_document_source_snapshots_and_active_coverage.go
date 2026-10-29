package models

import (
	"encoding/json"
	"time"
)

const (
	ProductionMaterialIssuanceDispatched = "DISPATCHED"
	ProductionMaterialIssuanceWithdrawn  = "WITHDRAWN"
)

// Immutable source/recipe snapshots are retained after withdrawal. These records
// are documents and coverage, never inventory balances or warehouse movements.
type ProductionMaterialIssuanceDocument struct {
	ID                    string     `gorm:"primaryKey;type:uuid" json:"id"`
	DocumentNo            string     `gorm:"size:64;uniqueIndex;not null" json:"documentNo"`
	Version               int        `gorm:"not null" json:"version"`
	Status                string     `gorm:"size:20;index;not null" json:"status"`
	WarehouseCategoryCode string     `gorm:"size:100;not null" json:"warehouseCategoryCode"`
	DispatchedBy          string     `gorm:"size:100;not null" json:"dispatchedBy"`
	DispatchedAt          time.Time  `gorm:"not null;index" json:"dispatchedAt"`
	WithdrawnBy           string     `gorm:"size:100" json:"withdrawnBy"`
	WithdrawnAt           *time.Time `json:"withdrawnAt"`
	WithdrawalReason      string     `gorm:"type:text" json:"withdrawalReason"`
	WarehouseExecutionAt  *time.Time `json:"warehouseExecutionAt"`
}

type ProductionMaterialIssuanceSourceSnapshot struct {
	ID               string                              `gorm:"primaryKey;type:uuid" json:"id"`
	DocumentID       string                              `gorm:"type:uuid;not null;uniqueIndex:idx_material_issuance_document_source,priority:1;index" json:"documentId"`
	SalesOrderID     string                              `gorm:"type:uuid;not null;index" json:"salesOrderId"`
	SalesOrderLineID uint                                `gorm:"not null;uniqueIndex:idx_material_issuance_document_source,priority:2;index" json:"salesOrderLineId"`
	Position         int                                 `gorm:"not null" json:"position"`
	OrderVersion     int                                 `gorm:"not null" json:"orderVersion"`
	CustomerID       string                              `gorm:"size:100" json:"customerId"`
	ProductID        string                              `gorm:"type:uuid;not null" json:"productId"`
	FinishedQty      float64                             `gorm:"not null" json:"finishedQty"`
	FinishedUnit     string                              `gorm:"size:40;not null" json:"finishedUnit"`
	BasisFingerprint string                              `gorm:"size:64;not null" json:"basisFingerprint"`
	Snapshot         json.RawMessage                     `gorm:"type:jsonb;not null" json:"-"`
	Document         *ProductionMaterialIssuanceDocument `gorm:"foreignKey:DocumentID;constraint:OnDelete:RESTRICT" json:"-"`
}

// The primary key enforces one active whole-line coverage across all documents.
// Only withdrawal deletes coverage; the source snapshot remains as history.
type ProductionMaterialIssuanceActiveSourceCoverage struct {
	SalesOrderLineID uint                                      `gorm:"primaryKey;autoIncrement:false"`
	SalesOrderID     string                                    `gorm:"type:uuid;not null;index"`
	DocumentID       string                                    `gorm:"type:uuid;not null;index"`
	SourceSnapshotID string                                    `gorm:"type:uuid;not null;uniqueIndex"`
	SourceSnapshot   *ProductionMaterialIssuanceSourceSnapshot `gorm:"foreignKey:SourceSnapshotID;constraint:OnDelete:RESTRICT" json:"-"`
}

// A receipt is committed atomically with its document. Actor+command identity is
// shared by dispatch and withdrawal, so reusing a command for another action fails.
type ProductionMaterialIssuanceCommandReceipt struct {
	ID                 string    `gorm:"primaryKey;type:uuid"`
	ActorID            string    `gorm:"size:100;not null;uniqueIndex:idx_material_issuance_actor_command,priority:1"`
	CommandID          string    `gorm:"size:100;not null;uniqueIndex:idx_material_issuance_actor_command,priority:2"`
	RequestFingerprint string    `gorm:"size:64;not null"`
	DocumentID         string    `gorm:"type:uuid;not null"`
	MovementID         *string   `gorm:"type:uuid;index"`
	CompletedAt        time.Time `gorm:"not null"`
}
