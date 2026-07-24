package models

import "time"

// QualityBatchQuantitySettlement is the quality-owned quantity fact for one
// production-plan batch. It is intentionally separate from InspectionTask:
// SampleQty describes sampling scope, while this record settles the complete
// batch quantity used by cross-domain analysis.
type QualityBatchQuantitySettlement struct {
	BaseModel
	ProductionPlanID  string          `gorm:"type:uuid;index;not null;uniqueIndex:idx_quality_batch_quantity_settlement_identity" json:"productionPlanId"`
	OrderID           string          `gorm:"type:uuid;index" json:"orderId"`
	ProductID         string          `gorm:"type:uuid;index;not null" json:"productId"`
	BatchNo           string          `gorm:"size:50;index;not null;uniqueIndex:idx_quality_batch_quantity_settlement_identity" json:"batchNo"`
	InspectionTaskID  string          `gorm:"type:uuid;index;not null" json:"inspectionTaskId"`
	InputQuantity     float64         `gorm:"not null" json:"inputQuantity"`
	QualifiedQuantity float64         `gorm:"not null" json:"qualifiedQuantity"`
	RejectedQuantity  float64         `gorm:"not null" json:"rejectedQuantity"`
	ReworkQuantity    float64         `gorm:"not null" json:"reworkQuantity"`
	QuantityUnit      string          `gorm:"size:20;not null" json:"quantityUnit"`
	OccurredAt        time.Time       `gorm:"index;not null" json:"occurredAt"`
	ConfirmedAt       time.Time       `gorm:"not null" json:"confirmedAt"`
	ConfirmedBy       string          `gorm:"size:100;not null" json:"confirmedBy"`
	ProductionPlan    *ProductionPlan `gorm:"foreignKey:ProductionPlanID" json:"productionPlan,omitempty"`
	InspectionTask    *InspectionTask `gorm:"foreignKey:InspectionTaskID" json:"inspectionTask,omitempty"`
}

func (QualityBatchQuantitySettlement) TableName() string {
	return "quality_batch_quantity_settlements"
}
