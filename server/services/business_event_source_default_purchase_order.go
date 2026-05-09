package services

import (
	"encoding/json"
	statemachine "xdfc-server/services/state_machine"
)

func defaultPurchaseOrderBusinessStatuses() []BusinessStatusDTO {
	return listBusinessEventSourceCompatibilityStatuses("PURCHASE_ORDER")
}

func defaultPurchaseOrderBusinessActions() []BusinessEventActionDTO {
	actions := []BusinessEventActionDTO{
		{ID: "action-created-1", Code: "CREATED", Name: "新建", Kind: "created"},
		{ID: "action-status-changed-2", Code: "STATUS_CHANGED", Name: "状态变更", Kind: "status"},
		{ID: "action-received-3", Code: "RECEIVED", Name: "收货完成", Kind: "status"},
	}
	catalog := statemachine.PurchaseOrderActionCatalog()
	for index, item := range catalog {
		actions = append(actions, BusinessEventActionDTO{
			ID:    "purchase-order-action-" + string(item.Code),
			Order: index + 10,
			Code:  string(item.Code),
			Name:  item.Name,
			Kind:  item.Kind,
		})
	}
	return actions
}

func defaultPurchaseOrderEventSourceConfig() json.RawMessage {
	config := normalizeBusinessEventSourceWriteConfigDTO(BusinessEventSourceWriteConfigDTO{
		Actions:  defaultPurchaseOrderBusinessActions(),
		Statuses: buildBusinessStatusWriteDTOs(defaultPurchaseOrderBusinessStatuses()),
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

	raw, _ := marshalBusinessEventSourceWriteConfig(config)
	return raw
}
