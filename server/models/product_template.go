package models

// ProductTemplate 浜у搧瑙勬牸妯℃澘妯″瀷
type ProductTemplate struct {
	BaseModel
	MasterDataControl
	Name              string                            `gorm:"size:255;not null" json:"name"`
	Code              string                            `gorm:"size:100;uniqueIndex;not null" json:"code"`
	ComponentKey      string                            `gorm:"size:50" json:"componentKey"`
	Description       string                            `gorm:"type:text" json:"description"`
	Active            bool                              `gorm:"default:true" json:"active"`
	AttributeBindings []ProductTemplateAttributeBinding `gorm:"foreignKey:TemplateID;constraint:OnUpdate:CASCADE,OnDelete:CASCADE" json:"attributeBindings"`
	Version           int                               `gorm:"default:1" json:"version"`
}
