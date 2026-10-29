package models

import "time"

const (
	ProductionMaterialMovementIssue                           = "ISSUE"
	ProductionMaterialMovementSupplement                      = "SUPPLEMENT"
	ProductionMaterialMovementReturn                          = "RETURN"
	ProductionMaterialPendingConsumptionWarehouseCategoryCode = "PRODUCTION_MATERIAL_PENDING_CONSUMPTION"
)

// Confirmed movements are immutable custody transfers, never production consumption.
type ProductionMaterialIssuanceWarehouseMovement struct {
	ID                   string                              `gorm:"primaryKey;type:uuid" json:"id"`
	DocumentID           string                              `gorm:"type:uuid;not null;uniqueIndex:idx_pmi_movement_version,priority:1;index" json:"documentId"`
	DocumentVersionAfter int                                 `gorm:"not null;uniqueIndex:idx_pmi_movement_version,priority:2" json:"documentVersionAfter"`
	Kind                 string                              `gorm:"size:20;not null;check:chk_pmi_movement_kind,kind IN ('ISSUE','SUPPLEMENT','RETURN')" json:"kind"`
	Reason               string                              `gorm:"type:text" json:"reason"`
	ConfirmedBy          string                              `gorm:"size:100;not null" json:"confirmedBy"`
	ConfirmedAt          time.Time                           `gorm:"not null;index" json:"confirmedAt"`
	Document             *ProductionMaterialIssuanceDocument `gorm:"foreignKey:DocumentID;constraint:OnDelete:RESTRICT" json:"-"`
}

type ProductionMaterialIssuanceWarehouseMovementMaterial struct {
	ID                    string                                       `gorm:"primaryKey;type:uuid" json:"id"`
	MovementID            string                                       `gorm:"type:uuid;not null;index;uniqueIndex:idx_pmi_movement_material_batch,priority:1" json:"movementId"`
	MaterialID            string                                       `gorm:"type:uuid;not null;index;uniqueIndex:idx_pmi_movement_material_batch,priority:2" json:"materialId"`
	BatchNo               string                                       `gorm:"size:100;not null;uniqueIndex:idx_pmi_movement_material_batch,priority:3" json:"batchNo"`
	Unit                  string                                       `gorm:"size:40;not null" json:"unit"`
	Quantity              float64                                      `gorm:"not null;check:chk_pmi_material_quantity,quantity > 0" json:"quantity"`
	UnitCost              float64                                      `gorm:"not null;check:chk_pmi_material_cost,unit_cost >= 0" json:"unitCost"`
	TotalValue            float64                                      `gorm:"not null;check:chk_pmi_material_value,total_value >= 0" json:"totalValue"`
	SourceInventoryID     string                                       `gorm:"type:uuid;not null" json:"sourceInventoryId"`
	TargetInventoryID     string                                       `gorm:"type:uuid;not null" json:"targetInventoryId"`
	OutboundLedgerEntryID string                                       `gorm:"type:uuid;not null;uniqueIndex" json:"outboundLedgerEntryId"`
	InboundLedgerEntryID  string                                       `gorm:"type:uuid;not null;uniqueIndex" json:"inboundLedgerEntryId"`
	Movement              *ProductionMaterialIssuanceWarehouseMovement `gorm:"foreignKey:MovementID;constraint:OnDelete:RESTRICT" json:"-"`
}

// Returns identify the original allocation, preserving its source, batch and cost.
type ProductionMaterialIssuanceOrderLineAllocation struct {
	ID                   string                                               `gorm:"primaryKey;type:uuid" json:"id"`
	MovementMaterialID   string                                               `gorm:"type:uuid;not null;index" json:"movementMaterialId"`
	SourceSnapshotID     string                                               `gorm:"type:uuid;not null;index" json:"sourceSnapshotId"`
	SalesOrderLineID     uint                                                 `gorm:"not null;index" json:"salesOrderLineId"`
	Quantity             float64                                              `gorm:"not null;check:chk_pmi_allocation_quantity,quantity > 0" json:"quantity"`
	OriginalAllocationID *string                                              `gorm:"type:uuid;index" json:"originalAllocationId"`
	MovementMaterial     *ProductionMaterialIssuanceWarehouseMovementMaterial `gorm:"foreignKey:MovementMaterialID;constraint:OnDelete:RESTRICT" json:"-"`
	SourceSnapshot       *ProductionMaterialIssuanceSourceSnapshot            `gorm:"foreignKey:SourceSnapshotID;constraint:OnDelete:RESTRICT" json:"-"`
}
