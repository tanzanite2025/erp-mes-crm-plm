package models

// ProductionWorkLocation identifies a physical place where production work is performed.
type ProductionWorkLocation struct {
	BaseModel
	Code        string `gorm:"size:50;uniqueIndex;not null" json:"code"`
	Name        string `gorm:"size:255;not null" json:"name"`
	Description string `gorm:"type:text" json:"description"`
	IsActive    bool   `gorm:"not null;default:true;index" json:"isActive"`
	Version     int64  `gorm:"not null;default:1" json:"version"`
}

func (ProductionWorkLocation) TableName() string {
	return "production_work_locations"
}
