package repositories

import (
	"strings"
	"xdfc-server/models"

	"gorm.io/gorm"
)

type ProductionRepository interface {
	ListProductionLines(database *gorm.DB) ([]models.ProductionLine, error)
	GetProductionLineByID(database *gorm.DB, id string) (models.ProductionLine, error)
	ListProductionRoutes(database *gorm.DB) ([]models.ProductionRoute, error)
	GetProductionRouteByID(database *gorm.DB, id string) (models.ProductionRoute, error)
	BumpProductionRouteVersion(database *gorm.DB, id string, version int64) (bool, error)
	SaveProductionRoute(database *gorm.DB, route *models.ProductionRoute) error
	DeleteProductionRoute(database *gorm.DB, id string) error
	DeleteProductionRouteStepsNotIn(database *gorm.DB, routeID string, stepIDs []string) error
	DeleteLineSegmentProcessMappingsNotIn(database *gorm.DB, lineID string, processIDs []string) error
	DeleteLineSegmentsNotIn(database *gorm.DB, lineID string, segmentIDs []string) error
	BumpProductionLineVersion(database *gorm.DB, id string, version int64) (bool, error)
	SaveProductionLine(database *gorm.DB, line *models.ProductionLine) error
	DeleteProductionLine(database *gorm.DB, id string) error
	ListProcessSteps(database *gorm.DB) ([]models.ProcessStep, error)
	SaveProcessStep(database *gorm.DB, step *models.ProcessStep) error
	DeleteProcessStep(database *gorm.DB, id string) error
}

type GormProductionRepository struct{}

func NewProductionRepository() ProductionRepository {
	return GormProductionRepository{}
}

func (GormProductionRepository) ListProductionLines(database *gorm.DB) ([]models.ProductionLine, error) {
	var lines []models.ProductionLine
	err := preloadProductionLineHierarchy(database.Order("code asc")).Find(&lines).Error
	return lines, err
}

func (GormProductionRepository) GetProductionLineByID(database *gorm.DB, id string) (models.ProductionLine, error) {
	var line models.ProductionLine
	err := preloadProductionLineHierarchy(database).First(&line, "id = ?", id).Error
	return line, err
}

func preloadProductionLineHierarchy(database *gorm.DB) *gorm.DB {
	return database.
		Preload("Segments", func(tx *gorm.DB) *gorm.DB {
			return tx.Order("sort_order asc")
		}).
		Preload("Segments.Processes", func(tx *gorm.DB) *gorm.DB {
			return tx.Distinct(
				"process_steps.id",
				"process_steps.created_at",
				"process_steps.updated_at",
				"process_steps.deleted_at",
				"process_steps.code",
				"process_steps.name",
				"process_steps.description",
				"process_steps.sort_order",
				"process_steps.is_active",
			).Order("sort_order asc")
		})
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
		return database.Transaction(func(tx *gorm.DB) error {
			routeToCreate := *route
			routeToCreate.Steps = nil
			if err := tx.Create(&routeToCreate).Error; err != nil {
				return err
			}

			route.ID = routeToCreate.ID
			for index := range route.Steps {
				route.Steps[index].RouteID = route.ID
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

func (GormProductionRepository) DeleteLineSegmentProcessMappingsNotIn(database *gorm.DB, lineID string, processIDs []string) error {
	query := database.Table("line_segment_process_mappings").Where(
		"line_segment_id IN (SELECT id FROM line_segments WHERE line_id = ?)",
		lineID,
	)
	if len(processIDs) > 0 {
		query = query.Not("process_step_id IN ?", processIDs)
	}
	return query.Delete(nil).Error
}

func (GormProductionRepository) DeleteLineSegmentsNotIn(database *gorm.DB, lineID string, segmentIDs []string) error {
	query := database.Where("line_id = ?", lineID)
	if len(segmentIDs) > 0 {
		query = query.Not("id IN ?", segmentIDs)
	}
	return query.Delete(&models.LineSegment{}).Error
}

func (GormProductionRepository) BumpProductionLineVersion(database *gorm.DB, id string, version int64) (bool, error) {
	result := database.Model(&models.ProductionLine{}).
		Where("id = ? AND version = ?", id, version).
		Update("version", gorm.Expr("version + 1"))
	return result.RowsAffected > 0, result.Error
}

func (GormProductionRepository) SaveProductionLine(database *gorm.DB, line *models.ProductionLine) error {
	updateFields := map[string]interface{}{
		"name":        line.Name,
		"code":        line.Code,
		"description": line.Description,
		"version":     line.Version,
		"is_active":   line.IsActive,
	}

	for index := range line.Segments {
		line.Segments[index].LineID = line.ID
	}

	shouldCreate := line.ID == "" || strings.HasPrefix(line.ID, "temp-")
	if !shouldCreate {
		var existingCount int64
		if err := database.Model(&models.ProductionLine{}).Where("id = ?", line.ID).Count(&existingCount).Error; err != nil {
			return err
		}
		shouldCreate = existingCount == 0
	}

	if shouldCreate {
		return database.Transaction(func(tx *gorm.DB) error {
			lineToCreate := *line
			lineToCreate.Segments = nil
			if err := tx.Create(&lineToCreate).Error; err != nil {
				return err
			}

			line.ID = lineToCreate.ID
			for index := range line.Segments {
				if err := saveLineSegmentHierarchy(tx, &line.Segments[index], line.ID); err != nil {
					return err
				}
			}

			return nil
		})
	}

	return database.Transaction(func(tx *gorm.DB) error {
		if err := tx.Model(line).Updates(updateFields).Error; err != nil {
			return err
		}

		for index := range line.Segments {
			if err := saveLineSegmentHierarchy(tx, &line.Segments[index], line.ID); err != nil {
				return err
			}
		}

		return nil
	})
}

func saveLineSegmentHierarchy(tx *gorm.DB, segment *models.LineSegment, lineID string) error {
	segment.LineID = lineID

	segmentToSave := *segment
	segmentToSave.Processes = nil
	if err := tx.Save(&segmentToSave).Error; err != nil {
		return err
	}

	segment.ID = segmentToSave.ID
	segmentModel := models.LineSegment{BaseModel: models.BaseModel{ID: segment.ID}}
	if err := tx.Model(&segmentModel).Association("Processes").Replace(segment.Processes); err != nil {
		return err
	}

	return nil
}

func (GormProductionRepository) DeleteProductionLine(database *gorm.DB, id string) error {
	return database.Delete(&models.ProductionLine{}, "id = ?", id).Error
}

func (GormProductionRepository) ListProcessSteps(database *gorm.DB) ([]models.ProcessStep, error) {
	var steps []models.ProcessStep
	err := database.Order("sort_order asc").Find(&steps).Error
	return steps, err
}

func (GormProductionRepository) SaveProcessStep(database *gorm.DB, step *models.ProcessStep) error {
	return database.Save(step).Error
}

func (GormProductionRepository) DeleteProcessStep(database *gorm.DB, id string) error {
	return database.Delete(&models.ProcessStep{}, "id = ?", id).Error
}
