package models

import "time"

type ProductBarcodeBinding struct {
	BaseModel
	ProductBarcode        string                       `gorm:"size:120;uniqueIndex;not null" json:"productBarcode"`
	PrepregRollInstanceID string                       `gorm:"size:36;index;not null" json:"prepregRollInstanceId"`
	PrepregRollInstance   *PrepregRollInstance         `gorm:"foreignKey:PrepregRollInstanceID;constraint:OnUpdate:CASCADE,OnDelete:RESTRICT" json:"prepregRollInstance,omitempty"`
	PrepregBindingToken   string                       `gorm:"size:120;index;not null" json:"prepregBindingToken"`
	PrepregQrCode         string                       `gorm:"type:text;not null" json:"prepregQrCode"`
	BarcodeProtocol       string                       `gorm:"size:40;not null" json:"barcodeProtocol"`
	BarcodeSummary        string                       `gorm:"type:text;not null" json:"barcodeSummary"`
	BoundAt               *time.Time                   `gorm:"index" json:"boundAt,omitempty"`
	BoundBy               string                       `gorm:"size:120;not null" json:"boundBy"`
	Source                string                       `gorm:"size:40;index;not null" json:"source"`
	Status                string                       `gorm:"size:20;index;not null" json:"status"`
	Events                []ProductBarcodeBindingEvent `gorm:"foreignKey:BindingID;constraint:OnUpdate:CASCADE,OnDelete:CASCADE" json:"events,omitempty"`
}

func (ProductBarcodeBinding) TableName() string {
	return "product_barcode_bindings"
}
