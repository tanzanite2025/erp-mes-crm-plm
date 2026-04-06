package models

// Unit 计量单位模型
type Unit struct {
	BaseModel
	Code        string `gorm:"size:50;uniqueIndex;not null" json:"code"`
	Name        string `gorm:"size:100;not null" json:"name"`
	Category    string `gorm:"size:50" json:"category"`
	Precision   int    `gorm:"default:0" json:"precision"`
	Status      string `gorm:"size:20;default:'active'" json:"status"`
	IsSystem    bool   `gorm:"default:false" json:"isSystem"`
	Description string `gorm:"type:text" json:"description"`
}
