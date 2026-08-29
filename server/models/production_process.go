package models

// ProcessStep defines a standard production process.
type ProcessStep struct {
	BaseModel
	Code        string `gorm:"size:50;uniqueIndex;not null" json:"code"`
	Name        string `gorm:"size:255;not null" json:"name"`
	Description string `gorm:"type:text" json:"description"`
	SortOrder   int    `gorm:"default:0" json:"sortOrder"`
	IsActive    bool   `gorm:"default:true" json:"isActive"`
}
