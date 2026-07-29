package services

import "encoding/json"

func defaultProductionOutsourceBusinessStatuses() []BusinessStatusDTO {
	return listBusinessEventSourceCompatibilityStatuses(businessEventSourceProductionOutsource)
}

func defaultProductionOutsourceEventSourceConfig() json.RawMessage {
	config := normalizeBusinessEventSourceWriteConfigDTO(BusinessEventSourceWriteConfigDTO{
		Actions: []BusinessEventActionDTO{
			{ID: "action-status-changed-1", Code: businessEventActionStatusChange, Name: "状态变更", Kind: "status"},
		},
		Statuses: buildBusinessStatusWriteDTOs(defaultProductionOutsourceBusinessStatuses()),
		Fields: []BusinessEventFieldDTO{
			{Key: "outsourceOrderId", Label: "委外单ID", Path: "outsourceOrderId", Type: "string", TemplateKey: "OutsourceOrderId", TemplateEnabled: true, DynamicResolver: false},
			{Key: "outsourceOrderNo", Label: "委外单号", Path: "outsourceOrderNo", Type: "string", TemplateKey: "OutsourceOrderNo", TemplateEnabled: true, DynamicResolver: false},
			{Key: "sourceNo", Label: "来源单据", Path: "sourceNo", Type: "string", TemplateKey: "SourceNo", TemplateEnabled: true, DynamicResolver: false},
			{Key: "partnerName", Label: "委外单位", Path: "partnerName", Type: "string", TemplateKey: "PartnerName", TemplateEnabled: true, DynamicResolver: false},
			{Key: "outsourceOrderLineId", Label: "委外明细ID", Path: "outsourceOrderLineId", Type: "string", TemplateKey: "OutsourceOrderLineId", TemplateEnabled: true, DynamicResolver: false},
			{Key: "lineNo", Label: "明细行号", Path: "lineNo", Type: "number", TemplateKey: "LineNo", TemplateEnabled: true, DynamicResolver: false},
			{Key: "productBarcode", Label: "产品一维码", Path: "productBarcode", Type: "string", TemplateKey: "ProductBarcode", TemplateEnabled: true, DynamicResolver: false},
			{Key: "productCode", Label: "产品编码", Path: "productCode", Type: "string", TemplateKey: "ProductCode", TemplateEnabled: true, DynamicResolver: false},
			{Key: "productName", Label: "产品名称", Path: "productName", Type: "string", TemplateKey: "ProductName", TemplateEnabled: true, DynamicResolver: false},
			{Key: "processName", Label: "委外工序", Path: "processName", Type: "string", TemplateKey: "ProcessName", TemplateEnabled: true, DynamicResolver: false},
			{Key: "quantity", Label: "数量", Path: "quantity", Type: "number", TemplateKey: "Quantity", TemplateEnabled: true, DynamicResolver: false},
			{Key: "uom", Label: "单位", Path: "uom", Type: "string", TemplateKey: "UOM", TemplateEnabled: true, DynamicResolver: false},
			{Key: "transferId", Label: "转移记录ID", Path: "transferId", Type: "string", TemplateKey: "TransferId", TemplateEnabled: true, DynamicResolver: false},
			{Key: "transferNo", Label: "转移单号", Path: "transferNo", Type: "string", TemplateKey: "TransferNo", TemplateEnabled: true, DynamicResolver: false},
			{Key: "transferType", Label: "转移类型", Path: "transferType", Type: "string", TemplateKey: "TransferType", TemplateEnabled: true, DynamicResolver: false},
			{Key: "inspectionId", Label: "检验记录ID", Path: "inspectionId", Type: "string", TemplateKey: "InspectionId", TemplateEnabled: true, DynamicResolver: false},
			{Key: "inspectionNo", Label: "检验单号", Path: "inspectionNo", Type: "string", TemplateKey: "InspectionNo", TemplateEnabled: true, DynamicResolver: false},
			{Key: "inspectionResult", Label: "检验结果", Path: "inspectionResult", Type: "string", TemplateKey: "InspectionResult", TemplateEnabled: true, DynamicResolver: false},
			{Key: "inspectionDisposition", Label: "处置结果", Path: "inspectionDisposition", Type: "string", TemplateKey: "InspectionDisposition", TemplateEnabled: true, DynamicResolver: false},
			{Key: "operator", Label: "操作人", Path: "operator", Type: "user", TemplateKey: "Operator", TemplateEnabled: true, DynamicResolver: true},
		},
		DynamicResolvers: []BusinessDynamicResolverDTO{
			{Code: "operator", Label: "操作人", Path: "operator", Type: "user"},
		},
		DefaultActionURLTemplate: "/production-outsourcing/transfers?search=[OutsourceOrderNo]",
	})

	raw, _ := marshalBusinessEventSourceWriteConfig(config)
	return raw
}
