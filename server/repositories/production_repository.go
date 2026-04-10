package repositories

import (
	"strings"
	"xdfc-server/models"

	"gorm.io/gorm"
)

type ProductionRepository interface {
	ListProductionLines(database *gorm.DB) ([]models.ProductionLine, error)
	GetProductionLineByID(database *gorm.DB, id string) (models.ProductionLine, error)
	DeleteSegmentProcessMappingsNotIn(database *gorm.DB, lineID string, processIDs []string) error
	DeleteStationProcessMappingsNotIn(database *gorm.DB, lineID string, processIDs []string) error
	DeleteStationsNotIn(database *gorm.DB, lineID string, stationIDs []string) error
	DeleteJobCategoriesNotIn(database *gorm.DB, lineID string, categoryIDs []string) error
	DeleteLineSegmentsNotIn(database *gorm.DB, lineID string, segmentIDs []string) error
	BumpProductionLineVersion(database *gorm.DB, id string, version int64) (bool, error)
	SaveProductionLine(database *gorm.DB, line *models.ProductionLine) error
	DeleteProductionLine(database *gorm.DB, id string) error
	ListProcessSteps(database *gorm.DB) ([]models.ProcessStep, error)
	SaveProcessStep(database *gorm.DB, step *models.ProcessStep) error
	DeleteProcessStep(database *gorm.DB, id string) error
	AppendProcessToStation(database *gorm.DB, stationID string, processID string) error
	RemoveProcessFromStation(database *gorm.DB, stationID string, processID string) error
	ListStationsWithProcesses(database *gorm.DB) ([]models.Station, error)
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
		Preload("Segments.JobCategories", func(tx *gorm.DB) *gorm.DB {
			return tx.Order("sort_order asc")
		}).
		Preload("Segments.JobCategories.Stations", func(tx *gorm.DB) *gorm.DB {
			return tx.Order("sort_order asc")
		}).
		Preload("Segments.JobCategories.Stations.Processes", func(tx *gorm.DB) *gorm.DB {
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

func (GormProductionRepository) DeleteSegmentProcessMappingsNotIn(database *gorm.DB, lineID string, processIDs []string) error {
	query := database.Table("line_segment_process_mappings").Where(
		"line_segment_id IN (SELECT id FROM line_segments WHERE line_id = ?)",
		lineID,
	)
	if len(processIDs) > 0 {
		query = query.Not("process_step_id IN ?", processIDs)
	}
	return query.Delete(nil).Error
}

func (GormProductionRepository) DeleteStationProcessMappingsNotIn(database *gorm.DB, lineID string, processIDs []string) error {
	query := database.Table("station_process_mappings").Where(
		"station_id IN (SELECT stations.id FROM stations JOIN job_categories ON job_categories.id = stations.category_id JOIN line_segments ON line_segments.id = job_categories.segment_id WHERE line_segments.line_id = ?)",
		lineID,
	)
	if len(processIDs) > 0 {
		query = query.Not("process_step_id IN ?", processIDs)
	}
	return query.Delete(nil).Error
}

func (GormProductionRepository) DeleteStationsNotIn(database *gorm.DB, lineID string, stationIDs []string) error {
	query := database.Where(
		"category_id IN (SELECT job_categories.id FROM job_categories JOIN line_segments ON line_segments.id = job_categories.segment_id WHERE line_segments.line_id = ?)",
		lineID,
	)
	if len(stationIDs) > 0 {
		query = query.Not("id IN ?", stationIDs)
	}
	return query.Delete(&models.Station{}).Error
}

func (GormProductionRepository) DeleteJobCategoriesNotIn(database *gorm.DB, lineID string, categoryIDs []string) error {
	query := database.Where(
		"segment_id IN (SELECT id FROM line_segments WHERE line_id = ?)",
		lineID,
	)
	if len(categoryIDs) > 0 {
		query = query.Not("id IN ?", categoryIDs)
	}
	return query.Delete(&models.JobCategory{}).Error
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
	segmentToSave.JobCategories = nil
	if err := tx.Save(&segmentToSave).Error; err != nil {
		return err
	}

	segment.ID = segmentToSave.ID
	for categoryIndex := range segment.JobCategories {
		category := &segment.JobCategories[categoryIndex]
		category.SegmentID = segment.ID

		categoryToSave := *category
		categoryToSave.Stations = nil
		if err := tx.Save(&categoryToSave).Error; err != nil {
			return err
		}

		category.ID = categoryToSave.ID
		for stationIndex := range category.Stations {
			station := &category.Stations[stationIndex]
			station.CategoryID = category.ID

			stationToSave := *station
			stationToSave.Processes = nil
			if err := tx.Save(&stationToSave).Error; err != nil {
				return err
			}

			station.ID = stationToSave.ID
			stationModel := models.Station{BaseModel: models.BaseModel{ID: station.ID}}
			if err := tx.Model(&stationModel).Association("Processes").Replace(station.Processes); err != nil {
				return err
			}
		}
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

func (GormProductionRepository) AppendProcessToStation(database *gorm.DB, stationID string, processID string) error {
	station := models.Station{BaseModel: models.BaseModel{ID: stationID}}
	process := models.ProcessStep{BaseModel: models.BaseModel{ID: processID}}
	return database.Model(&station).Association("Processes").Append(&process)
}

func (GormProductionRepository) RemoveProcessFromStation(database *gorm.DB, stationID string, processID string) error {
	station := models.Station{BaseModel: models.BaseModel{ID: stationID}}
	process := models.ProcessStep{BaseModel: models.BaseModel{ID: processID}}
	return database.Model(&station).Association("Processes").Delete(&process)
}

func (GormProductionRepository) ListStationsWithProcesses(database *gorm.DB) ([]models.Station, error) {
	var stations []models.Station
	err := database.Preload("Processes").Find(&stations).Error
	return stations, err
}
