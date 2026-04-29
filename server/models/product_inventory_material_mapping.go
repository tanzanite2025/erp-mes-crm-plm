package models

type ProductInventoryMaterialMapping struct {
	BaseModel
	ProductID     string    `gorm:"type:uuid;uniqueIndex:idx_product_inventory_material_mappings_product;not null" json:"productId"`
	MaterialID    string    `gorm:"type:uuid;index;not null" json:"materialId"`
	Active        bool      `gorm:"default:true;index" json:"active"`
	MappingSource string    `gorm:"size:80;default:'MANUAL'" json:"mappingSource"`
	Remarks       string    `gorm:"type:text" json:"remarks"`
	Product       *Product  `gorm:"foreignKey:ProductID" json:"product,omitempty"`
	Material      *Material `gorm:"foreignKey:MaterialID" json:"material,omitempty"`
}

func (ProductInventoryMaterialMapping) TableName() string {
	return "product_inventory_material_mappings"
}
