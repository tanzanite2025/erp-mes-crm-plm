package services

import "encoding/json"

func defaultProductionOperationBusinessStatuses() []BusinessStatusDTO {
	return listBusinessEventSourceCompatibilityStatuses("PRODUCTION_OPERATION")
}

func defaultProductionOperationEventSourceConfig() json.RawMessage {
	config := normalizeBusinessEventSourceWriteConfigDTO(BusinessEventSourceWriteConfigDTO{
		Actions: []BusinessEventActionDTO{
			{ID: "action-start-1", Code: "START", Name: "开始工序", Kind: "status"},
			{ID: "action-complete-2", Code: "COMPLETE", Name: "完成工序", Kind: "status"},
			{ID: "action-hold-3", Code: "HOLD", Name: "挂起工序", Kind: "status"},
			{ID: "action-rework-4", Code: "REWORK", Name: "返工", Kind: "status"},
		},
		Statuses: buildBusinessStatusWriteDTOs(defaultProductionOperationBusinessStatuses()),
		Fields: []BusinessEventFieldDTO{
			{Key: "operationExecutionId", Label: "执行记录ID", Path: "operationExecutionId", Type: "string", TemplateKey: "OperationExecutionId", TemplateEnabled: true, DynamicResolver: false},
			{Key: "productBarcode", Label: "产品一维码", Path: "productBarcode", Type: "string", TemplateKey: "ProductBarcode", TemplateEnabled: true, DynamicResolver: false},
			{Key: "routeId", Label: "路线ID", Path: "routeId", Type: "string", TemplateKey: "RouteId", TemplateEnabled: true, DynamicResolver: false},
			{Key: "routeStepId", Label: "路线步骤ID", Path: "routeStepId", Type: "string", TemplateKey: "RouteStepId", TemplateEnabled: true, DynamicResolver: false},
			{Key: "processStepId", Label: "工序ID", Path: "processStepId", Type: "string", TemplateKey: "ProcessStepId", TemplateEnabled: true, DynamicResolver: false},
			{Key: "action", Label: "扫码动作", Path: "action", Type: "string", TemplateKey: "Action", TemplateEnabled: true, DynamicResolver: false},
			{Key: "result", Label: "执行结果", Path: "result", Type: "string", TemplateKey: "Result", TemplateEnabled: true, DynamicResolver: false},
			{Key: "operator", Label: "操作人", Path: "operator", Type: "user", TemplateKey: "Operator", TemplateEnabled: true, DynamicResolver: true},
		},
		DynamicResolvers: []BusinessDynamicResolverDTO{
			{Code: "operator", Label: "操作人", Path: "operator", Type: "user"},
		},
		DefaultActionURLTemplate: "/production-architecture/routes?barcode=[ProductBarcode]",
	})

	raw, _ := marshalBusinessEventSourceWriteConfig(config)
	return raw
}
