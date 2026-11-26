package models

// ProductionLine is independent production-line master data.
type ProductionLine struct {
	BaseModel
	Code        string `gorm:"size:50;uniqueIndex;not null" json:"code"`
	Name        string `gorm:"size:255;not null" json:"name"`
	Description string `gorm:"type:text" json:"description"`
	Version     int64  `gorm:"default:1" json:"version"`
	IsActive    bool   `gorm:"default:true" json:"isActive"`
}
