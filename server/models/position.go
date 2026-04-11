package models

// Position defines a responsibility profile, optionally scoped to org/production units.
type Position struct {
	BaseModel
	Name             string  `gorm:"size:100;not null" json:"name"`
	Code             string  `gorm:"size:64;index" json:"code"`
	OrgUnitID        *string `gorm:"type:uuid;index" json:"orgUnitId"`
	ProductionUnitID *string `gorm:"type:uuid;index" json:"productionUnitId"`
	Category         string  `gorm:"size:50" json:"category"`
	Level            int     `gorm:"not null;default:1" json:"level"`
	IsManagerial     bool    `gorm:"not null;default:false" json:"isManagerial"`
	Status           string  `gorm:"size:20;not null;default:'active'" json:"status"`
	SortOrder        int     `gorm:"not null;default:0" json:"sortOrder"`
	Metadata         string  `gorm:"type:jsonb;not null;default:'{}'" json:"metadata"`
	OrgUnitName      string  `gorm:"->" json:"orgUnitName"`
}

func (Position) TableName() string {
	return "positions"
}
