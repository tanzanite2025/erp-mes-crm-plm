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
	Type        string          `json:"type"`
	Version     float64         `json:"version"`
	Status      string          `json:"status"`
	Items       json.RawMessage `json:"items"`
	Auditor     string          `json:"auditor"`
	AuditTime   *time.Time      `json:"auditTime"`
	Description string          `json:"description"`
}

type InspectionStandardResponse struct {
	ID          string          `json:"id"`
	CreatedAt   time.Time       `json:"createdAt"`
	UpdatedAt   time.Time       `json:"updatedAt"`
	Code        string          `json:"code"`
	Name        string          `json:"name"`
	Type        string          `json:"type"`
	Version     float64         `json:"version"`
	Status      string          `json:"status"`
	Items       json.RawMessage `json:"items"`
	Auditor     string          `json:"auditor"`
	AuditTime   *time.Time      `json:"auditTime"`
	Description string          `json:"description"`
}

type InspectionStandardsListResponse struct {
	Items    []InspectionStandardResponse `json:"items"`
	Total    int64                        `json:"total"`
	Page     int                          `json:"page"`
	PageSize int                          `json:"pageSize"`
}

type InspectionTaskRequest struct {
	ID          string          `json:"id"`
	StandardID  string          `json:"standardId"`
	BatchNo     string          `json:"batchNo"`
	ProductID   string          `json:"productId"`
	ProductName string          `json:"productName"`
	SampleQty   float64         `json:"sampleQty"`
	Result      string          `json:"result"`
	Inspector   string          `json:"inspector"`
	InputData   json.RawMessage `json:"inputData"`
	Remarks     string          `json:"remarks"`
	CompletedAt *time.Time      `json:"completedAt"`
}

type InspectionTaskResponse struct {
	ID          string                     `json:"id"`
	CreatedAt   time.Time                  `json:"createdAt"`
	UpdatedAt   time.Time                  `json:"updatedAt"`
	StandardID  string                     `json:"standardId"`
	Standard    *InspectionStandardResponse `json:"standard,omitempty"`
	BatchNo     string                     `json:"batchNo"`
	ProductID   string                     `json:"productId"`
	ProductName string                     `json:"productName"`
	SampleQty   float64                    `json:"sampleQty"`
	Result      string                     `json:"result"`
	Inspector   string                     `json:"inspector"`
	InputData   json.RawMessage            `json:"inputData"`
	Remarks     string                     `json:"remarks"`
	CompletedAt *time.Time                 `json:"completedAt"`
}

type InspectionTasksListResponse struct {
	Items    []InspectionTaskResponse `json:"items"`
	Total    int64                    `json:"total"`
	Page     int                      `json:"page"`
	PageSize int                      `json:"pageSize"`
}

type QualityAbnormalityResponse struct {
	ID             string                  `json:"id"`
	CreatedAt      time.Time               `json:"createdAt"`
	UpdatedAt      time.Time               `json:"updatedAt"`
	TaskID         string                  `json:"taskId"`
	InspectionTask *InspectionTaskResponse `json:"inspectionTask,omitempty"`
	Severity       string                  `json:"severity"`
	Description    string                  `json:"description"`
	Analysis       string                  `json:"analysis"`
	DisposalMethod string                  `json:"disposalMethod"`
	Status         string                  `json:"status"`
	Deadline       *time.Time              `json:"deadline"`
	Resolver       string                  `json:"resolver"`
}

func mapInspectionStandardRequestToModel(input InspectionStandardRequest) models.InspectionStandard {
	return models.InspectionStandard{
		BaseModel:   models.BaseModel{ID: input.ID},
		Code:        input.Code,
		Name:        input.Name,
		Type:        input.Type,
		Version:     input.Version,
		Status:      input.Status,
		Items:       input.Items,
		Auditor:     input.Auditor,
		AuditTime:   input.AuditTime,
		Description: input.Description,
	}
}

func mapInspectionStandardToResponse(model models.InspectionStandard) InspectionStandardResponse {
	return InspectionStandardResponse{
		ID:          model.ID,
		CreatedAt:   model.CreatedAt,
		UpdatedAt:   model.UpdatedAt,
		Code:        model.Code,
		Name:        model.Name,
		Type:        model.Type,
		Version:     model.Version,
		Status:      model.Status,
		Items:       model.Items,
		Auditor:     model.Auditor,
		AuditTime:   model.AuditTime,
		Description: model.Description,
	}
}

func mapInspectionStandardsToResponse(items []models.InspectionStandard) []InspectionStandardResponse {
	result := make([]InspectionStandardResponse, 0, len(items))
	for _, item := range items {
		result = append(result, mapInspectionStandardToResponse(item))
	}
	return result
}

func mapInspectionTaskRequestToModel(input InspectionTaskRequest) models.InspectionTask {
	return models.InspectionTask{
		BaseModel:   models.BaseModel{ID: input.ID},
		StandardID:  input.StandardID,
		BatchNo:     input.BatchNo,
		ProductID:   input.ProductID,
		ProductName: input.ProductName,
		SampleQty:   input.SampleQty,
		Result:      input.Result,
		Inspector:   input.Inspector,
		InputData:   input.InputData,
		Remarks:     input.Remarks,
		CompletedAt: input.CompletedAt,
	}
}

func mapInspectionTaskToResponse(model models.InspectionTask) InspectionTaskResponse {
	var standard *InspectionStandardResponse
	if model.Standard != nil {
		mapped := mapInspectionStandardToResponse(*model.Standard)
		standard = &mapped
	}
	return InspectionTaskResponse{
		ID:          model.ID,
		CreatedAt:   model.CreatedAt,
		UpdatedAt:   model.UpdatedAt,
		StandardID:  model.StandardID,
		Standard:    standard,
		BatchNo:     model.BatchNo,
		ProductID:   model.ProductID,
		ProductName: model.ProductName,
		SampleQty:   model.SampleQty,
		Result:      model.Result,
		Inspector:   model.Inspector,
		InputData:   model.InputData,
		Remarks:     model.Remarks,
		CompletedAt: model.CompletedAt,
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
		ID:             model.ID,
		CreatedAt:      model.CreatedAt,
		UpdatedAt:      model.UpdatedAt,
		TaskID:         model.TaskID,
		InspectionTask: inspectionTask,
		Severity:       model.Severity,
		Description:    model.Description,
		Analysis:       model.Analysis,
		DisposalMethod: model.DisposalMethod,
		Status:         model.Status,
		Deadline:       model.Deadline,
		Resolver:       model.Resolver,
	}
}

func mapQualityAbnormalitiesToResponse(items []models.QualityAbnormality) []QualityAbnormalityResponse {
	result := make([]QualityAbnormalityResponse, 0, len(items))
	for _, item := range items {
		result = append(result, mapQualityAbnormalityToResponse(item))
	}
	return result
}
