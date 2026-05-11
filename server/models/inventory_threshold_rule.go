package models

type InventoryThresholdRule struct {
	BaseModel
	TargetType         string  `gorm:"size:20;index;not null" json:"targetType"`
	MaterialID         *string `gorm:"type:uuid;index" json:"materialId,omitempty"`
	BOMID              *string `gorm:"type:uuid;index" json:"bomId,omitempty"`
	TargetNameSnapshot string  `gorm:"size:255;not null" json:"targetNameSnapshot"`
	TargetCodeSnapshot string  `gorm:"size:120" json:"targetCodeSnapshot"`
	ThresholdQty       float64 `gorm:"not null;default:0" json:"thresholdQty"`
	Enabled            bool    `gorm:"not null;default:true;index" json:"enabled"`
	Notes              string  `gorm:"type:text" json:"notes"`
}

func (InventoryThresholdRule) TableName() string {
	return "inventory_threshold_rules"
}
