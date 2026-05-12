package models

import "encoding/json"

// BOM 閰嶆柟娓呭崟妯″瀷
type BOM struct {
	BaseModel
	MasterDataControl
	BOMNo           string          `gorm:"size:50;uniqueIndex;not null" json:"bomNo"`
	ProductID       string          `gorm:"type:uuid;index;not null" json:"productId"`
	Product         *Product        `gorm:"foreignKey:ProductID" json:"product,omitempty"`
	VersionText     string          `gorm:"size:20;default:'V1.0'" json:"version"`
	DisplayVersion  string          `gorm:"-" json:"bomDisplayVersion,omitempty"`
	Status          string          `gorm:"size:20;default:'active'" json:"status"`
	Items           []BOMItem       `gorm:"foreignKey:BOMID;constraint:OnUpdate:CASCADE,OnDelete:CASCADE" json:"items"`
	Description     string          `gorm:"type:text" json:"description"`
	RelationSidecar json.RawMessage `gorm:"type:jsonb" json:"-"`
}

// BOMItem BOM 鏄庣粏琛屾ā鍨?
type BOMItem struct {
	ID             string  `gorm:"primaryKey;type:uuid;default:gen_random_uuid()" json:"id"`
	BOMID          string  `gorm:"type:uuid;index;not null" json:"bomId"`
	Section        string  `gorm:"size:100" json:"section"`
	MaterialID     string  `gorm:"type:uuid;index" json:"materialId"`
	UnitPrice      float64 `json:"unitPrice"`
	Unit           string  `gorm:"size:20" json:"unit"`
	UnitUsage      float64 `json:"unitUsage"`
	WastagePercent float64 `json:"wastagePercent"`
	StandardUsage  float64 `json:"standardUsage"`
	MaterialType   string  `gorm:"size:50" json:"materialType"`
	SupplyChannel  string  `gorm:"size:100" json:"supplyChannel"`
}
