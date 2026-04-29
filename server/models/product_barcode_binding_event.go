package models

import "time"

type ProductBarcodeBindingEvent struct {
	BaseModel
	BindingID             string                 `gorm:"type:uuid;index;not null" json:"bindingId"`
	Binding               *ProductBarcodeBinding `gorm:"foreignKey:BindingID;constraint:OnUpdate:CASCADE,OnDelete:CASCADE" json:"binding,omitempty"`
	PrepregRollInstanceID string                 `gorm:"size:36;index;not null" json:"prepregRollInstanceId"`
	PrepregRollInstance   *PrepregRollInstance   `gorm:"foreignKey:PrepregRollInstanceID;constraint:OnUpdate:CASCADE,OnDelete:RESTRICT" json:"prepregRollInstance,omitempty"`
	EventType             string                 `gorm:"size:40;index;not null" json:"eventType"`
	ProductBarcode        string                 `gorm:"size:120;index;not null" json:"productBarcode"`
	PrepregBindingToken   string                 `gorm:"size:120;index;not null" json:"prepregBindingToken"`
	PayloadSnapshot       string                 `gorm:"type:text;not null" json:"payloadSnapshot"`
	Operator              string                 `gorm:"size:120;not null" json:"operator"`
	OccurredAt            *time.Time             `gorm:"index" json:"occurredAt,omitempty"`
}

func (ProductBarcodeBindingEvent) TableName() string {
	return "product_barcode_binding_events"
}
