package services

import (
	"encoding/json"
	"time"
	"xdfc-server/models"
)

type SaveProductionLineHandlerRequest struct {
	ProductionLineDTO
	AuthCode string `json:"authCode"`
}

type ProcessStepDTO struct {
	ID          string    `json:"id"`
	CreatedAt   time.Time `json:"createdAt"`
	UpdatedAt   time.Time `json:"updatedAt"`
	Code        string    `json:"code"`
	Name        string    `json:"name"`
	Description string    `json:"description"`
	SortOrder   int       `json:"sortOrder"`
	IsActive    bool      `json:"isActive"`
}

type JobCategoryDTO struct {
	ID                string           `json:"id"`
	CreatedAt         time.Time        `json:"createdAt"`
	UpdatedAt         time.Time        `json:"updatedAt"`
	SegmentID         string           `json:"segmentId"`
	Name              string           `json:"name"`
	HierarchyOptionID string           `json:"hierarchyOptionId"`
	Description       string           `json:"description"`
	SortOrder         int              `json:"sortOrder"`
	Attributes        json.RawMessage  `json:"attributes"`
	Processes         []ProcessStepDTO `json:"processes"`
}

type LineSegmentDTO struct {
	ID                string           `json:"id"`
	CreatedAt         time.Time        `json:"createdAt"`
	UpdatedAt         time.Time        `json:"updatedAt"`
	LineID            string           `json:"lineId"`
	Name              string           `json:"name"`
	HierarchyOptionID string           `json:"hierarchyOptionId"`
	Description       string           `json:"description"`
	SortOrder         int              `json:"sortOrder"`
	Attributes        json.RawMessage  `json:"attributes"`
	JobCategories     []JobCategoryDTO `json:"jobCategories"`
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

func mapProcessStepToDTO(step models.ProcessStep) ProcessStepDTO {
	return ProcessStepDTO{
		ID:          step.ID,
		CreatedAt:   step.CreatedAt,
		UpdatedAt:   step.UpdatedAt,
		Code:        step.Code,
		Name:        step.Name,
		Description: step.Description,
		SortOrder:   step.SortOrder,
		IsActive:    step.IsActive,
	}
}

func mapProcessStepDTOToModel(step ProcessStepDTO) models.ProcessStep {
	return models.ProcessStep{
		BaseModel: models.BaseModel{
			ID:        step.ID,
			CreatedAt: step.CreatedAt,
			UpdatedAt: step.UpdatedAt,
		},
		Code:        step.Code,
		Name:        step.Name,
		Description: step.Description,
		SortOrder:   step.SortOrder,
		IsActive:    step.IsActive,
	}
}

func mapJobCategoryToDTO(category models.JobCategory) JobCategoryDTO {
	processes := make([]ProcessStepDTO, 0, len(category.Processes))
	for _, process := range category.Processes {
		processes = append(processes, mapProcessStepToDTO(process))
	}

	return JobCategoryDTO{
		ID:                category.ID,
		CreatedAt:         category.CreatedAt,
		UpdatedAt:         category.UpdatedAt,
		SegmentID:         category.SegmentID,
		Name:              category.Name,
		HierarchyOptionID: category.HierarchyOptionID,
		Description:       category.Description,
		SortOrder:         category.SortOrder,
		Attributes:        cloneRawMessage(category.Attributes),
		Processes:         processes,
	}
}

func mapJobCategoryDTOToModel(category JobCategoryDTO) models.JobCategory {
	processes := make([]models.ProcessStep, 0, len(category.Processes))
	for _, process := range category.Processes {
		processes = append(processes, mapProcessStepDTOToModel(process))
	}

	return models.JobCategory{
		BaseModel: models.BaseModel{
			ID:        category.ID,
			CreatedAt: category.CreatedAt,
			UpdatedAt: category.UpdatedAt,
		},
		SegmentID:         category.SegmentID,
		Name:              category.Name,
		HierarchyOptionID: category.HierarchyOptionID,
		Description:       category.Description,
		SortOrder:         category.SortOrder,
		Attributes:        cloneRawMessage(category.Attributes),
		Processes:         processes,
	}
}

func mapLineSegmentToDTO(segment models.LineSegment) LineSegmentDTO {
	jobCategories := make([]JobCategoryDTO, 0, len(segment.JobCategories))
	for _, category := range segment.JobCategories {
		jobCategories = append(jobCategories, mapJobCategoryToDTO(category))
	}

	return LineSegmentDTO{
		ID:                segment.ID,
		CreatedAt:         segment.CreatedAt,
		UpdatedAt:         segment.UpdatedAt,
		LineID:            segment.LineID,
		Name:              segment.Name,
		HierarchyOptionID: segment.HierarchyOptionID,
		Description:       segment.Description,
		SortOrder:         segment.SortOrder,
		Attributes:        cloneRawMessage(segment.Attributes),
		JobCategories:     jobCategories,
	}
}

func mapLineSegmentDTOToModel(segment LineSegmentDTO) models.LineSegment {
	jobCategories := make([]models.JobCategory, 0, len(segment.JobCategories))
	for _, category := range segment.JobCategories {
		jobCategories = append(jobCategories, mapJobCategoryDTOToModel(category))
	}

	return models.LineSegment{
		BaseModel: models.BaseModel{
			ID:        segment.ID,
			CreatedAt: segment.CreatedAt,
			UpdatedAt: segment.UpdatedAt,
		},
		LineID:            segment.LineID,
		Name:              segment.Name,
		HierarchyOptionID: segment.HierarchyOptionID,
		Description:       segment.Description,
		SortOrder:         segment.SortOrder,
		Attributes:        cloneRawMessage(segment.Attributes),
		JobCategories:     jobCategories,
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
