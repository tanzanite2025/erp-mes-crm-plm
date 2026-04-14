package models

type ProductTemplateAttributeBinding struct {
	BaseModel
	TemplateID  string `gorm:"type:uuid;index:idx_product_template_attribute_binding_unique,priority:1;not null" json:"templateId"`
	CategoryKey string `gorm:"size:50;index:idx_product_template_attribute_binding_unique,priority:2;not null" json:"categoryKey"`
	SortOrder   int    `gorm:"default:0" json:"sortOrder"`
	Required    bool   `gorm:"default:false" json:"required"`
	Active      bool   `gorm:"default:true" json:"active"`
	Version     int    `gorm:"default:1" json:"version"`
}
