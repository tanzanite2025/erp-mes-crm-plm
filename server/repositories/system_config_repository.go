package repositories

import (
	"errors"
	"xdfc-server/models"

	"gorm.io/gorm"
)

type SystemConfigRepository interface {
	GetSystemConfigValue(database *gorm.DB, key string, defaultValue string) (string, error)
}

type GormSystemConfigRepository struct{}

func NewSystemConfigRepository() SystemConfigRepository {
	return GormSystemConfigRepository{}
}

func (GormSystemConfigRepository) GetSystemConfigValue(database *gorm.DB, key string, defaultValue string) (string, error) {
	var config models.SystemConfig
	if err := database.Where("key = ?", key).First(&config).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return defaultValue, nil
		}
		return "", err
	}
	return config.Value, nil
}
