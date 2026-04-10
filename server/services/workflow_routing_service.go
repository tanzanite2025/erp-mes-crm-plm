package services

import (
	"errors"
	"strings"
	"xdfc-server/db"
	"xdfc-server/models"

	"gorm.io/gorm"
)

var (
	ErrStandardCommandNotFound  = errors.New("standard command not found")
	ErrNotificationRuleNotFound = errors.New("notification rule not found")
)

func ListStandardCommands() ([]models.StandardCommand, error) {
	var commands []models.StandardCommand
	if err := db.DB.Order("created_at desc").Find(&commands).Error; err != nil {
		return nil, err
	}
	return commands, nil
}

func CreateStandardCommand(command models.StandardCommand) (models.StandardCommand, error) {
	if err := db.DB.Create(&command).Error; err != nil {
		return models.StandardCommand{}, err
	}
	return command, nil
}

func UpdateStandardCommand(id string, patch models.StandardCommand) (models.StandardCommand, error) {
	id = strings.TrimSpace(id)
	var existing models.StandardCommand
	if err := db.DB.Where("id = ?", id).First(&existing).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return models.StandardCommand{}, ErrStandardCommandNotFound
		}
		return models.StandardCommand{}, err
	}

	if err := db.DB.Model(&existing).Updates(patch).Error; err != nil {
		return models.StandardCommand{}, err
	}
	if err := db.DB.First(&existing, "id = ?", id).Error; err != nil {
		return models.StandardCommand{}, err
	}
	return existing, nil
}

func DeleteStandardCommand(id string) error {
	id = strings.TrimSpace(id)
	return db.DB.Where("id = ?", id).Delete(&models.StandardCommand{}).Error
}

func ListNotificationRules() ([]models.NotificationRule, error) {
	var rules []models.NotificationRule
	if err := db.DB.Order("created_at desc").Find(&rules).Error; err != nil {
		return nil, err
	}
	return rules, nil
}

func CreateNotificationRule(rule models.NotificationRule) (models.NotificationRule, error) {
	if err := db.DB.Create(&rule).Error; err != nil {
		return models.NotificationRule{}, err
	}
	return rule, nil
}

func UpdateNotificationRule(id string, patch models.NotificationRule) (models.NotificationRule, error) {
	id = strings.TrimSpace(id)
	var existing models.NotificationRule
	if err := db.DB.Where("id = ?", id).First(&existing).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return models.NotificationRule{}, ErrNotificationRuleNotFound
		}
		return models.NotificationRule{}, err
	}

	if err := db.DB.Model(&existing).Updates(patch).Error; err != nil {
		return models.NotificationRule{}, err
	}
	if err := db.DB.First(&existing, "id = ?", id).Error; err != nil {
		return models.NotificationRule{}, err
	}
	return existing, nil
}

func DeleteNotificationRule(id string) error {
	id = strings.TrimSpace(id)
	return db.DB.Where("id = ?", id).Delete(&models.NotificationRule{}).Error
}
