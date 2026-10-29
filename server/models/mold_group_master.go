package models

// MoldGroup is the independent directory identity shared by molds and products.
// Names remain unique after deletion so an old name cannot identify a new group.
type MoldGroup struct {
	BaseModel
	Name        string `gorm:"size:100;not null;uniqueIndex:ux_mold_groups_name" json:"name"`
	Description string `gorm:"type:text" json:"description"`
	Active      bool   `gorm:"not null;default:true" json:"active"`
	Version     int    `gorm:"not null;default:1" json:"version"`
	CreatedBy   string `gorm:"size:100" json:"createdBy"`
	UpdatedBy   string `gorm:"size:100" json:"updatedBy"`
}
