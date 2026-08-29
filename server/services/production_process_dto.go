package services

import (
	"time"
	"xdfc-server/models"
)

type SaveProcessStepHandlerRequest struct {
	ProcessStepDTO
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

// MapProcessStepsToDTO is kept exported for existing callers.
func MapProcessStepsToDTO(processModels []models.ProcessStep) []ProcessStepDTO {
	return mapProcessesToDTO(processModels)
}
