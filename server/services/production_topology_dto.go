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

type LineSegmentDTO struct {
	ID                   string                            `json:"id"`
	CreatedAt            time.Time                         `json:"createdAt"`
	UpdatedAt            time.Time                         `json:"updatedAt"`
	LineID               string                            `json:"lineId"`
	Name                 string                            `json:"name"`
	ProductID            string                            `json:"productId"`
	ProductSKU           string                            `json:"productSKU,omitempty"`
	ProductName          string                            `json:"productName,omitempty"`
	BOMOwnerType         string                            `json:"bomOwnerType,omitempty"`
	BOMOwnerCustomerID   string                            `json:"bomOwnerCustomerId,omitempty"`
	BOMOwnerCustomerName string                            `json:"bomOwnerCustomerName,omitempty"`
	BOMVersionLevel      string                            `json:"bomVersionLevel,omitempty"`
	Description          string                            `json:"description"`
	SortOrder            int                               `json:"sortOrder"`
	Attributes           json.RawMessage                   `json:"attributes"`
	BranchOperations     []ProductionBOMBranchOperationDTO `json:"branchOperations"`
}

type ProductionLineDTO struct {
	ID                string           `json:"id"`
	CreatedAt         time.Time        `json:"createdAt"`
	UpdatedAt         time.Time        `json:"updatedAt"`
	Code              string           `json:"code"`
	Name              string           `json:"name"`
	ProductTemplateID string           `json:"productTemplateId"`
	Description       string           `json:"description"`
	Version           int64            `json:"version"`
	IsActive          bool             `json:"isActive"`
	Segments          []LineSegmentDTO `json:"segments"`
}

type ProductionLineProductTemplateDTO struct {
	ID     string `json:"id"`
	Name   string `json:"name"`
	Code   string `json:"code"`
	Active bool   `json:"active"`
}

type ProductionLineProductTemplatesResponse struct {
	Items []ProductionLineProductTemplateDTO `json:"items"`
}

type ProductionLinesResponse struct {
	Items []ProductionLineDTO `json:"items"`
}

func mapLineSegmentToDTO(segment models.LineSegment) LineSegmentDTO {
	return LineSegmentDTO{
		ID:                   segment.ID,
		CreatedAt:            segment.CreatedAt,
		UpdatedAt:            segment.UpdatedAt,
		LineID:               segment.LineID,
		Name:                 segment.Name,
		ProductID:            segment.ProductID,
		ProductSKU:           segment.ProductSKU,
		ProductName:          segment.ProductName,
		BOMOwnerType:         segment.BOMOwnerType,
		BOMOwnerCustomerID:   segment.BOMOwnerCustomerID,
		BOMOwnerCustomerName: segment.BOMOwnerCustomerName,
		BOMVersionLevel:      segment.BOMVersionLevel,
		Description:          segment.Description,
		SortOrder:            segment.SortOrder,
		Attributes:           cloneRawMessage(segment.Attributes),
		BranchOperations:     mapProductionBOMBranchOperationsToDTO(segment.BranchOperations),
	}
}

func mapLineSegmentDTOToModel(segment LineSegmentDTO) models.LineSegment {
	return models.LineSegment{
		BaseModel: models.BaseModel{
			ID:        segment.ID,
			CreatedAt: segment.CreatedAt,
			UpdatedAt: segment.UpdatedAt,
		},
		LineID:               segment.LineID,
		Name:                 segment.Name,
		ProductID:            segment.ProductID,
		ProductSKU:           segment.ProductSKU,
		ProductName:          segment.ProductName,
		BOMOwnerType:         segment.BOMOwnerType,
		BOMOwnerCustomerID:   segment.BOMOwnerCustomerID,
		BOMOwnerCustomerName: segment.BOMOwnerCustomerName,
		BOMVersionLevel:      segment.BOMVersionLevel,
		Description:          segment.Description,
		SortOrder:            segment.SortOrder,
		Attributes:           cloneRawMessage(segment.Attributes),
	}
}

func mapProductionLineToDTO(line models.ProductionLine) ProductionLineDTO {
	segments := make([]LineSegmentDTO, 0, len(line.Segments))
	for _, segment := range line.Segments {
		segments = append(segments, mapLineSegmentToDTO(segment))
	}
	productTemplateID := ""
	name := line.Name
	if line.ProductTemplateID != nil {
		productTemplateID = *line.ProductTemplateID
	}
	if line.ProductTemplate != nil {
		name = line.ProductTemplate.Name
	}

	return ProductionLineDTO{
		ID:                line.ID,
		CreatedAt:         line.CreatedAt,
		UpdatedAt:         line.UpdatedAt,
		Code:              line.Code,
		Name:              name,
		ProductTemplateID: productTemplateID,
		Description:       line.Description,
		Version:           line.Version,
		IsActive:          line.IsActive,
		Segments:          segments,
	}
}

func mapProductionLineDTOToModel(line ProductionLineDTO) models.ProductionLine {
	segments := make([]models.LineSegment, 0, len(line.Segments))
	for _, segment := range line.Segments {
		segments = append(segments, mapLineSegmentDTOToModel(segment))
	}

	var productTemplateID *string
	if line.ProductTemplateID != "" {
		value := line.ProductTemplateID
		productTemplateID = &value
	}

	return models.ProductionLine{
		BaseModel: models.BaseModel{
			ID:        line.ID,
			CreatedAt: line.CreatedAt,
			UpdatedAt: line.UpdatedAt,
		},
		Code:              line.Code,
		Name:              line.Name,
		ProductTemplateID: productTemplateID,
		Description:       line.Description,
		Version:           line.Version,
		IsActive:          line.IsActive,
		Segments:          segments,
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
