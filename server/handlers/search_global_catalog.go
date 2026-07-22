package handlers

import "xdfc-server/services"

type globalSearchCategoryMeta struct {
	Href        string
	ParentTitle string
}

var globalSearchCategoryMetaCatalog = map[string]globalSearchCategoryMeta{
	services.SearchCategoryInventory: {
		Href:        "/inventory",
		ParentTitle: "库存记录 / Inventory",
	},
	services.SearchCategorySalesOrder: {
		Href:        "/trading/sales-orders",
		ParentTitle: "销售订单 / Sales Orders",
	},
	services.SearchCategoryPurchaseOrder: {
		Href:        "/purchase/orders",
		ParentTitle: "采购订单 / Purchase Orders",
	},
	services.SearchCategorySupplier: {
		Href:        "/purchase/suppliers",
		ParentTitle: "供应商 / Suppliers",
	},
	services.SearchCategoryApprovalRequest: {
		Href:        "/approval/requests",
		ParentTitle: "审批请求 / Approval Requests",
	},
}

func resolveGlobalSearchCategoryMeta(category string) globalSearchCategoryMeta {
	meta, ok := globalSearchCategoryMetaCatalog[category]
	if !ok {
		return globalSearchCategoryMeta{
			Href:        "/search",
			ParentTitle: "全局搜索 / Search",
		}
	}

	return meta
}
