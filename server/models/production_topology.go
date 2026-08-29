package models

import "encoding/json"

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
//
// A segment is an organizational production stage. Its bound ProcessStep
// records are the executable work items and the eventual piecework identity.
type LineSegment struct {
	BaseModel
	LineID      string          `gorm:"type:uuid;index;not null" json:"lineId"`
	Name        string          `gorm:"size:255;not null" json:"name"`
	Description string          `gorm:"type:text" json:"description"`
	SortOrder   int             `gorm:"default:0" json:"sortOrder"`
	Attributes  json.RawMessage `gorm:"type:jsonb" json:"attributes"`
	Processes   []ProcessStep   `gorm:"many2many:line_segment_process_mappings;constraint:OnUpdate:CASCADE,OnDelete:CASCADE" json:"processes"`
}
