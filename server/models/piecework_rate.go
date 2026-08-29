package models

import "time"

// PieceworkRate defines the price snapshot rule for a product and process.
type PieceworkRate struct {
	BaseModel
	ProductID     string               `gorm:"type:uuid;index;not null" json:"productId"`
	Product       *Product             `gorm:"foreignKey:ProductID" json:"product,omitempty"`
	ProcessStepID *string              `gorm:"type:uuid;index" json:"processStepId"`
	ProcessStep   *ProcessStep         `gorm:"foreignKey:ProcessStepID" json:"processStep,omitempty"`
	RouteStepID   *string              `gorm:"type:uuid;index" json:"routeStepId"`
	RouteStep     *ProductionRouteStep `gorm:"foreignKey:RouteStepID" json:"routeStep,omitempty"`
	ProcessCode   string               `gorm:"size:50;index" json:"processCode"` // 兼容旧数据和快照
	ProcessName   string               `gorm:"size:100" json:"processName"`      // 展示快照
	Unit          string               `gorm:"size:20;not null;default:'PCS'" json:"unit"`
	UnitPrice     float64              `gorm:"type:decimal(10,4);default:0" json:"unitPrice"` // 精确到 4 位小数
	Currency      string               `gorm:"size:10;not null;default:'CNY'" json:"currency"`
	// EffectiveAt is retained only for reading legacy rows. New writes use
	// EffectiveFrom/EffectiveTo as the single canonical interval.
	EffectiveAt   time.Time  `gorm:"column:effective_at;->" json:"-"`
	EffectiveFrom *time.Time `gorm:"index" json:"effectiveFrom"`
	EffectiveTo   *time.Time `gorm:"index" json:"effectiveTo"`
	Status        string     `gorm:"size:20;index;default:'active'" json:"status"` // active, inactive, historical
	Remarks       string     `gorm:"type:text" json:"remarks"`
	Version       int64      `gorm:"not null;default:1" json:"version"`
	Operator      string     `gorm:"size:100" json:"operator"` // 操作人
}
