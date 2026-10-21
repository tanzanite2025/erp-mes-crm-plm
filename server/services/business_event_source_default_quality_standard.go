package services

import "encoding/json"

func defaultQualityStandardEventSourceConfig() json.RawMessage {
	// Quality standard workflows emit CREATED or STATUS_CHANGED; the target
	// status identifies submission, review, publication, and archival.
	config := BusinessEventSourceStoredConfigDTO{
		Actions: []BusinessEventActionDTO{
			{Code: "CREATED", Name: "新建", Kind: "created"},
			{Code: "STATUS_CHANGED", Name: "状态变更", Kind: "status"},
		},
		Statuses: []BusinessStatusStoredDTO{
			{Code: "DRAFT", Label: "草稿", Phase: "draft"},
			{Code: "PENDING_APPROVAL", Label: "待审核", Phase: "pending"},
			{Code: "APPROVED", Label: "审批通过", Phase: "active"},
			{Code: "REJECTED", Label: "已驳回", Phase: "custom"},
			{Code: "PUBLISHED", Label: "已发布", Phase: "active"},
			{Code: "ARCHIVED", Label: "已归档", Phase: "done", IsTerminal: true, DefaultResolve: true},
		},
		Fields: []BusinessEventFieldDTO{
			{Key: "targetId", Label: "标准ID", Path: "targetId", Type: "string", TemplateKey: "StandardId", TemplateEnabled: true},
			{Key: "standardCode", Label: "标准编码", Path: "standardCode", Type: "string", TemplateKey: "StandardCode", TemplateEnabled: true},
			{Key: "standardName", Label: "标准名称", Path: "standardName", Type: "string", TemplateKey: "StandardName", TemplateEnabled: true},
			{Key: "operator", Label: "责任人", Path: "operator", Type: "user", TemplateKey: "Operator", TemplateEnabled: true, DynamicResolver: true},
			{Key: "auditor", Label: "审批人", Path: "auditor", Type: "user", TemplateKey: "Auditor", TemplateEnabled: true, DynamicResolver: true},
			{Key: "reviewComment", Label: "审批意见", Path: "reviewComment", Type: "string", TemplateKey: "ReviewComment", TemplateEnabled: true},
			{Key: "rejectReason", Label: "驳回原因", Path: "rejectReason", Type: "string", TemplateKey: "RejectReason", TemplateEnabled: true},
			{Key: "archiveReason", Label: "归档原因", Path: "archiveReason", Type: "string", TemplateKey: "ArchiveReason", TemplateEnabled: true},
		},
		DynamicResolvers: []BusinessDynamicResolverDTO{
			{Code: "operator", Label: "责任人", Path: "operator", Type: "user"},
			{Code: "auditor", Label: "审批人", Path: "auditor", Type: "user"},
		},
		DefaultActionURLTemplate: "/quality/standards/[StandardId]/preview",
	}
	raw, err := marshalBusinessEventSourceStoredConfig(config)
	if err != nil {
		panic("invalid default quality standard event source configuration: " + err.Error())
	}
	return raw
}
