package models

type ProductAttributeValue struct {
	BaseModel
	ProductID   string `gorm:"type:uuid;index:idx_product_attribute_value_unique,priority:1;not null" json:"productId"`
	CategoryKey string `gorm:"size:50;index:idx_product_attribute_value_unique,priority:2;not null" json:"categoryKey"`
	OptionValue string `gorm:"size:100;not null" json:"optionValue"`
	SortOrder   int    `gorm:"default:0" json:"sortOrder"`
	Version     int    `gorm:"default:1" json:"version"`
}

func (ProductAttributeValue) TableName() string {
	return "product_attribute_values"
}
