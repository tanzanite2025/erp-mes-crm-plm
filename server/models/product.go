package models

import (
	"encoding/json"
	"time"
)

// ProductType 浜у搧鍒嗙被/鐗╂枡绉嶇被
type ProductType struct {
	ID          string        `gorm:"primaryKey;type:uuid;default:gen_random_uuid()" json:"id"`
	ParentID    *string       `gorm:"type:uuid" json:"parentId"`
	TemplateID  *string       `gorm:"type:uuid" json:"templateId"`
	Name        string        `gorm:"size:100;not null" json:"name"`
	Code        string        `gorm:"size:50;uniqueIndex" json:"code"`
	Description string        `gorm:"type:text" json:"description"`
	Active      bool          `gorm:"default:true" json:"active"`
	SortOrder   int           `json:"sortOrder"`
	CreatedAt   time.Time     `gorm:"autoCreateTime" json:"createdAt"`
	UpdatedAt   time.Time     `gorm:"autoUpdateTime" json:"updatedAt"`
	Version     int           `gorm:"default:1" json:"version"`
	Children    []ProductType `gorm:"foreignKey:ParentID" json:"children,omitempty"`
}

func (ProductType) TableName() string {
	return "product_types"
}

// Product 宸ョ▼浜у搧妗ｆ妯″瀷
type Product struct {
	BaseModel
	MasterDataControl
	SKU                      string                  `gorm:"size:100;uniqueIndex;not null" json:"sku"`
	Name                     string                  `gorm:"size:255;not null" json:"name"`
	ModelCode                string                  `gorm:"size:10" json:"modelCode"`
	TypeID                   string                  `gorm:"type:uuid" json:"typeId"`
	Depth                    float64                 `json:"depth"`
	WidthInternal            float64                 `json:"widthInternal"`
	WidthExternal            float64                 `json:"widthExternal"`
	MaxTirePressure          float64                 `json:"maxTirePressure"`
	TireType                 string                  `gorm:"size:50" json:"tireType"`
	BrakeType                string                  `gorm:"size:50" json:"brakeType"`
	TechSeries               string                  `gorm:"size:50" json:"techSeries"`
	VersionLevel             string                  `gorm:"size:50" json:"versionLevel"`
	// Weight 字段已移除：重量端到端由 BOM.MeasuredWeight 持有，
	// 产品概览页通过查询当前 RELEASED MBOM 实时取值（方案 B）。
	Length                   float64                 `json:"length"`
	Angle                    float64                 `json:"angle"`
	Clamp                    string                  `gorm:"size:50" json:"clamp"`
	Offset                   float64                 `json:"offset"`
	AxleCrown                float64                 `json:"axleCrown"`
	Steerer                  string                  `gorm:"size:50" json:"steerer"`
	Image                    string                  `json:"image"`
	Restrictions             []byte                  `gorm:"type:jsonb;serializer:json" json:"restrictions"`
	MoldGroup                string                  `gorm:"size:100" json:"moldGroup"`
	Description              string                  `gorm:"type:text" json:"description"`
	EngineeringSpecID        string                  `gorm:"type:uuid;index" json:"engineeringSpecId"`
	AttributeValues          []ProductAttributeValue `gorm:"foreignKey:ProductID;constraint:OnUpdate:CASCADE,OnDelete:CASCADE" json:"attributeValues,omitempty"`
	TechnicalSpecs           json.RawMessage         `gorm:"column:technical_specs;type:jsonb;serializer:json" json:"techSpecs"`
	BarcodeConfig            []byte                  `gorm:"type:jsonb;serializer:json" json:"barcodeConfig"`
	Attachments              []byte                  `gorm:"type:jsonb;serializer:json" json:"attachments"`
	Status                   string                  `gorm:"size:20;default:'Active'" json:"status"`
	// OwnerType / OwnerCustomerID 已迁移到 BOM。
	// 归属语义在 BOM 维度（同一产品的不同 BOM 可服务不同客户/内部），
	// Product 仅作产品身份层，不再持有归属。
	TemplateKey              string                  `gorm:"-" json:"templateKey,omitempty"`
	ResolvedTemplateID       string                  `gorm:"-" json:"resolvedTemplateId,omitempty"`
	ResolvedTemplateKey      string                  `gorm:"-" json:"resolvedTemplateKey,omitempty"`
	TemplateResolutionSource string                  `gorm:"-" json:"templateResolutionSource,omitempty"`
	TemplateResolutionError  string                  `gorm:"-" json:"templateResolutionError,omitempty"`
	Version                  int                     `gorm:"default:1" json:"version"`
}
