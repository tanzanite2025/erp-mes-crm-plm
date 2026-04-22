package services

import "encoding/json"

func defaultProductionPlanEventSourceConfig() json.RawMessage {
	config := normalizeBusinessEventSourceConfigDTO(BusinessEventSourceConfigDTO{
		Actions: []BusinessEventActionDTO{
			{ID: "action-created-1", Code: "CREATED", Name: "新建", Kind: "created"},
			{ID: "action-status-changed-2", Code: "STATUS_CHANGED", Name: "状态变更", Kind: "status"},
			{ID: "action-canceled-3", Code: "CANCELED", Name: "取消", Kind: "status"},
			{ID: "action-completed-4", Code: "COMPLETED", Name: "计划完成", Kind: "status"},
		},
		Statuses: []BusinessStatusDTO{
			{Code: "SCHEDULED", Label: "已排产", Phase: "active", IsTerminal: false, DefaultResolve: false},
			{Code: "IN_PROGRESS", Label: "生产中", Phase: "active", IsTerminal: false, DefaultResolve: false},
			{Code: "COMPLETED", Label: "计划完成", Phase: "done", IsTerminal: true, DefaultResolve: true},
			{Code: "CANCELED", Label: "已取消", Phase: "cancelled", IsTerminal: true, DefaultResolve: true},
		},
		Fields: []BusinessEventFieldDTO{
			{Key: "planId", Label: "计划ID", Path: "planId", Type: "string", TemplateKey: "PlanId", TemplateEnabled: true, DynamicResolver: false},
			{Key: "orderNo", Label: "订单号", Path: "orderNo", Type: "string", TemplateKey: "OrderNo", TemplateEnabled: true, DynamicResolver: false},
			{Key: "productName", Label: "产品名称", Path: "productName", Type: "string", TemplateKey: "ProductName", TemplateEnabled: true, DynamicResolver: false},
			{Key: "quantity", Label: "计划数量", Path: "quantity", Type: "number", TemplateKey: "Quantity", TemplateEnabled: true, DynamicResolver: false},
			{Key: "startDate", Label: "计划开始", Path: "startDate", Type: "date", TemplateKey: "StartDate", TemplateEnabled: true, DynamicResolver: false},
			{Key: "endDate", Label: "计划结束", Path: "endDate", Type: "date", TemplateKey: "EndDate", TemplateEnabled: true, DynamicResolver: false},
		},
		DynamicResolvers: []BusinessDynamicResolverDTO{
			{Code: "approval.manager", Label: "直属审批经理", Path: "approval.manager", Type: "user"},
		},
		DefaultActionURLTemplate: "/dashboard/calendar?planId=[PlanId]",
	})

	raw, _ := marshalBusinessEventSourceConfig(config)
	return raw
}
