package models

type ProductTypeAttributeBinding struct {
	BaseModel
	ProductTypeID string `gorm:"type:uuid;index:idx_product_type_attribute_binding_unique,priority:1;not null" json:"productTypeId"`
	CategoryKey   string `gorm:"size:50;index:idx_product_type_attribute_binding_unique,priority:2;not null" json:"categoryKey"`
	SortOrder     int    `gorm:"default:0" json:"sortOrder"`
	Required      bool   `gorm:"default:false" json:"required"`
	Active        bool   `gorm:"default:true" json:"active"`
	Version       int    `gorm:"default:1" json:"version"`
}

func (ProductTypeAttributeBinding) TableName() string {
	return "product_type_attribute_bindings"
}
