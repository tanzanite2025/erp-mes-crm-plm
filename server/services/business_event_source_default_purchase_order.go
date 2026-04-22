package services

import "encoding/json"

func defaultPurchaseOrderEventSourceConfig() json.RawMessage {
	config := normalizeBusinessEventSourceConfigDTO(BusinessEventSourceConfigDTO{
		Actions: []BusinessEventActionDTO{
			{ID: "action-created-1", Code: "CREATED", Name: "新建", Kind: "created"},
			{ID: "action-status-changed-2", Code: "STATUS_CHANGED", Name: "状态变更", Kind: "status"},
			{ID: "action-received-3", Code: "RECEIVED", Name: "收货完成", Kind: "status"},
		},
		Statuses: []BusinessStatusDTO{
			{Code: "Draft", Label: "草稿", Phase: "draft", IsTerminal: false, DefaultResolve: false},
			{Code: "Sent", Label: "已下达", Phase: "active", IsTerminal: false, DefaultResolve: false},
			{Code: "Awaiting", Label: "待收货", Phase: "pending", IsTerminal: false, DefaultResolve: false},
			{Code: "Received", Label: "已收货", Phase: "done", IsTerminal: true, DefaultResolve: true},
			{Code: "Canceled", Label: "已作废", Phase: "cancelled", IsTerminal: true, DefaultResolve: true},
		},
		Fields: []BusinessEventFieldDTO{
			{Key: "purchaseOrderId", Label: "采购单ID", Path: "purchaseOrderId", Type: "string", TemplateKey: "PurchaseOrderId", TemplateEnabled: true, DynamicResolver: false},
			{Key: "purchaseOrderNo", Label: "采购单号", Path: "purchaseOrderNo", Type: "string", TemplateKey: "PurchaseOrderNo", TemplateEnabled: true, DynamicResolver: false},
			{Key: "supplierName", Label: "供应商", Path: "supplierName", Type: "string", TemplateKey: "SupplierName", TemplateEnabled: true, DynamicResolver: false},
			{Key: "purchaser", Label: "采购员", Path: "purchaser", Type: "user", TemplateKey: "Purchaser", TemplateEnabled: true, DynamicResolver: true},
		},
		DynamicResolvers: []BusinessDynamicResolverDTO{
			{Code: "purchaser", Label: "采购员", Path: "purchaser", Type: "user"},
			{Code: "approval.manager", Label: "直属审批经理", Path: "approval.manager", Type: "user"},
		},
		DefaultActionURLTemplate: "/purchase/orders?search=[PurchaseOrderNo]&detailId=[PurchaseOrderId]",
	})

	raw, _ := marshalBusinessEventSourceConfig(config)
	return raw
}
