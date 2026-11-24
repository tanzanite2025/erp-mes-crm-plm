package models

import "encoding/json"

// ProductionTopologyTemplate stores an independent value snapshot, without actual topology associations.
type ProductionTopologyTemplate struct {
	BaseModel
	Name        string          `gorm:"size:255;not null" json:"name"`
	Description string          `gorm:"type:text" json:"description"`
	Version     int64           `gorm:"not null;default:1" json:"version"`
	Snapshot    json.RawMessage `gorm:"type:jsonb;not null" json:"snapshot"`
}
