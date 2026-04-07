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
	err := database.Order("code asc").
		Preload("Segments", func(tx *gorm.DB) *gorm.DB {
			return tx.Order("sort_order asc")
		}).
		Preload("Segments.Processes", func(tx *gorm.DB) *gorm.DB {
			return tx.Distinct("process_steps.id", "process_steps.created_at", "process_steps.updated_at", "process_steps.deleted_at", "process_steps.code", "process_steps.name", "process_steps.description", "process_steps.sort_order", "process_steps.is_active").Order("sort_order asc")
		}).
		Find(&lines).Error
	return lines, err
}

func (GormProductionRepository) GetProductionLineByID(database *gorm.DB, id string) (models.ProductionLine, error) {
	var line models.ProductionLine
	err := database.
		Preload("Segments", func(tx *gorm.DB) *gorm.DB {
			return tx.Order("sort_order asc")
		}).
		Preload("Segments.Processes", func(tx *gorm.DB) *gorm.DB {
			return tx.Distinct("process_steps.id", "process_steps.created_at", "process_steps.updated_at", "process_steps.deleted_at", "process_steps.code", "process_steps.name", "process_steps.description", "process_steps.sort_order", "process_steps.is_active").Order("sort_order asc")
		}).
		First(&line, "id = ?", id).Error
	return line, err
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
	// 1. 局部更新主表，防止 CreatedAt, UpdatedBy 等元数据被覆盖
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
				line.Segments[index].LineID = line.ID
				segment := &line.Segments[index]
				segmentToSave := *segment
				segmentToSave.Processes = nil
				if err := tx.Save(&segmentToSave).Error; err != nil {
					return err
				}
				segment.ID = segmentToSave.ID
				if segment.ID != "" {
					segmentModel := models.LineSegment{BaseModel: models.BaseModel{ID: segment.ID}}
					if err := tx.Model(&segmentModel).Association("Processes").Replace(segment.Processes); err != nil {
						return err
					}
				}
			}
			return nil
		})
	}

	// 2. 更新场景：使用事务确保主表与关联同步
	return database.Transaction(func(tx *gorm.DB) error {
		// 更新基础信息
		if err := tx.Model(line).Updates(updateFields).Error; err != nil {
			return err
		}

		// 处理工段关联 (GORM 会自动处理删除不在列表中的 Segments)
		if err := tx.Session(&gorm.Session{FullSaveAssociations: true}).Model(line).Association("Segments").Replace(line.Segments); err != nil {
			return err
		}

		// 处理工序多对多关联的深度清理 (针对每个工段)
		for _, segment := range line.Segments {
			if segment.ID != "" {
				segmentToSave := segment
				segmentToSave.Processes = nil
				if err := tx.Save(&segmentToSave).Error; err != nil {
					return err
				}
				segmentModel := models.LineSegment{BaseModel: models.BaseModel{ID: segment.ID}}
				if err := tx.Model(&segmentModel).Association("Processes").Replace(segment.Processes); err != nil {
					return err
				}
			}
		}

		return nil
	})
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
