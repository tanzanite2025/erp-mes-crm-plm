package models

import "encoding/json"

// ProductionLine defines a production line and its nested topology.
type ProductionLine struct {
	BaseModel
	Code              string           `gorm:"size:50;uniqueIndex;not null" json:"code"`
	Name              string           `gorm:"size:255;not null" json:"name"`
	ProductTemplateID *string          `gorm:"type:uuid;index" json:"productTemplateId,omitempty"`
	ProductTemplate   *ProductTemplate `gorm:"foreignKey:ProductTemplateID;constraint:OnUpdate:CASCADE,OnDelete:RESTRICT" json:"productTemplate,omitempty"`
	Description       string           `gorm:"type:text" json:"description"`
	Version           int64            `gorm:"default:1" json:"version"`
	IsActive          bool             `gorm:"default:true" json:"isActive"`
	Segments          []LineSegment    `gorm:"foreignKey:LineID;constraint:OnUpdate:CASCADE,OnDelete:CASCADE" json:"segments"`
}

// LineSegment defines a segment within a production line.
//
// A segment is an L2 row that binds a production line to a stable MBOM branch.
type LineSegment struct {
	BaseModel
	LineID               string                         `gorm:"type:uuid;index;not null" json:"lineId"`
	Name                 string                         `gorm:"size:255;not null" json:"name"`
	ProductID            string                         `gorm:"type:uuid;index;not null" json:"productId"`
	ProductSKU           string                         `gorm:"size:100" json:"productSKU,omitempty"`
	ProductName          string                         `gorm:"size:255" json:"productName,omitempty"`
	BOMOwnerType         string                         `gorm:"size:20;index" json:"bomOwnerType,omitempty"`
	BOMOwnerCustomerID   string                         `gorm:"size:36;index" json:"bomOwnerCustomerId,omitempty"`
	BOMOwnerCustomerName string                         `gorm:"size:255" json:"bomOwnerCustomerName,omitempty"`
	BOMVersionLevel      string                         `gorm:"size:50;index" json:"bomVersionLevel,omitempty"`
	Description          string                         `gorm:"type:text" json:"description"`
	SortOrder            int                            `gorm:"default:0" json:"sortOrder"`
	Attributes           json.RawMessage                `gorm:"type:jsonb" json:"attributes"`
	BranchOperations     []ProductionBOMBranchOperation `gorm:"-" json:"branchOperations,omitempty"`
}
