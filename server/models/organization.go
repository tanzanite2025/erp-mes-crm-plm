package models

import "encoding/json"

// Organization is the organization tree API projection backed by org_units.
// It is kept as a response/write contract shape, not as the database authority.
type Organization struct {
	BaseModel
	Name               string          `gorm:"size:100;not null" json:"name"`
	ParentID           *string         `gorm:"size:36" json:"parentId"`
	Manager            string          `gorm:"size:100" json:"manager"`
	Description        string          `gorm:"type:text" json:"description"`
	Type               string          `gorm:"size:50;default:'department'" json:"type"`
	LinkedArchitecture json.RawMessage `gorm:"type:jsonb" json:"linkedArchitecture"`
	Children           []*Organization `gorm:"foreignKey:ParentID" json:"children,omitempty"`
}
