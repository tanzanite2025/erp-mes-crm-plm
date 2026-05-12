package models

type ProductAttributeCategory struct {
	BaseModel
	MasterDataControl
	Key         string `gorm:"size:50;not null" json:"key"`
	NameZh      string `gorm:"size:255;not null" json:"nameZh"`
	NameEn      string `gorm:"size:255" json:"nameEn"`
	Description string `gorm:"type:text" json:"description"`
	SortOrder   int    `gorm:"default:0" json:"sortOrder"`
	Active      bool   `gorm:"default:true" json:"active"`
	Version     int    `gorm:"default:1" json:"version"`
}

func (ProductAttributeCategory) TableName() string {
	return "product_attribute_categories"
}
