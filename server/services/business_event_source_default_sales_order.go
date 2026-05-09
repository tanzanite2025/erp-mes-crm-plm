package services

import "encoding/json"

func defaultSalesOrderBusinessStatuses() []BusinessStatusDTO {
	return listBusinessEventSourceCompatibilityStatuses("SALES_ORDER")
}

func defaultSalesOrderEventSourceConfig() json.RawMessage {
	config := normalizeBusinessEventSourceWriteConfigDTO(BusinessEventSourceWriteConfigDTO{
		Actions: []BusinessEventActionDTO{
			{ID: "action-created-1", Code: "CREATED", Name: "新建", Kind: "created"},
			{ID: "action-status-changed-2", Code: "STATUS_CHANGED", Name: "状态变更", Kind: "status"},
			{ID: "action-updated-3", Code: "UPDATED", Name: "更新", Kind: "updated"},
		},
		Statuses: buildBusinessStatusWriteDTOs(defaultSalesOrderBusinessStatuses()),
		Fields: []BusinessEventFieldDTO{
			{Key: "orderId", Label: "订单ID", Path: "orderId", Type: "string", TemplateKey: "OrderId", TemplateEnabled: true, DynamicResolver: false},
			{Key: "orderNo", Label: "订单号", Path: "orderNo", Type: "string", TemplateKey: "OrderNo", TemplateEnabled: true, DynamicResolver: false},
			{Key: "customer", Label: "客户", Path: "customer", Type: "string", TemplateKey: "Customer", TemplateEnabled: true, DynamicResolver: false},
			{Key: "createdBy", Label: "创建人", Path: "createdBy", Type: "user", TemplateKey: "CreatedBy", TemplateEnabled: true, DynamicResolver: true},
			{Key: "claimedBy", Label: "负责人", Path: "claimedBy", Type: "user", TemplateKey: "ClaimedBy", TemplateEnabled: true, DynamicResolver: true},
		},
		DynamicResolvers: []BusinessDynamicResolverDTO{
			{Code: "createdBy", Label: "创建人", Path: "createdBy", Type: "user"},
			{Code: "claimedBy", Label: "负责人/认领人", Path: "claimedBy", Type: "user"},
			{Code: "approval.manager", Label: "直属审批经理", Path: "approval.manager", Type: "user"},
		},
		DefaultActionURLTemplate: "/trading/orders/[OrderId]",
	})

	raw, _ := marshalBusinessEventSourceWriteConfig(config)
	return raw
}
