package services

import (
	"time"
	"xdfc-server/models"
)

type ProductionBOMBranchOperationDTO struct {
	ID                 string    `json:"id"`
	CreatedAt          time.Time `json:"createdAt"`
	UpdatedAt          time.Time `json:"updatedAt"`
	ProductID          string    `json:"productId"`
	BOMOwnerType       string    `json:"bomOwnerType"`
	BOMOwnerCustomerID string    `json:"bomOwnerCustomerId"`
	BOMVersionLevel    string    `json:"bomVersionLevel"`
	Name               string    `json:"name"`
	Description        string    `json:"description"`
	SortOrder          int       `json:"sortOrder"`
	IsActive           bool      `json:"isActive"`
	ProcessLibraryID   string    `json:"processLibraryId"`
}

type SaveProductionBOMBranchOperationHandlerRequest struct {
	ProductionBOMBranchOperationDTO
}

type SaveProductionBOMBranchOperationSelectionHandlerRequest struct {
	ProductID          string   `json:"productId"`
	BOMOwnerType       string   `json:"bomOwnerType"`
	BOMOwnerCustomerID string   `json:"bomOwnerCustomerId"`
	BOMVersionLevel    string   `json:"bomVersionLevel"`
	ProcessLibraryIDs  []string `json:"processLibraryIds"`
}

type ProductionBOMBranchOperationSelectionResponse struct {
	Items []ProductionBOMBranchOperationDTO `json:"items"`
}

func mapProductionBOMBranchOperationToDTO(
	operation models.ProductionBOMBranchOperation,
) ProductionBOMBranchOperationDTO {
	return ProductionBOMBranchOperationDTO{
		ID:                 operation.ID,
		CreatedAt:          operation.CreatedAt,
		UpdatedAt:          operation.UpdatedAt,
		ProductID:          operation.ProductID,
		BOMOwnerType:       operation.BOMOwnerType,
		BOMOwnerCustomerID: operation.BOMOwnerCustomerID,
		BOMVersionLevel:    operation.BOMVersionLevel,
		Name:               operation.Name,
		Description:        operation.Description,
		SortOrder:          operation.SortOrder,
		IsActive:           operation.IsActive,
		ProcessLibraryID:   operation.ProcessLibraryID,
	}
}

func mapProductionBOMBranchOperationsToDTO(
	operations []models.ProductionBOMBranchOperation,
) []ProductionBOMBranchOperationDTO {
	dtos := make([]ProductionBOMBranchOperationDTO, 0, len(operations))
	for _, operation := range operations {
		dtos = append(dtos, mapProductionBOMBranchOperationToDTO(operation))
	}
	return dtos
}

func mapProductionBOMBranchOperationDTOToModel(
	operation ProductionBOMBranchOperationDTO,
) models.ProductionBOMBranchOperation {
	return models.ProductionBOMBranchOperation{
		BaseModel: models.BaseModel{
			ID:        operation.ID,
			CreatedAt: operation.CreatedAt,
			UpdatedAt: operation.UpdatedAt,
		},
		ProductID:          operation.ProductID,
		BOMOwnerType:       operation.BOMOwnerType,
		BOMOwnerCustomerID: operation.BOMOwnerCustomerID,
		BOMVersionLevel:    operation.BOMVersionLevel,
		Name:               operation.Name,
		Description:        operation.Description,
		SortOrder:          operation.SortOrder,
		IsActive:           operation.IsActive,
		ProcessLibraryID:   operation.ProcessLibraryID,
	}
}
