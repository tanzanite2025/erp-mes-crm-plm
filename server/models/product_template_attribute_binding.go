package models

// ProductTemplateAttributeOptionDefinition belongs to one template attribute.
// Options are stored with that attribute and are never shared between templates.
type ProductTemplateAttributeOptionDefinition struct {
	Value       string `json:"value"`
	LabelZh     string `json:"labelZh"`
	LabelEn     string `json:"labelEn"`
	Description string `json:"description"`
	SortOrder   int    `json:"sortOrder"`
	Active      bool   `json:"active"`
}

type ProductTemplateAttributeBinding struct {
	BaseModel
	TemplateID        string                                     `gorm:"type:uuid;index:idx_product_template_attribute_binding_unique,priority:1;not null" json:"templateId"`
	CategoryKey       string                                     `gorm:"size:50;index:idx_product_template_attribute_binding_unique,priority:2;not null" json:"categoryKey"`
	NameZh            string                                     `gorm:"size:255;not null;default:''" json:"nameZh"`
	NameEn            string                                     `gorm:"size:255;not null;default:''" json:"nameEn"`
	Description       string                                     `gorm:"type:text;not null;default:''" json:"description"`
	Options           []ProductTemplateAttributeOptionDefinition `gorm:"type:jsonb;serializer:json;not null;default:'[]'" json:"options"`
	DefinitionVersion int                                        `gorm:"not null;default:0" json:"-"`
	SortOrder         int                                        `gorm:"default:0" json:"sortOrder"`
	Required          bool                                       `gorm:"default:false" json:"required"`
	Active            bool                                       `gorm:"default:true" json:"active"`
	Version           int                                        `gorm:"default:1" json:"version"`
}
