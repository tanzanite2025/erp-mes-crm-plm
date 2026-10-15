package models

import "time"

// PieceworkRate prices an independent payroll item.
type PieceworkRate struct {
	BaseModel
	PayItemID     string     `gorm:"type:uuid;index;not null" json:"payItemId"`
	PayItemCode   string     `gorm:"size:100;not null" json:"payItemCode"`
	PayItemName   string     `gorm:"size:255;not null" json:"payItemName"`
	Unit          string     `gorm:"size:20;not null;default:'PCS'" json:"unit"`
	UnitPrice     float64    `gorm:"type:decimal(10,4);not null;default:0" json:"unitPrice"` // 精确到 4 位小数
	Currency      string     `gorm:"size:10;not null;default:'CNY'" json:"currency"`
	EffectiveFrom *time.Time `gorm:"index;not null" json:"effectiveFrom"`
	EffectiveTo   *time.Time `gorm:"index" json:"effectiveTo"`
	Status        string     `gorm:"size:20;index;not null;default:'active'" json:"status"`
	Remarks       string     `gorm:"type:text" json:"remarks"`
	Version       int64      `gorm:"not null;default:1" json:"version"`
	Operator      string     `gorm:"size:100" json:"operator"` // 操作人
}
