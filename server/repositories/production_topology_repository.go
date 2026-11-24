package repositories

import (
	"errors"
	"fmt"
	"xdfc-server/models"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

var ErrProductionLineSegmentIdentityConflict = errors.New("production line L2 identity already exists")

type ProductionTopologyRepository interface {
	ListProductionLines(database *gorm.DB) ([]models.ProductionLine, error)
	GetProductionLineByID(database *gorm.DB, id string) (models.ProductionLine, error)
	DeleteLineSegmentsNotIn(database *gorm.DB, lineID string, segmentIDs []string) error
	BumpProductionLineVersion(database *gorm.DB, id string, version int64) (bool, error)
	SaveProductionLine(database *gorm.DB, line *models.ProductionLine, existing *models.ProductionLine) error
	DeleteProductionLine(database *gorm.DB, id string) error
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
		Preload("ProductTemplate").
		Preload("Segments", func(tx *gorm.DB) *gorm.DB {
			return tx.Order("sort_order asc")
		})
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

func (GormProductionRepository) SaveProductionLine(database *gorm.DB, line *models.ProductionLine, existing *models.ProductionLine) error {
	updateFields := map[string]interface{}{
		"name":                line.Name,
		"code":                line.Code,
		"product_template_id": line.ProductTemplateID,
		"description":         line.Description,
		"version":             line.Version,
		"is_active":           line.IsActive,
	}

	return database.Transaction(func(tx *gorm.DB) error {
		existingSegments := make(map[string]models.LineSegment)
		if existing == nil {
			if err := tx.Omit(clause.Associations).Create(line).Error; err != nil {
				return err
			}
		} else {
			result := tx.Model(line).Omit(clause.Associations).Updates(updateFields)
			if result.Error != nil {
				return result.Error
			}
			if result.RowsAffected != 1 {
				return gorm.ErrRecordNotFound
			}
			for _, segment := range existing.Segments {
				existingSegments[segment.ID] = segment
			}
		}
		for index := range line.Segments {
			segment := &line.Segments[index]
			segment.LineID = line.ID
			if previous, exists := existingSegments[segment.ID]; exists {
				segment.CreatedAt = previous.CreatedAt
				result := tx.Model(segment).Where("line_id = ?", line.ID).
					Select("Name", "ProductID", "ProductSKU", "ProductName", "BOMOwnerType", "BOMOwnerCustomerID", "BOMOwnerCustomerName",
						"BOMVersionLevel", "Description", "SortOrder", "Attributes", "UpdatedAt").Updates(segment)
				if result.Error != nil {
					return result.Error
				}
				if result.RowsAffected != 1 {
					return gorm.ErrRecordNotFound
				}
			} else {
				// DO NOTHING detects a concurrent insertion without upserting or transferring ownership.
				result := tx.Clauses(clause.OnConflict{Columns: []clause.Column{{Name: "id"}}, DoNothing: true}).Create(segment)
				if result.Error != nil {
					return result.Error
				}
				if result.RowsAffected != 1 {
					return fmt.Errorf("%w: %s", ErrProductionLineSegmentIdentityConflict, segment.ID)
				}
			}
		}
		return nil
	})
}

func (GormProductionRepository) DeleteProductionLine(database *gorm.DB, id string) error {
	result := database.Delete(&models.ProductionLine{}, "id = ?", id)
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected != 1 {
		return gorm.ErrRecordNotFound
	}
	return nil
}
