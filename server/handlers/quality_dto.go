package handlers

import (
	"encoding/json"
	"time"
	"xdfc-server/models"
)

type InspectionStandardRequest struct {
	ID          string          `json:"id"`
	Code        string          `json:"code"`
	Name        string          `json:"name"`
	ProductID   string          `json:"productId"`
	ProductName string          `json:"productName"`
	Type        string          `json:"type"`
	Version     float64         `json:"version"`
	Status      string          `json:"status"`
	Items       json.RawMessage `json:"items"`
	Auditor     string          `json:"auditor"`
	AuditTime   *time.Time      `json:"auditTime"`
	Remarks     string          `json:"remarks"`
	Description string          `json:"description"`
}

type ApprovalRequestSummaryResponse struct {
	ID           string     `json:"id"`
	RequesterID  string     `json:"requesterId"`
	Reason       string     `json:"reason"`
	Approver1ID  string     `json:"approver1Id"`
	Approver2ID  string     `json:"approver2Id"`
	CurrentLevel int        `json:"currentLevel"`
	Status       string     `json:"status"`
	ExpiresAt    *time.Time `json:"expiresAt,omitempty"`
	Module       string     `json:"module"`
	Action       string     `json:"action"`
	CreatedAt    time.Time  `json:"createdAt"`
	VerifierID   string     `json:"verifierId"`
}

type InspectionStandardResponse struct {
	ID                     string                          `json:"id"`
	CreatedAt              time.Time                       `json:"createdAt"`
	UpdatedAt              time.Time                       `json:"updatedAt"`
	Code                   string                          `json:"code"`
	Name                   string                          `json:"name"`
	ProductID              string                          `json:"productId,omitempty"`
	ProductName            string                          `json:"productName,omitempty"`
	Type                   string                          `json:"type"`
	Version                float64                         `json:"version"`
	Status                 string                          `json:"status"`
	Items                  json.RawMessage                 `json:"items"`
	Auditor                string                          `json:"auditor"`
	AuditTime              *time.Time                      `json:"auditTime"`
	Remarks                string                          `json:"remarks"`
	Description            string                          `json:"description"`
	ApprovalRequestSummary *ApprovalRequestSummaryResponse `json:"approvalRequestSummary,omitempty"`
}

type InspectionStandardPatchMetadata struct {
	ID      string  `json:"id"`
	Version float64 `json:"version"`
}

type InspectionStandardPatchRequest struct {
	Op       string                          `json:"op"`
	Delta    map[string]json.RawMessage      `json:"delta"`
	Metadata InspectionStandardPatchMetadata `json:"metadata"`
}

type InspectionStandardsListPaginationMetadata struct {
	Total    int64 `json:"total"`
	Page     int   `json:"page"`
	PageSize int   `json:"pageSize"`
}

type InspectionStandardsListStatsMetadata struct {
	Total     int64 `json:"total"`
	Published int64 `json:"published"`
	Draft     int64 `json:"draft"`
	Archived  int64 `json:"archived"`
}

type InspectionStandardsListMetadata struct {
	Pagination InspectionStandardsListPaginationMetadata `json:"pagination"`
	Stats      InspectionStandardsListStatsMetadata      `json:"stats"`
}

type InspectionStandardsListResponse struct {
	Items    []InspectionStandardResponse    `json:"items"`
	Total    int64                           `json:"total"`
	Page     int                             `json:"page"`
	PageSize int                             `json:"pageSize"`
	Metadata InspectionStandardsListMetadata `json:"metadata"`
}

type InspectionTaskRequest struct {
	ID               string          `json:"id"`
	StandardID       string          `json:"standardId"`
	ProductionPlanID string          `json:"productionPlanId"`
	OrderID          string          `json:"orderId"`
	BatchNo          string          `json:"batchNo"`
	ProductID        string          `json:"productId"`
	ProductName      string          `json:"productName"`
	SampleQty        float64         `json:"sampleQty"`
	Result           string          `json:"result"`
	Inspector        string          `json:"inspector"`
	InputData        json.RawMessage `json:"inputData"`
	Remarks          string          `json:"remarks"`
	CompletedAt      *time.Time      `json:"completedAt"`
}

type InspectionTaskResponse struct {
	ID               string                      `json:"id"`
	CreatedAt        time.Time                   `json:"createdAt"`
	UpdatedAt        time.Time                   `json:"updatedAt"`
	StandardID       string                      `json:"standardId"`
	Standard         *InspectionStandardResponse `json:"standard,omitempty"`
	ProductionPlanID string                      `json:"productionPlanId,omitempty"`
	OrderID          string                      `json:"orderId,omitempty"`
	BatchNo          string                      `json:"batchNo"`
	ProductID        string                      `json:"productId"`
	ProductName      string                      `json:"productName"`
	SampleQty        float64                     `json:"sampleQty"`
	Result           string                      `json:"result"`
	Inspector        string                      `json:"inspector"`
	InputData        json.RawMessage             `json:"inputData"`
	Remarks          string                      `json:"remarks"`
	CompletedAt      *time.Time                  `json:"completedAt"`
}

type InspectionTasksListResponse struct {
	Items    []InspectionTaskResponse `json:"items"`
	Total    int64                    `json:"total"`
	Page     int                      `json:"page"`
	PageSize int                      `json:"pageSize"`
}

type InspectionStatsResponse struct {
	PendingCount int64 `json:"pendingCount"`
	PassCount    int64 `json:"passCount"`
	FailCount    int64 `json:"failCount"`
}

type QualityAbnormalityResponse struct {
	ID               string                  `json:"id"`
	CreatedAt        time.Time               `json:"createdAt"`
	UpdatedAt        time.Time               `json:"updatedAt"`
	TaskID           string                  `json:"taskId"`
	InspectionTask   *InspectionTaskResponse `json:"inspectionTask,omitempty"`
	Severity         string                  `json:"severity"`
	Description      string                  `json:"description"`
	Analysis         string                  `json:"analysis"`
	DisposalMethod   string                  `json:"disposalMethod"`
	ScrapQuantity    *float64                `json:"scrapQuantity,omitempty"`
	ScrapUnit        string                  `json:"scrapUnit,omitempty"`
	ProductionPlanID string                  `json:"productionPlanId,omitempty"`
	OrderID          string                  `json:"orderId,omitempty"`
	ProductID        string                  `json:"productId,omitempty"`
	BatchNo          string                  `json:"batchNo,omitempty"`
	OccurredAt       *time.Time              `json:"occurredAt,omitempty"`
	Status           string                  `json:"status"`
	Deadline         *time.Time              `json:"deadline"`
	Resolver         string                  `json:"resolver"`
}

// QualityAbnormalityDisposalRequest is the single command contract for recording
// a quality abnormality's final disposal and its optional scrap fact.
type QualityAbnormalityDisposalRequest struct {
	DisposalMethod   string     `json:"disposalMethod"`
	ScrapQuantity    *float64   `json:"scrapQuantity"`
	ScrapUnit        string     `json:"scrapUnit"`
	ProductionPlanID string     `json:"productionPlanId"`
	OrderID          string     `json:"orderId"`
	ProductID        string     `json:"productId"`
	BatchNo          string     `json:"batchNo"`
	OccurredAt       *time.Time `json:"occurredAt"`
}

func mapInspectionStandardRequestToModel(input InspectionStandardRequest) models.InspectionStandard {
	remarks := input.Remarks
	if remarks == "" {
		remarks = input.Description
	}

	return models.InspectionStandard{
		BaseModel:   models.BaseModel{ID: input.ID},
		Code:        input.Code,
		Name:        input.Name,
		ProductID:   input.ProductID,
		ProductName: input.ProductName,
		Type:        input.Type,
		Version:     input.Version,
		Status:      input.Status,
		Items:       input.Items,
		Auditor:     input.Auditor,
		AuditTime:   input.AuditTime,
		Description: remarks,
	}
}

func mapApprovalRequestSummaryToResponse(request *models.ApprovalRequest) *ApprovalRequestSummaryResponse {
	if request == nil {
		return nil
	}

	return &ApprovalRequestSummaryResponse{
		ID:           request.ID,
		RequesterID:  request.RequesterID,
		Reason:       request.Reason,
		Approver1ID:  request.Approver1ID,
		Approver2ID:  request.Approver2ID,
		CurrentLevel: request.CurrentLevel,
		Status:       request.Status,
		ExpiresAt:    request.ExpiresAt,
		Module:       request.Module,
		Action:       request.Action,
		CreatedAt:    request.CreatedAt,
		VerifierID:   request.VerifierID,
	}
}

func mapInspectionStandardToResponse(model models.InspectionStandard, approvalSummary *models.ApprovalRequest) InspectionStandardResponse {
	return InspectionStandardResponse{
		ID:                     model.ID,
		CreatedAt:              model.CreatedAt,
		UpdatedAt:              model.UpdatedAt,
		Code:                   model.Code,
		Name:                   model.Name,
		ProductID:              model.ProductID,
		ProductName:            model.ProductName,
		Type:                   model.Type,
		Version:                model.Version,
		Status:                 model.Status,
		Items:                  model.Items,
		Auditor:                model.Auditor,
		AuditTime:              model.AuditTime,
		Remarks:                model.Description,
		Description:            model.Description,
		ApprovalRequestSummary: mapApprovalRequestSummaryToResponse(approvalSummary),
	}
}

func mapInspectionStandardsToResponse(items []models.InspectionStandard, approvalSummaryMap map[string]*models.ApprovalRequest) []InspectionStandardResponse {
	result := make([]InspectionStandardResponse, 0, len(items))
	for _, item := range items {
		result = append(result, mapInspectionStandardToResponse(item, approvalSummaryMap[item.ID]))
	}
	return result
}

func mapInspectionTaskRequestToModel(input InspectionTaskRequest) models.InspectionTask {
	return models.InspectionTask{
		BaseModel:        models.BaseModel{ID: input.ID},
		StandardID:       input.StandardID,
		ProductionPlanID: input.ProductionPlanID,
		OrderID:          input.OrderID,
		BatchNo:          input.BatchNo,
		ProductID:        input.ProductID,
		ProductName:      input.ProductName,
		SampleQty:        input.SampleQty,
		Result:           input.Result,
		Inspector:        input.Inspector,
		InputData:        input.InputData,
		Remarks:          input.Remarks,
		CompletedAt:      input.CompletedAt,
	}
}

func mapInspectionTaskToResponse(model models.InspectionTask) InspectionTaskResponse {
	var standard *InspectionStandardResponse
	if model.Standard != nil {
		mapped := mapInspectionStandardToResponse(*model.Standard, nil)
		standard = &mapped
	}
	return InspectionTaskResponse{
		ID:               model.ID,
		CreatedAt:        model.CreatedAt,
		UpdatedAt:        model.UpdatedAt,
		StandardID:       model.StandardID,
		Standard:         standard,
		ProductionPlanID: model.ProductionPlanID,
		OrderID:          model.OrderID,
		BatchNo:          model.BatchNo,
		ProductID:        model.ProductID,
		ProductName:      model.ProductName,
		SampleQty:        model.SampleQty,
		Result:           model.Result,
		Inspector:        model.Inspector,
		InputData:        model.InputData,
		Remarks:          model.Remarks,
		CompletedAt:      model.CompletedAt,
	}
}

func mapInspectionTasksToResponse(items []models.InspectionTask) []InspectionTaskResponse {
	result := make([]InspectionTaskResponse, 0, len(items))
	for _, item := range items {
		result = append(result, mapInspectionTaskToResponse(item))
	}
	return result
}

func mapQualityAbnormalityToResponse(model models.QualityAbnormality) QualityAbnormalityResponse {
	var inspectionTask *InspectionTaskResponse
	if model.InspectionTask != nil {
		mapped := mapInspectionTaskToResponse(*model.InspectionTask)
		inspectionTask = &mapped
	}
	return QualityAbnormalityResponse{
		ID:               model.ID,
		CreatedAt:        model.CreatedAt,
		UpdatedAt:        model.UpdatedAt,
		TaskID:           model.TaskID,
		InspectionTask:   inspectionTask,
		Severity:         model.Severity,
		Description:      model.Description,
		Analysis:         model.Analysis,
		DisposalMethod:   model.DisposalMethod,
		ScrapQuantity:    model.ScrapQuantity,
		ScrapUnit:        model.ScrapUnit,
		ProductionPlanID: model.ProductionPlanID,
		OrderID:          model.OrderID,
		ProductID:        model.ProductID,
		BatchNo:          model.BatchNo,
		OccurredAt:       model.OccurredAt,
		Status:           model.Status,
		Deadline:         model.Deadline,
		Resolver:         model.Resolver,
	}
}

func mapQualityAbnormalitiesToResponse(items []models.QualityAbnormality) []QualityAbnormalityResponse {
	result := make([]QualityAbnormalityResponse, 0, len(items))
	for _, item := range items {
		result = append(result, mapQualityAbnormalityToResponse(item))
	}
	return result
}
