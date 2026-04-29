package models

import "time"

type ProductBarcodeCaptureSession struct {
	BaseModel
	SessionID       string     `gorm:"size:80;uniqueIndex;not null" json:"sessionId"`
	UploadToken     string     `gorm:"size:120;not null" json:"-"`
	Status          string     `gorm:"size:24;default:'Waiting';index" json:"status"`
	RawCode         string     `gorm:"size:120" json:"rawCode"`
	BarcodeProtocol string     `gorm:"size:40" json:"barcodeProtocol"`
	BarcodeSummary  string     `gorm:"type:text" json:"barcodeSummary"`
	SubmittedAt     *time.Time `json:"submittedAt,omitempty"`
	ExpiresAt       time.Time  `gorm:"index" json:"expiresAt"`
}

func (ProductBarcodeCaptureSession) TableName() string {
	return "product_barcode_capture_sessions"
}
