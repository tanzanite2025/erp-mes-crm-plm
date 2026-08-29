package repositories

import (
	"strings"
	"xdfc-server/models"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type ProductionRouteRepository interface {
	ListProductionRoutes(database *gorm.DB) ([]models.ProductionRoute, error)
	GetProductionRouteByID(database *gorm.DB, id string) (models.ProductionRoute, error)
	BumpProductionRouteVersion(database *gorm.DB, id string, version int64) (bool, error)
	SaveProductionRoute(database *gorm.DB, route *models.ProductionRoute) error
	DeleteProductionRoute(database *gorm.DB, id string) error
	DeleteProductionRouteStepsNotIn(database *gorm.DB, routeID string, stepIDs []string) error
}

func (GormProductionRepository) ListProductionRoutes(database *gorm.DB) ([]models.ProductionRoute, error) {
	var routes []models.ProductionRoute
	err := preloadProductionRouteSteps(database.Order("code asc")).Find(&routes).Error
	return routes, err
}

func (GormProductionRepository) GetProductionRouteByID(database *gorm.DB, id string) (models.ProductionRoute, error) {
	var route models.ProductionRoute
	err := preloadProductionRouteSteps(database).First(&route, "id = ?", id).Error
	return route, err
}

func preloadProductionRouteSteps(database *gorm.DB) *gorm.DB {
	return database.
		Preload("Steps", func(tx *gorm.DB) *gorm.DB {
			return tx.Order("sequence asc")
		}).
		Preload("Steps.ProcessStep").
		Preload("Steps.Segment")
}

func (GormProductionRepository) BumpProductionRouteVersion(database *gorm.DB, id string, version int64) (bool, error) {
	result := database.Model(&models.ProductionRoute{}).
		Where("id = ? AND version = ?", id, version).
		Update("version", gorm.Expr("version + 1"))
	return result.RowsAffected > 0, result.Error
}

func (GormProductionRepository) SaveProductionRoute(database *gorm.DB, route *models.ProductionRoute) error {
	updateFields := map[string]interface{}{
		"code":                route.Code,
		"name":                route.Name,
		"product_id":          route.ProductID,
		"product_name":        route.ProductName,
		"product_template_id": route.ProductTemplateID,
		"description":         route.Description,
		"version":             route.Version,
		"status":              route.Status,
	}

	for index := range route.Steps {
		route.Steps[index].RouteID = route.ID
	}

	shouldCreate := route.ID == "" || strings.HasPrefix(route.ID, "temp-")
	if !shouldCreate {
		var existingCount int64
		if err := database.Model(&models.ProductionRoute{}).Where("id = ?", route.ID).Count(&existingCount).Error; err != nil {
			return err
		}
		shouldCreate = existingCount == 0
	}

	if shouldCreate {
		if route.ID == "" || strings.HasPrefix(route.ID, "temp-") {
			route.ID = uuid.NewString()
		}

		return database.Transaction(func(tx *gorm.DB) error {
			routeToCreate := *route
			routeToCreate.Steps = nil
			if err := tx.Create(&routeToCreate).Error; err != nil {
				return err
			}

			route.ID = routeToCreate.ID
			for index := range route.Steps {
				route.Steps[index].RouteID = route.ID
				if route.Steps[index].ID == "" || strings.HasPrefix(route.Steps[index].ID, "temp-") {
					route.Steps[index].ID = uuid.NewString()
				}
				if err := tx.Save(&route.Steps[index]).Error; err != nil {
					return err
				}
			}

			return nil
		})
	}

	return database.Transaction(func(tx *gorm.DB) error {
		if err := tx.Model(route).Updates(updateFields).Error; err != nil {
			return err
		}

		for index := range route.Steps {
			route.Steps[index].RouteID = route.ID
			if route.Steps[index].ID == "" || strings.HasPrefix(route.Steps[index].ID, "temp-") {
				route.Steps[index].ID = uuid.NewString()
			}
			if err := tx.Save(&route.Steps[index]).Error; err != nil {
				return err
			}
		}

		return nil
	})
}

func (GormProductionRepository) DeleteProductionRoute(database *gorm.DB, id string) error {
	return database.Delete(&models.ProductionRoute{}, "id = ?", id).Error
}

func (GormProductionRepository) DeleteProductionRouteStepsNotIn(database *gorm.DB, routeID string, stepIDs []string) error {
	query := database.Where("route_id = ?", routeID)
	if len(stepIDs) > 0 {
		query = query.Not("id IN ?", stepIDs)
	}
	return query.Delete(&models.ProductionRouteStep{}).Error
}
