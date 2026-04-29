package models

// WarehouseCategory 仓库分类/库区主数据。
type WarehouseCategory struct {
	BaseModel
	Name                      string `gorm:"size:100;not null" json:"name"`
	Code                      string `gorm:"size:100;uniqueIndex;not null" json:"code"`
	Description               string `gorm:"type:text" json:"description"`
	IsSystem                  bool   `gorm:"default:false" json:"isSystem"`
	Active                    bool   `gorm:"default:true" json:"active"`
	SortOrder                 int    `gorm:"default:0" json:"sortOrder"`
	AllowInbound              bool   `gorm:"default:true" json:"allowInbound"`
	AllowShipment             bool   `gorm:"default:true" json:"allowShipment"`
	AllowStocktake            bool   `gorm:"default:true" json:"allowStocktake"`
	AllowPurchaseReceipt      bool   `gorm:"default:false" json:"allowPurchaseReceipt"`
	DefaultForProductInbound  bool   `gorm:"default:false" json:"defaultForProductInbound"`
	DefaultForMaterialInbound bool   `gorm:"default:false" json:"defaultForMaterialInbound"`
	DefaultForPurchaseReceipt bool   `gorm:"default:false" json:"defaultForPurchaseReceipt"`
}

func (WarehouseCategory) TableName() string {
	return "warehouse_categories"
}

// DefaultWarehouseCategories 预置基础库区。
var DefaultWarehouseCategories = []WarehouseCategory{
	{
		Name:                     "成品仓库",
		Code:                     "FINISHED",
		IsSystem:                 true,
		SortOrder:                1,
		AllowInbound:             true,
		AllowShipment:            true,
		AllowStocktake:           true,
		DefaultForProductInbound: true,
	},
	{
		Name:                      "物料仓库",
		Code:                      "MATERIAL",
		IsSystem:                  true,
		SortOrder:                 2,
		AllowInbound:              true,
		AllowShipment:             true,
		AllowStocktake:            true,
		AllowPurchaseReceipt:      true,
		DefaultForMaterialInbound: true,
		DefaultForPurchaseReceipt: true,
	},
	{
		Name:           "研发仓库",
		Code:           "RD",
		IsSystem:       true,
		SortOrder:      3,
		AllowInbound:   true,
		AllowShipment:  true,
		AllowStocktake: true,
	},
	{
		Name:           "半成品仓",
		Code:           "WIP",
		IsSystem:       true,
		SortOrder:      4,
		AllowInbound:   true,
		AllowShipment:  true,
		AllowStocktake: true,
	},
	{
		Name:           "虚拟发货仓",
		Code:           "SHIPPING_VIRTUAL",
		Description:    "系统内置发货占用仓，用于承接已确认待发货货物并真实占用库存",
		IsSystem:       true,
		SortOrder:      90,
		AllowInbound:   true,
		AllowShipment:  true,
		AllowStocktake: true,
	},
	{
		Name:           "虚拟退货仓",
		Code:           "SALES_RETURN_VIRTUAL",
		Description:    "系统内置销售退货承接仓，用于暂存销售退货回仓货物并提供统一查看入口",
		IsSystem:       true,
		SortOrder:      91,
		AllowInbound:   true,
		AllowShipment:  false,
		AllowStocktake: true,
	},
	{
		Name:           "售后换货暂存仓",
		Code:           "SALES_EXCHANGE_VIRTUAL",
		Description:    "系统内置销售换货旧货承接仓，用于暂存客户换货退回的旧货并等待质检或补发处理",
		IsSystem:       true,
		SortOrder:      92,
		AllowInbound:   true,
		AllowShipment:  false,
		AllowStocktake: true,
	},
}
