package repositories

import (
	"xdfc-server/models"

	"gorm.io/gorm"
)

type ProductionLineRepository interface {
	ListProductionLines(database *gorm.DB) ([]models.ProductionLine, error)
	GetProductionLineByID(database *gorm.DB, id string) (models.ProductionLine, error)
	BumpProductionLineVersion(database *gorm.DB, id string, version int64) (bool, error)
	SaveProductionLine(database *gorm.DB, line *models.ProductionLine, existing *models.ProductionLine) error
	DeleteProductionLine(database *gorm.DB, id string) error
}

func (GormProductionRepository) ListProductionLines(database *gorm.DB) ([]models.ProductionLine, error) {
	var lines []models.ProductionLine
	err := database.Order("code asc").Find(&lines).Error
	return lines, err
}

func (GormProductionRepository) GetProductionLineByID(database *gorm.DB, id string) (models.ProductionLine, error) {
	var line models.ProductionLine
	err := database.First(&line, "id = ?", id).Error
	return line, err
}

func (GormProductionRepository) BumpProductionLineVersion(database *gorm.DB, id string, version int64) (bool, error) {
	result := database.Model(&models.ProductionLine{}).
		Where("id = ? AND version = ?", id, version).
		Update("version", gorm.Expr("version + 1"))
	return result.RowsAffected > 0, result.Error
}

func (GormProductionRepository) SaveProductionLine(database *gorm.DB, line *models.ProductionLine, existing *models.ProductionLine) error {
	updateFields := map[string]interface{}{
		"name":        line.Name,
		"code":        line.Code,
		"description": line.Description,
		"version":     line.Version,
		"is_active":   line.IsActive,
	}

	if existing == nil {
		return database.Create(line).Error
	}
	result := database.Model(line).Updates(updateFields)
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected != 1 {
		return gorm.ErrRecordNotFound
	}
	return nil
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
