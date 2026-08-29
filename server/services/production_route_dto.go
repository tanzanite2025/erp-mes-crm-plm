package services

import (
	"encoding/json"
	"time"
	"xdfc-server/models"

	"gorm.io/datatypes"
)

type ProductionRouteStepDTO struct {
	ID               string          `json:"id"`
	CreatedAt        time.Time       `json:"createdAt"`
	UpdatedAt        time.Time       `json:"updatedAt"`
	RouteID          string          `json:"routeId"`
	Sequence         int             `json:"sequence"`
	SegmentID        string          `json:"segmentId"`
	SegmentName      string          `json:"segmentName"`
	ProcessStepID    string          `json:"processStepId"`
	ProcessCode      string          `json:"processCode"`
	ProcessName      string          `json:"processName"`
	ExecutionMode    string          `json:"executionMode"`
	QualityGate      string          `json:"qualityGate"`
	QualityRouting   json.RawMessage `json:"qualityRouting"`
	EstimatedMinutes int             `json:"estimatedMinutes"`
	TransferRequired bool            `json:"transferRequired"`
	Description      string          `json:"description"`
}

type ProductionRouteDTO struct {
	ID                string                   `json:"id"`
	CreatedAt         time.Time                `json:"createdAt"`
	UpdatedAt         time.Time                `json:"updatedAt"`
	Code              string                   `json:"code"`
	Name              string                   `json:"name"`
	ProductID         string                   `json:"productId"`
	ProductName       string                   `json:"productName"`
	ProductTemplateID string                   `json:"productTemplateId"`
	Description       string                   `json:"description"`
	Version           int64                    `json:"version"`
	Status            string                   `json:"status"`
	Steps             []ProductionRouteStepDTO `json:"steps"`
}

type ProductionRoutesResponse struct {
	Items []ProductionRouteDTO `json:"items"`
}

func mapProductionRouteStepToDTO(step models.ProductionRouteStep) ProductionRouteStepDTO {
	processCode := ""
	processName := ""
	if step.ProcessStep != nil {
		processCode = step.ProcessStep.Code
		processName = step.ProcessStep.Name
	}
	segmentName := ""
	if step.Segment != nil {
		segmentName = step.Segment.Name
	}

	return ProductionRouteStepDTO{
		ID:               step.ID,
		CreatedAt:        step.CreatedAt,
		UpdatedAt:        step.UpdatedAt,
		RouteID:          step.RouteID,
		Sequence:         step.Sequence,
		SegmentID:        step.SegmentID,
		SegmentName:      segmentName,
		ProcessStepID:    step.ProcessStepID,
		ProcessCode:      processCode,
		ProcessName:      processName,
		ExecutionMode:    step.ExecutionMode,
		QualityGate:      step.QualityGate,
		QualityRouting:   cloneRawMessage(json.RawMessage(step.QualityRouting)),
		EstimatedMinutes: step.EstimatedMinutes,
		TransferRequired: step.TransferRequired,
		Description:      step.Description,
	}
}

func mapProductionRouteStepDTOToModel(step ProductionRouteStepDTO) models.ProductionRouteStep {
	return models.ProductionRouteStep{
		BaseModel: models.BaseModel{
			ID:        step.ID,
			CreatedAt: step.CreatedAt,
			UpdatedAt: step.UpdatedAt,
		},
		RouteID:          step.RouteID,
		Sequence:         step.Sequence,
		SegmentID:        step.SegmentID,
		ProcessStepID:    step.ProcessStepID,
		ExecutionMode:    step.ExecutionMode,
		QualityGate:      step.QualityGate,
		QualityRouting:   datatypes.JSON(cloneRawMessage(step.QualityRouting)),
		EstimatedMinutes: step.EstimatedMinutes,
		TransferRequired: step.TransferRequired,
		Description:      step.Description,
	}
}

func mapProductionRouteToDTO(route models.ProductionRoute) ProductionRouteDTO {
	steps := make([]ProductionRouteStepDTO, 0, len(route.Steps))
	for _, step := range route.Steps {
		steps = append(steps, mapProductionRouteStepToDTO(step))
	}

	return ProductionRouteDTO{
		ID:                route.ID,
		CreatedAt:         route.CreatedAt,
		UpdatedAt:         route.UpdatedAt,
		Code:              route.Code,
		Name:              route.Name,
		ProductID:         route.ProductID,
		ProductName:       route.ProductName,
		ProductTemplateID: route.ProductTemplateID,
		Description:       route.Description,
		Version:           route.Version,
		Status:            route.Status,
		Steps:             steps,
	}
}

func mapProductionRouteDTOToModel(route ProductionRouteDTO) models.ProductionRoute {
	steps := make([]models.ProductionRouteStep, 0, len(route.Steps))
	for _, step := range route.Steps {
		steps = append(steps, mapProductionRouteStepDTOToModel(step))
	}

	return models.ProductionRoute{
		BaseModel: models.BaseModel{
			ID:        route.ID,
			CreatedAt: route.CreatedAt,
			UpdatedAt: route.UpdatedAt,
		},
		Code:              route.Code,
		Name:              route.Name,
		ProductID:         route.ProductID,
		ProductName:       route.ProductName,
		ProductTemplateID: route.ProductTemplateID,
		Description:       route.Description,
		Version:           route.Version,
		Status:            route.Status,
		Steps:             steps,
	}
}

func mapProductionRoutesToDTO(routes []models.ProductionRoute) []ProductionRouteDTO {
	result := make([]ProductionRouteDTO, 0, len(routes))
	for _, route := range routes {
		result = append(result, mapProductionRouteToDTO(route))
	}
	return result
}
