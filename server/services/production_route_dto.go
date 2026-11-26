package services

import (
	"encoding/json"
	"strings"
	"time"
	"xdfc-server/models"

	"gorm.io/datatypes"
)

type ProductionRouteStepDTO struct {
	ID                 string          `json:"id"`
	CreatedAt          time.Time       `json:"createdAt"`
	UpdatedAt          time.Time       `json:"updatedAt"`
	RouteID            string          `json:"routeId"`
	Sequence           int             `json:"sequence"`
	ProcessStepID      string          `json:"processStepId"`
	ProcessName        string          `json:"processName"`
	ProcessDescription string          `json:"processDescription"`
	ExecutionMode      string          `json:"executionMode"`
	QualityGate        string          `json:"qualityGate"`
	QualityRouting     json.RawMessage `json:"qualityRouting"`
	EstimatedMinutes   int             `json:"estimatedMinutes"`
	TransferRequired   bool            `json:"transferRequired"`
	Description        string          `json:"description"`
}

type ProductionRouteDTO struct {
	ID                   string                   `json:"id"`
	RouteFamilyID        string                   `json:"routeFamilyId"`
	RevisionNo           int                      `json:"revisionNo"`
	BasedOnRouteID       string                   `json:"basedOnRouteId"`
	IsCurrentRevision    bool                     `json:"isCurrentRevision"`
	CreatedAt            time.Time                `json:"createdAt"`
	UpdatedAt            time.Time                `json:"updatedAt"`
	Code                 string                   `json:"code"`
	Name                 string                   `json:"name"`
	ProductID            string                   `json:"productId"`
	ProductSKU           string                   `json:"productSKU"`
	ProductName          string                   `json:"productName"`
	BOMOwnerType         string                   `json:"bomOwnerType"`
	BOMOwnerCustomerID   string                   `json:"bomOwnerCustomerId"`
	BOMOwnerCustomerName string                   `json:"bomOwnerCustomerName"`
	BOMVersionLevel      string                   `json:"bomVersionLevel"`
	ScopeType            string                   `json:"scopeType"`
	SalesOrderLineID     uint                     `json:"salesOrderLineId,omitempty"`
	SalesOrderNo         string                   `json:"salesOrderNo,omitempty"`
	SalesOrderLineNo     int                      `json:"salesOrderLineNo,omitempty"`
	Description          string                   `json:"description"`
	Version              int64                    `json:"version"`
	Status               string                   `json:"status"`
	Steps                []ProductionRouteStepDTO `json:"steps"`
}

type ProductionRoutesResponse struct {
	Items []ProductionRouteDTO `json:"items"`
}

func cloneProductionRouteQualityRoutingJSON(value json.RawMessage) json.RawMessage {
	if len(value) == 0 {
		return nil
	}
	return append(json.RawMessage(nil), value...)
}

func mapProductionRouteStepToDTO(step models.ProductionRouteStep, published bool) ProductionRouteStepDTO {
	processName := ""
	processDescription := ""
	if published {
		processName = strings.TrimSpace(step.ProcessNameSnapshot)
		processDescription = step.ProcessDescriptionSnapshot
	} else if step.ProcessStep != nil {
		processName = step.ProcessStep.Name
		processDescription = step.ProcessStep.Description
	}

	return ProductionRouteStepDTO{
		ID:                 step.ID,
		CreatedAt:          step.CreatedAt,
		UpdatedAt:          step.UpdatedAt,
		RouteID:            step.RouteID,
		Sequence:           step.Sequence,
		ProcessStepID:      strings.TrimSpace(step.ProcessStepID),
		ProcessName:        processName,
		ProcessDescription: processDescription,
		ExecutionMode:      step.ExecutionMode,
		QualityGate:        step.QualityGate,
		QualityRouting:     cloneProductionRouteQualityRoutingJSON(json.RawMessage(step.QualityRouting)),
		EstimatedMinutes:   step.EstimatedMinutes,
		TransferRequired:   step.TransferRequired,
		Description:        step.Description,
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
		ProcessStepID:    strings.TrimSpace(step.ProcessStepID),
		ExecutionMode:    step.ExecutionMode,
		QualityGate:      step.QualityGate,
		QualityRouting:   datatypes.JSON(cloneProductionRouteQualityRoutingJSON(step.QualityRouting)),
		EstimatedMinutes: step.EstimatedMinutes,
		TransferRequired: step.TransferRequired,
		Description:      step.Description,
	}
}

func mapProductionRouteToDTO(route models.ProductionRoute) ProductionRouteDTO {
	steps := make([]ProductionRouteStepDTO, 0, len(route.Steps))
	for _, step := range route.Steps {
		steps = append(steps, mapProductionRouteStepToDTO(step, strings.EqualFold(route.Status, productionRouteStatusPublished)))
	}
	isCurrentRevision := route.RouteFamily != nil && strings.TrimSpace(route.RouteFamily.CurrentRevisionID) == strings.TrimSpace(route.ID)

	scopeType := strings.ToUpper(strings.TrimSpace(route.ScopeType))
	salesOrderLineID := uint(0)
	if route.SalesOrderLineID != nil {
		salesOrderLineID = *route.SalesOrderLineID
	}
	if route.RouteFamily != nil {
		scopeType = strings.ToUpper(strings.TrimSpace(route.RouteFamily.ScopeType))
		salesOrderLineID = productionRouteFamilySalesOrderLineID(*route.RouteFamily)
	}

	return ProductionRouteDTO{
		ID:                   route.ID,
		RouteFamilyID:        route.RouteFamilyID,
		RevisionNo:           route.RevisionNo,
		BasedOnRouteID:       productionRouteBasedOnRevisionID(route),
		IsCurrentRevision:    isCurrentRevision,
		CreatedAt:            route.CreatedAt,
		UpdatedAt:            route.UpdatedAt,
		Code:                 route.Code,
		Name:                 route.Name,
		ProductID:            route.ProductID,
		ProductSKU:           route.ProductSKU,
		ProductName:          route.ProductName,
		BOMOwnerType:         route.BOMOwnerType,
		BOMOwnerCustomerID:   route.BOMOwnerCustomerID,
		BOMOwnerCustomerName: route.BOMOwnerCustomerName,
		BOMVersionLevel:      route.BOMVersionLevel,
		ScopeType:            scopeType,
		SalesOrderLineID:     salesOrderLineID,
		Description:          route.Description,
		Version:              route.Version,
		Status:               route.Status,
		Steps:                steps,
	}
}

func productionRouteBasedOnRevisionID(route models.ProductionRoute) string {
	if route.BasedOnRouteID == nil {
		return ""
	}
	return strings.TrimSpace(*route.BasedOnRouteID)
}

func productionRouteBasedOnRevisionIDPointer(routeID string) *string {
	routeID = strings.TrimSpace(routeID)
	if routeID == "" {
		return nil
	}
	return &routeID
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
		RouteFamilyID:        strings.TrimSpace(route.RouteFamilyID),
		RevisionNo:           route.RevisionNo,
		BasedOnRouteID:       productionRouteBasedOnRevisionIDPointer(route.BasedOnRouteID),
		Code:                 route.Code,
		Name:                 route.Name,
		ProductID:            route.ProductID,
		ProductSKU:           route.ProductSKU,
		ProductName:          route.ProductName,
		BOMOwnerType:         route.BOMOwnerType,
		BOMOwnerCustomerID:   route.BOMOwnerCustomerID,
		BOMOwnerCustomerName: route.BOMOwnerCustomerName,
		BOMVersionLevel:      route.BOMVersionLevel,
		ScopeType:            strings.ToUpper(strings.TrimSpace(route.ScopeType)),
		SalesOrderLineID:     productionRouteSalesOrderLineIDPointer(route.SalesOrderLineID),
		Description:          route.Description,
		Version:              route.Version,
		Status:               route.Status,
		Steps:                steps,
	}
}

func mapProductionRoutesToDTO(routes []models.ProductionRoute) []ProductionRouteDTO {
	result := make([]ProductionRouteDTO, 0, len(routes))
	for _, route := range routes {
		result = append(result, mapProductionRouteToDTO(route))
	}
	return result
}
