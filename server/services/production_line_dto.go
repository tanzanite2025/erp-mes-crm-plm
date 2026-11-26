package services

import (
	"time"
	"xdfc-server/models"
)

type SaveProductionLineHandlerRequest struct {
	ProductionLineDTO
	AuthCode string `json:"authCode"`
}

type ProductionLineDTO struct {
	ID          string    `json:"id"`
	CreatedAt   time.Time `json:"createdAt"`
	UpdatedAt   time.Time `json:"updatedAt"`
	Code        string    `json:"code"`
	Name        string    `json:"name"`
	Description string    `json:"description"`
	Version     int64     `json:"version"`
	IsActive    bool      `json:"isActive"`
}

type ProductionLinesResponse struct {
	Items []ProductionLineDTO `json:"items"`
}

func mapProductionLineToDTO(line models.ProductionLine) ProductionLineDTO {
	return ProductionLineDTO{
		ID:          line.ID,
		CreatedAt:   line.CreatedAt,
		UpdatedAt:   line.UpdatedAt,
		Code:        line.Code,
		Name:        line.Name,
		Description: line.Description,
		Version:     line.Version,
		IsActive:    line.IsActive,
	}
}

func mapProductionLineDTOToModel(line ProductionLineDTO) models.ProductionLine {
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
	}
}

func mapProductionLinesToDTO(lines []models.ProductionLine) []ProductionLineDTO {
	result := make([]ProductionLineDTO, 0, len(lines))
	for _, line := range lines {
		result = append(result, mapProductionLineToDTO(line))
	}
	return result
}

