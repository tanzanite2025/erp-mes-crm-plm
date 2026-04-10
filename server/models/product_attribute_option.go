package models

type ProductAttributeOption struct {
	BaseModel
	MasterDataControl
	CategoryKey string `gorm:"column:category;size:50;index:idx_product_attribute_option_category_value,priority:1;not null" json:"categoryKey"`
	Value       string `gorm:"size:100;index:idx_product_attribute_option_category_value,priority:2;not null" json:"value"`
	LabelZh     string `gorm:"column:label;size:255;not null" json:"labelZh"`
	LabelEn     string `gorm:"size:255" json:"labelEn"`
	Description string `gorm:"type:text" json:"description"`
	SortOrder   int    `gorm:"default:0" json:"sortOrder"`
	Active      bool   `gorm:"default:true" json:"active"`
	Version     int    `gorm:"default:1" json:"version"`
}

func (ProductAttributeOption) TableName() string {
	return "product_attribute_options"
}
