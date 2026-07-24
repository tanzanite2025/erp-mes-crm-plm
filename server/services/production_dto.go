package services

import (
	"encoding/json"
	"strings"
	"time"
	"xdfc-server/models"
)

type SaveProductionLineHandlerRequest struct {
	ProductionLineDTO
	AuthCode string `json:"authCode"`
}

type ProcessStepDTO struct {
	ID                 string                          `json:"id"`
	CreatedAt          time.Time                       `json:"createdAt"`
	UpdatedAt          time.Time                       `json:"updatedAt"`
	Code               string                          `json:"code"`
	Name               string                          `json:"name"`
	Description        string                          `json:"description"`
	SortOrder          int                             `json:"sortOrder"`
	IsActive           bool                            `json:"isActive"`
	AllowedPositionIDs []string                        `json:"allowedPositionIds"`
	AllowedPositions   []ProcessStepAllowedPositionDTO `json:"allowedPositions"`
}

type ProcessStepAllowedPositionDTO struct {
	ID          string `json:"id"`
	Code        string `json:"code"`
	Name        string `json:"name"`
	OrgUnitID   string `json:"orgUnitId"`
	OrgUnitName string `json:"orgUnitName"`
	Status      string `json:"status"`
}

type LineSegmentDTO struct {
	ID          string           `json:"id"`
	CreatedAt   time.Time        `json:"createdAt"`
	UpdatedAt   time.Time        `json:"updatedAt"`
	LineID      string           `json:"lineId"`
	Name        string           `json:"name"`
	Description string           `json:"description"`
	SortOrder   int              `json:"sortOrder"`
	Attributes  json.RawMessage  `json:"attributes"`
	Processes   []ProcessStepDTO `json:"processes"`
}

type ProductionLineDTO struct {
	ID          string           `json:"id"`
	CreatedAt   time.Time        `json:"createdAt"`
	UpdatedAt   time.Time        `json:"updatedAt"`
	Code        string           `json:"code"`
	Name        string           `json:"name"`
	Description string           `json:"description"`
	Version     int64            `json:"version"`
	IsActive    bool             `json:"isActive"`
	Segments    []LineSegmentDTO `json:"segments"`
}

type ProductionLinesResponse struct {
	Items []ProductionLineDTO `json:"items"`
}

type ProcessStepsResponse struct {
	Items []ProcessStepDTO `json:"items"`
}

type ProductionRouteStepDTO struct {
	ID               string    `json:"id"`
	CreatedAt        time.Time `json:"createdAt"`
	UpdatedAt        time.Time `json:"updatedAt"`
	RouteID          string    `json:"routeId"`
	Sequence         int       `json:"sequence"`
	SegmentID        string    `json:"segmentId"`
	SegmentName      string    `json:"segmentName"`
	ProcessStepID    string    `json:"processStepId"`
	ProcessCode      string    `json:"processCode"`
	ProcessName      string    `json:"processName"`
	ExecutionMode    string    `json:"executionMode"`
	QualityGate      string    `json:"qualityGate"`
	EstimatedMinutes int       `json:"estimatedMinutes"`
	TransferRequired bool      `json:"transferRequired"`
	Description      string    `json:"description"`
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

func mapProcessStepToDTO(step models.ProcessStep) ProcessStepDTO {
	allowedPositions := mapProcessStepPositionsToDTO(step.AllowedPositions)
	return ProcessStepDTO{
		ID:                 step.ID,
		CreatedAt:          step.CreatedAt,
		UpdatedAt:          step.UpdatedAt,
		Code:               step.Code,
		Name:               step.Name,
		Description:        step.Description,
		SortOrder:          step.SortOrder,
		IsActive:           step.IsActive,
		AllowedPositionIDs: collectProcessStepPositionIDs(allowedPositions),
		AllowedPositions:   allowedPositions,
	}
}

func mapProcessStepPositionToDTO(position models.Position) ProcessStepAllowedPositionDTO {
	orgUnitID := ""
	if position.OrgUnitID != nil {
		orgUnitID = *position.OrgUnitID
	}

	return ProcessStepAllowedPositionDTO{
		ID:          position.ID,
		Code:        position.Code,
		Name:        position.Name,
		OrgUnitID:   orgUnitID,
		OrgUnitName: position.OrgUnitName,
		Status:      position.Status,
	}
}

func mapProcessStepPositionsToDTO(positions []models.Position) []ProcessStepAllowedPositionDTO {
	result := make([]ProcessStepAllowedPositionDTO, 0, len(positions))
	for _, position := range positions {
		result = append(result, mapProcessStepPositionToDTO(position))
	}
	return result
}

func collectProcessStepPositionIDs(positions []ProcessStepAllowedPositionDTO) []string {
	ids := make([]string, 0, len(positions))
	for _, position := range positions {
		if position.ID != "" {
			ids = append(ids, position.ID)
		}
	}
	return ids
}

func mapProcessStepDTOToModel(step ProcessStepDTO) models.ProcessStep {
	allowedPositionIDs := normalizeProcessStepAllowedPositionIDs(step)
	allowedPositions := make([]models.Position, 0, len(allowedPositionIDs))
	for _, positionID := range allowedPositionIDs {
		allowedPositions = append(allowedPositions, models.Position{
			BaseModel: models.BaseModel{ID: positionID},
		})
	}

	return models.ProcessStep{
		BaseModel: models.BaseModel{
			ID:        step.ID,
			CreatedAt: step.CreatedAt,
			UpdatedAt: step.UpdatedAt,
		},
		Code:             step.Code,
		Name:             step.Name,
		Description:      step.Description,
		SortOrder:        step.SortOrder,
		IsActive:         step.IsActive,
		AllowedPositions: allowedPositions,
	}
}

func normalizeProcessStepAllowedPositionIDs(step ProcessStepDTO) []string {
	seen := make(map[string]struct{})
	ids := make([]string, 0, len(step.AllowedPositionIDs)+len(step.AllowedPositions))
	appendUnique := func(value string) {
		id := strings.TrimSpace(value)
		if id == "" {
			return
		}
		if _, exists := seen[id]; exists {
			return
		}
		seen[id] = struct{}{}
		ids = append(ids, id)
	}

	for _, id := range step.AllowedPositionIDs {
		appendUnique(id)
	}
	for _, position := range step.AllowedPositions {
		appendUnique(position.ID)
	}

	return ids
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

func mapProcessesToDTO(processModels []models.ProcessStep) []ProcessStepDTO {
	processes := make([]ProcessStepDTO, 0, len(processModels))
	for _, process := range processModels {
		processes = append(processes, mapProcessStepToDTO(process))
	}
	return processes
}

func mapProcessesDTOToModel(processDTOs []ProcessStepDTO) []models.ProcessStep {
	processes := make([]models.ProcessStep, 0, len(processDTOs))
	for _, process := range processDTOs {
		processes = append(processes, mapProcessStepDTOToModel(process))
	}
	return processes
}

func mapLineSegmentToDTO(segment models.LineSegment) LineSegmentDTO {
	return LineSegmentDTO{
		ID:          segment.ID,
		CreatedAt:   segment.CreatedAt,
		UpdatedAt:   segment.UpdatedAt,
		LineID:      segment.LineID,
		Name:        segment.Name,
		Description: segment.Description,
		SortOrder:   segment.SortOrder,
		Attributes:  cloneRawMessage(segment.Attributes),
		Processes:   mapProcessesToDTO(segment.Processes),
	}
}

func mapLineSegmentDTOToModel(segment LineSegmentDTO) models.LineSegment {
	return models.LineSegment{
		BaseModel: models.BaseModel{
			ID:        segment.ID,
			CreatedAt: segment.CreatedAt,
			UpdatedAt: segment.UpdatedAt,
		},
		LineID:      segment.LineID,
		Name:        segment.Name,
		Description: segment.Description,
		SortOrder:   segment.SortOrder,
		Attributes:  cloneRawMessage(segment.Attributes),
		Processes:   mapProcessesDTOToModel(segment.Processes),
	}
}

func mapProductionLineToDTO(line models.ProductionLine) ProductionLineDTO {
	segments := make([]LineSegmentDTO, 0, len(line.Segments))
	for _, segment := range line.Segments {
		segments = append(segments, mapLineSegmentToDTO(segment))
	}

	return ProductionLineDTO{
		ID:          line.ID,
		CreatedAt:   line.CreatedAt,
		UpdatedAt:   line.UpdatedAt,
		Code:        line.Code,
		Name:        line.Name,
		Description: line.Description,
		Version:     line.Version,
		IsActive:    line.IsActive,
		Segments:    segments,
	}
}

func mapProductionLineDTOToModel(line ProductionLineDTO) models.ProductionLine {
	segments := make([]models.LineSegment, 0, len(line.Segments))
	for _, segment := range line.Segments {
		segments = append(segments, mapLineSegmentDTOToModel(segment))
	}

	return models.ProductionLine{
		BaseModel: models.BaseModel{
			ID:        line.ID,
			CreatedAt: line.CreatedAt,
			UpdatedAt: line.UpdatedAt,
		},
		Code:        line.Code,
		Name:        line.Name,
		Description: line.Description,
		Version:     line.Version,
		IsActive:    line.IsActive,
		Segments:    segments,
	}
}

func mapProductionLinesToDTO(lines []models.ProductionLine) []ProductionLineDTO {
	result := make([]ProductionLineDTO, 0, len(lines))
	for _, line := range lines {
		result = append(result, mapProductionLineToDTO(line))
	}
	return result
}

func cloneRawMessage(value json.RawMessage) json.RawMessage {
	if len(value) == 0 {
		return nil
	}
	cloned := make(json.RawMessage, len(value))
	copy(cloned, value)
	return cloned
}
