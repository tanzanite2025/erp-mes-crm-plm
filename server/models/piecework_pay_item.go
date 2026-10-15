package models

// PieceworkPayItem belongs to payroll and has no production identity.
type PieceworkPayItem struct {
	BaseModel
	Code    string `gorm:"size:100;not null;uniqueIndex" json:"code"`
	Name    string `gorm:"size:255;not null" json:"name"`
	Unit    string `gorm:"size:20;not null" json:"unit"`
	Status  string `gorm:"size:20;not null;default:active" json:"status"`
	Remarks string `gorm:"type:text" json:"remarks"`
	Version int64  `gorm:"not null;default:1" json:"version"`
}
