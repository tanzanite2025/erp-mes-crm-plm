package models

// WarehouseCategory 仓库分类/库区物理实体
type WarehouseCategory struct {
	BaseModel
	Name        string    `gorm:"size:100;not null" json:"name"`
	Code        string    `gorm:"size:100;uniqueIndex;not null" json:"code"`
	Description string    `gorm:"type:text" json:"description"`
	IsSystem    bool      `gorm:"default:false" json:"isSystem"`
	Active      bool      `gorm:"default:true" json:"active"`
	SortOrder   int       `gorm:"default:0" json:"sortOrder"`
}

func (WarehouseCategory) TableName() string {
	return "warehouse_categories"
}

// 预置默认数据 (可在 Seed 时使用)
var DefaultWarehouseCategories = []WarehouseCategory{
	{Name: "成品仓库", Code: "FINISHED", IsSystem: true, SortOrder: 1},
	{Name: "物料仓库", Code: "MATERIAL", IsSystem: true, SortOrder: 2},
	{Name: "研发仓库", Code: "RD", IsSystem: true, SortOrder: 3},
	{Name: "半成品仓", Code: "WIP", IsSystem: true, SortOrder: 4},
}
