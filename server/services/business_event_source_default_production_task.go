package services

import "encoding/json"

func defaultProductionTaskEventSourceConfig() json.RawMessage {
	config := normalizeBusinessEventSourceConfigDTO(BusinessEventSourceConfigDTO{
		Actions: []BusinessEventActionDTO{
			{ID: "action-created-1", Code: "CREATED", Name: "新建", Kind: "created"},
			{ID: "action-status-changed-2", Code: "STATUS_CHANGED", Name: "状态变更", Kind: "status"},
			{ID: "action-quality-hold-3", Code: "QUALITY_HOLD", Name: "质检挂起", Kind: "custom"},
		},
		Statuses: []BusinessStatusDTO{
			{Code: "PENDING", Label: "待执行", Phase: "pending", IsTerminal: false, DefaultResolve: false},
			{Code: "RUNNING", Label: "执行中", Phase: "active", IsTerminal: false, DefaultResolve: false},
			{Code: "HOLD", Label: "已挂起", Phase: "custom", IsTerminal: false, DefaultResolve: false},
			{Code: "DONE", Label: "已完工", Phase: "done", IsTerminal: true, DefaultResolve: true},
		},
		Fields: []BusinessEventFieldDTO{
			{Key: "taskId", Label: "任务ID", Path: "taskId", Type: "string", TemplateKey: "TaskId", TemplateEnabled: true, DynamicResolver: false},
			{Key: "planId", Label: "计划ID", Path: "planId", Type: "string", TemplateKey: "PlanId", TemplateEnabled: true, DynamicResolver: false},
			{Key: "orderNo", Label: "订单号", Path: "orderNo", Type: "string", TemplateKey: "OrderNo", TemplateEnabled: true, DynamicResolver: false},
			{Key: "productName", Label: "产品名称", Path: "productName", Type: "string", TemplateKey: "ProductName", TemplateEnabled: true, DynamicResolver: false},
			{Key: "batchNo", Label: "批次号", Path: "batchNo", Type: "string", TemplateKey: "BatchNo", TemplateEnabled: true, DynamicResolver: false},
			{Key: "processName", Label: "工序", Path: "processName", Type: "string", TemplateKey: "ProcessName", TemplateEnabled: true, DynamicResolver: false},
			{Key: "operator", Label: "操作人", Path: "operator", Type: "user", TemplateKey: "Operator", TemplateEnabled: true, DynamicResolver: true},
		},
		DynamicResolvers: []BusinessDynamicResolverDTO{
			{Code: "operator", Label: "操作人", Path: "operator", Type: "user"},
		},
		DefaultActionURLTemplate: "/dashboard/calendar?planId=[PlanId]",
	})

	raw, _ := marshalBusinessEventSourceConfig(config)
	return raw
}
