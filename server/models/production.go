package models

import "encoding/json"

// ProcessStep defines a standard production process.
type ProcessStep struct {
	BaseModel
	Code        string `gorm:"size:50;uniqueIndex;not null" json:"code"`
	Name        string `gorm:"size:255;not null" json:"name"`
	Description string `gorm:"type:text" json:"description"`
	SortOrder   int    `gorm:"default:0" json:"sortOrder"`
	IsActive    bool   `gorm:"default:true" json:"isActive"`
}

// ProductionRoute defines the versioned process route for a product family.
type ProductionRoute struct {
	BaseModel
	Code              string                `gorm:"size:50;uniqueIndex;not null" json:"code"`
	Name              string                `gorm:"size:255;not null" json:"name"`
	ProductID         string                `gorm:"size:36;index" json:"productId"`
	ProductName       string                `gorm:"size:255" json:"productName"`
	ProductTemplateID string                `gorm:"size:36;index" json:"productTemplateId"`
	Description       string                `gorm:"type:text" json:"description"`
	Version           int64                 `gorm:"default:1" json:"version"`
	Status            string                `gorm:"size:20;index;default:'DRAFT'" json:"status"`
	Steps             []ProductionRouteStep `gorm:"foreignKey:RouteID;constraint:OnUpdate:CASCADE,OnDelete:CASCADE" json:"steps"`
}

// ProductionRouteStep binds a route sequence to a production segment and process.
type ProductionRouteStep struct {
	BaseModel
	RouteID          string       `gorm:"type:uuid;index;not null" json:"routeId"`
	Sequence         int          `gorm:"not null;default:0" json:"sequence"`
	SegmentID        string       `gorm:"type:uuid;index;not null" json:"segmentId"`
	Segment          *LineSegment `gorm:"foreignKey:SegmentID" json:"segment,omitempty"`
	ProcessStepID    string       `gorm:"type:uuid;index" json:"processStepId"`
	ProcessStep      *ProcessStep `gorm:"foreignKey:ProcessStepID" json:"processStep,omitempty"`
	ExecutionMode    string       `gorm:"size:30;not null;default:'IN_HOUSE'" json:"executionMode"`
	QualityGate      string       `gorm:"size:30;not null;default:'NONE'" json:"qualityGate"`
	EstimatedMinutes int          `gorm:"not null;default:0" json:"estimatedMinutes"`
	TransferRequired bool         `gorm:"not null;default:false" json:"transferRequired"`
	Description      string       `gorm:"type:text" json:"description"`
}

// ProductionLine defines a production line and its nested topology.
type ProductionLine struct {
	BaseModel
	Code        string        `gorm:"size:50;uniqueIndex;not null" json:"code"`
	Name        string        `gorm:"size:255;not null" json:"name"`
	Description string        `gorm:"type:text" json:"description"`
	Version     int64         `gorm:"default:1" json:"version"`
	IsActive    bool          `gorm:"default:true" json:"isActive"`
	Segments    []LineSegment `gorm:"foreignKey:LineID;constraint:OnUpdate:CASCADE,OnDelete:CASCADE" json:"segments"`
}

// LineSegment defines a segment within a production line.
type LineSegment struct {
	BaseModel
	LineID      string          `gorm:"type:uuid;index;not null" json:"lineId"`
	Name        string          `gorm:"size:255;not null" json:"name"`
	Description string          `gorm:"type:text" json:"description"`
	SortOrder   int             `gorm:"default:0" json:"sortOrder"`
	Attributes  json.RawMessage `gorm:"type:jsonb" json:"attributes"`
	Processes   []ProcessStep   `gorm:"many2many:line_segment_process_mappings;constraint:OnUpdate:CASCADE,OnDelete:CASCADE" json:"processes"`
}
