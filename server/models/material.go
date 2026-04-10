package models

import (
	"encoding/json"
	"time"
)

// Material 鐗╂枡涓绘暟鎹?
type Material struct {
	BaseModel
	MasterDataControl
	Code               string          `gorm:"size:100;uniqueIndex;not null" json:"code"`
	Name               string          `gorm:"size:255;not null" json:"name"`
	Category           string          `gorm:"size:50;index" json:"category"`
	Spec               string          `gorm:"type:text" json:"spec"`
	InternalDimensions json.RawMessage `gorm:"type:jsonb" json:"internalDimensions"`
	ExternalDimensions json.RawMessage `gorm:"type:jsonb" json:"externalDimensions"`
	UOM                string          `gorm:"size:20;default:'pcs'" json:"uom"`
	MinStock           float64         `gorm:"default:0" json:"minStock"`
	CostPrice          float64         `gorm:"default:0" json:"costPrice"`
	SupplierID         string          `gorm:"size:100;index" json:"supplierId"`
	Description        string          `gorm:"type:text" json:"description"`
	Images             json.RawMessage `gorm:"type:jsonb" json:"images"`
	Status             string          `gorm:"size:20;default:'Active'" json:"status"`
	Version            int             `gorm:"default:1" json:"version"`
}

func (Material) TableName() string {
	return "materials"
}

// PackagingRule 鍖呰瑙勫垯/鍗曚綅鎹㈢畻
type PackagingRule struct {
	ID               string    `gorm:"primaryKey;type:uuid;default:gen_random_uuid()" json:"id"`
	MaterialID       string    `gorm:"type:uuid;uniqueIndex:idx_packaging_rules_material_id;not null" json:"materialId"`
	PackUnit         string    `gorm:"size:20;not null" json:"packUnit"`
	BaseUnit         string    `gorm:"size:20;not null" json:"baseUnit"`
	ConversionFactor float64   `gorm:"not null" json:"conversionFactor"`
	Direction        string    `gorm:"size:20;default:'forward'" json:"direction"`
	UpdatedAt        time.Time `json:"updatedAt"`
}

func (PackagingRule) TableName() string {
	return "packaging_rules"
}
