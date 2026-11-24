package services

import (
	"errors"
	"fmt"
	"strings"
	"time"
	"xdfc-server/audit"
	"xdfc-server/models"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type ProductionWorkLocationDTO struct {
	ID          string    `json:"id"`
	CreatedAt   time.Time `json:"createdAt"`
	UpdatedAt   time.Time `json:"updatedAt"`
	Code        string    `json:"code"`
	Name        string    `json:"name"`
	Description string    `json:"description"`
	IsActive    bool      `json:"isActive"`
	Version     int64     `json:"version"`
}

type ProductionWorkLocationsResponse struct {
	Items []ProductionWorkLocationDTO `json:"items"`
}

type SaveProductionWorkLocationRequest struct {
	Location ProductionWorkLocationDTO
	Operator string
	IP       string
}

var defaultProductionWorkLocationService = NewProductionWorkLocationCatalogService(defaultServiceRuntime().txManager)

type ProductionWorkLocationCatalogService struct {
	txManager transactionManager
}

func NewProductionWorkLocationCatalogService(txManager transactionManager) *ProductionWorkLocationCatalogService {
	return &ProductionWorkLocationCatalogService{txManager: txManager}
}

func ListProductionWorkLocations() (ProductionWorkLocationsResponse, error) {
	return defaultProductionWorkLocationService.ListProductionWorkLocations()
}

func SaveProductionWorkLocation(request SaveProductionWorkLocationRequest) (ProductionWorkLocationDTO, error) {
	return defaultProductionWorkLocationService.SaveProductionWorkLocation(request)
}

func (service *ProductionWorkLocationCatalogService) ListProductionWorkLocations() (ProductionWorkLocationsResponse, error) {
	var locations []models.ProductionWorkLocation
	if err := service.txManager.DB().Order("name asc, code asc, id asc").Find(&locations).Error; err != nil {
		return ProductionWorkLocationsResponse{}, fmt.Errorf("failed to list production work locations: %w", err)
	}
	response := ProductionWorkLocationsResponse{Items: make([]ProductionWorkLocationDTO, 0, len(locations))}
	for _, location := range locations {
		response.Items = append(response.Items, mapProductionWorkLocationToDTO(location))
	}
	return response, nil
}

func (service *ProductionWorkLocationCatalogService) SaveProductionWorkLocation(request SaveProductionWorkLocationRequest) (ProductionWorkLocationDTO, error) {
	location := normalizeProductionWorkLocationDTO(request.Location)
	if location.Code == "" || location.Name == "" {
		return ProductionWorkLocationDTO{}, fmt.Errorf("%w: code and name are required", ErrInvalidProductionWorkLocation)
	}
	if location.ID == "" {
		location.ID = uuid.NewString()
		location.Version = 1
	} else if location.Version < 1 {
		return ProductionWorkLocationDTO{}, fmt.Errorf("%w: version is required when updating", ErrInvalidProductionWorkLocation)
	}

	err := service.txManager.WithinTransaction(func(tx *gorm.DB) error {
		var before *ProductionWorkLocationDTO
		action := audit.AuditActionCreate
		var existing models.ProductionWorkLocation
		err := tx.First(&existing, "id = ?", location.ID).Error
		if err == nil {
			if existing.Version != location.Version {
				return ErrProductionWorkLocationVersionConflict
			}
			mappedBefore := mapProductionWorkLocationToDTO(existing)
			before = &mappedBefore
			location.CreatedAt = existing.CreatedAt
			location.Version++
			action = audit.AuditActionUpdate
		} else if !errors.Is(err, gorm.ErrRecordNotFound) {
			return err
		}

		model := mapProductionWorkLocationDTOToModel(location)
		if err := tx.Save(&model).Error; err != nil {
			return err
		}
		location = mapProductionWorkLocationToDTO(model)
		event := audit.NewAuditEvent(
			audit.AuditEntityProductionWorkLocation,
			location.ID,
			action,
			audit.AuditActor{Username: strings.TrimSpace(request.Operator), IP: strings.TrimSpace(request.IP), Source: "http"},
		)
		if before != nil {
			event = event.WithChanges(audit.DiffModelValues(*before, location)...)
		}
		return recordAuditEventTx(tx, event.Normalize())
	})
	return location, err
}

func normalizeProductionWorkLocationDTO(location ProductionWorkLocationDTO) ProductionWorkLocationDTO {
	location.ID = strings.TrimSpace(location.ID)
	location.Code = strings.ToUpper(strings.TrimSpace(location.Code))
	location.Name = strings.TrimSpace(location.Name)
	location.Description = strings.TrimSpace(location.Description)
	return location
}

func mapProductionWorkLocationDTOToModel(location ProductionWorkLocationDTO) models.ProductionWorkLocation {
	return models.ProductionWorkLocation{
		BaseModel: models.BaseModel{ID: location.ID, CreatedAt: location.CreatedAt, UpdatedAt: location.UpdatedAt},
		Code:      location.Code, Name: location.Name, Description: location.Description,
		IsActive: location.IsActive, Version: location.Version,
	}
}

func mapProductionWorkLocationToDTO(location models.ProductionWorkLocation) ProductionWorkLocationDTO {
	return ProductionWorkLocationDTO{
		ID: strings.TrimSpace(location.ID), CreatedAt: location.CreatedAt, UpdatedAt: location.UpdatedAt,
		Code: strings.TrimSpace(location.Code), Name: strings.TrimSpace(location.Name),
		Description: strings.TrimSpace(location.Description), IsActive: location.IsActive, Version: location.Version,
	}
}

func validateProductionWorkLocationIsActiveTx(tx *gorm.DB, locationID string) error {
	var location models.ProductionWorkLocation
	if err := tx.Where("id = ?", normalizeProductionExecutionUUIDIdentity(locationID)).First(&location).Error; err != nil {
		return fmt.Errorf("%w: productionWorkLocationId does not exist", ErrInvalidProductionOperationExecution)
	}
	if !location.IsActive {
		return fmt.Errorf("%w: productionWorkLocationId is inactive", ErrInvalidProductionOperationExecution)
	}
	return nil
}
