package repositories

import (
	"xdfc-server/models"

	"gorm.io/gorm"
)

type ProductionProcessRepository interface {
	ListProcessSteps(database *gorm.DB) ([]models.ProcessStep, error)
	SaveProcessStep(database *gorm.DB, step *models.ProcessStep) error
	DeleteProcessStep(database *gorm.DB, id string) error
}

func (GormProductionRepository) ListProcessSteps(database *gorm.DB) ([]models.ProcessStep, error) {
	var steps []models.ProcessStep
	err := database.
		Order("sort_order asc").
		Find(&steps).Error
	return steps, err
}

func (GormProductionRepository) SaveProcessStep(database *gorm.DB, step *models.ProcessStep) error {
	return database.Save(step).Error
}

func (GormProductionRepository) DeleteProcessStep(database *gorm.DB, id string) error {
	return database.Delete(&models.ProcessStep{}, "id = ?", id).Error
}
