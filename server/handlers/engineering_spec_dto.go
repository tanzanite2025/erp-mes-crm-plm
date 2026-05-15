package handlers

import (
	"time"

	"gorm.io/datatypes"
	"xdfc-server/models"
)

// EngineeringSpecResponseDTO 工程规格响应 DTO（含嵌套 masterDataControl）
type EngineeringSpecResponseDTO struct {
	ID           string         `json:"id"`
	CreatedAt    time.Time      `json:"createdAt"`
	UpdatedAt    time.Time      `json:"updatedAt"`
	Name         string         `json:"name"`
	Code         string         `json:"code"`
	Type         string         `json:"type"`
	Description  string         `json:"description,omitempty"`
	Active       bool           `json:"active"`
	SpecData     datatypes.JSON `json:"specData,omitempty"`
	DrillingData datatypes.JSON `json:"drillingData,omitempty"`
	CuttingData  datatypes.JSON `json:"cuttingData,omitempty"`
	LabelingData datatypes.JSON `json:"labelingData,omitempty"`
	Version      int            `json:"version"`
	// --- MasterDataControl 嵌套命名空间（唯一输出格式） ---
	MasterDataControl *MasterDataControlDTO `json:"masterDataControl,omitempty"`
}

func mapEngineeringSpecToResponseDTO(spec models.EngineeringSpec) EngineeringSpecResponseDTO {
	return EngineeringSpecResponseDTO{
		ID:                spec.ID,
		CreatedAt:         spec.CreatedAt,
		UpdatedAt:         spec.UpdatedAt,
		Name:              spec.Name,
		Code:              spec.Code,
		Type:              spec.Type,
		Description:       spec.Description,
		Active:            spec.Active,
		SpecData:          spec.SpecData,
		DrillingData:      spec.DrillingData,
		CuttingData:       spec.CuttingData,
		LabelingData:      spec.LabelingData,
		Version:           spec.Version,
		MasterDataControl: MapMasterDataControlToDTO(spec.MasterDataControl),
	}
}

func mapEngineeringSpecsToResponseDTOs(specs []models.EngineeringSpec) []EngineeringSpecResponseDTO {
	result := make([]EngineeringSpecResponseDTO, 0, len(specs))
	for _, spec := range specs {
		result = append(result, mapEngineeringSpecToResponseDTO(spec))
	}
	return result
}
