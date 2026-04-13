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
	Version     int           `gorm:"default:1" json:"_v"`
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
	TireType                 string                  `gorm:"size:50" json:"tireType"`
	BrakeType                string                  `gorm:"size:50" json:"brakeType"`
	TechSeries               string                  `gorm:"size:50" json:"techSeries"`
	VersionLevel             string                  `gorm:"size:50" json:"versionLevel"`
	Weight                   float64                 `json:"weight"`
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
	TemplateKey              string                  `gorm:"-" json:"templateKey,omitempty"`
	ResolvedTemplateID       string                  `gorm:"-" json:"resolvedTemplateId,omitempty"`
	ResolvedTemplateKey      string                  `gorm:"-" json:"resolvedTemplateKey,omitempty"`
	TemplateResolutionSource string                  `gorm:"-" json:"templateResolutionSource,omitempty"`
	TemplateResolutionError  string                  `gorm:"-" json:"templateResolutionError,omitempty"`
	Version                  int                     `gorm:"default:1" json:"_v"`
}

// BOM 閰嶆柟娓呭崟妯″瀷
type BOM struct {
	BaseModel
	MasterDataControl
	BOMNo          string       `gorm:"size:50;uniqueIndex;not null" json:"bomNo"`
	ProductID      string       `gorm:"type:uuid;index;not null" json:"productId"`
	Product        *Product     `gorm:"foreignKey:ProductID" json:"product,omitempty"`
	ChangeOrderID  *string      `gorm:"type:uuid;index" json:"changeOrderId"`
	ChangeOrder    *ChangeOrder `gorm:"foreignKey:ChangeOrderID" json:"changeOrder,omitempty"`
	VersionText    string       `gorm:"size:20;default:'V1.0'" json:"version"`
	DisplayVersion string       `gorm:"-" json:"bomDisplayVersion,omitempty"`
	Status         string       `gorm:"size:20;default:'active'" json:"status"`
	Items          []BOMItem    `gorm:"foreignKey:BOMID;constraint:OnUpdate:CASCADE,OnDelete:CASCADE" json:"items"`
	Description    string       `gorm:"type:text" json:"description"`
}

// BOMItem BOM 鏄庣粏琛屾ā鍨?
type BOMItem struct {
	ID             string              `gorm:"primaryKey;type:uuid;default:gen_random_uuid()" json:"id"`
	BOMID          string              `gorm:"type:uuid;index;not null" json:"bomId"`
	Section        string              `gorm:"size:100" json:"section"`
	MaterialID     string              `gorm:"type:uuid;index" json:"materialId"`
	UnitPrice      float64             `json:"unitPrice"`
	Unit           string              `gorm:"size:20" json:"unit"`
	UnitUsage      float64             `json:"unitUsage"`
	WastagePercent float64             `json:"wastagePercent"`
	StandardUsage  float64             `json:"standardUsage"`
	MaterialType   string              `gorm:"size:50" json:"materialType"`
	SupplyChannel  string              `gorm:"size:100" json:"supplyChannel"`
	Substitutes    []BOMSubstituteItem `gorm:"foreignKey:BOMItemID;constraint:OnUpdate:CASCADE,OnDelete:CASCADE" json:"substitutes"`
}

// BOMSubstituteItem defines approved substitute materials for a BOM line.
type BOMSubstituteItem struct {
	ID             string    `gorm:"primaryKey;type:uuid;default:gen_random_uuid()" json:"id"`
	BOMItemID      string    `gorm:"type:uuid;index;not null" json:"bomItemId"`
	MaterialID     string    `gorm:"type:uuid;index;not null" json:"materialId"`
	Material       *Material `gorm:"foreignKey:MaterialID" json:"material,omitempty"`
	Priority       int       `gorm:"default:1" json:"priority"`
	ConversionRate float64   `gorm:"default:1" json:"conversionRate"`
	Notes          string    `gorm:"type:text" json:"notes"`
}
