package handlers

import (
	"encoding/json"
	"errors"
	"net/http"
	"xdfc-server/db"
	"xdfc-server/models"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// GetSystemConfigsHandler returns all system configs.
func GetSystemConfigsHandler(c *gin.Context) {
	var configs []models.SystemConfig
	if err := db.DB.Order("key asc").Find(&configs).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "获取系统配置失败"})
		return
	}
	c.JSON(http.StatusOK, configs)
}

func buildSystemConfigUpdates(payload map[string]json.RawMessage) (map[string]interface{}, error) {
	updates := make(map[string]interface{})
	for key, raw := range payload {
		switch key {
		case "value", "label", "description":
			var value string
			if err := json.Unmarshal(raw, &value); err != nil {
				return nil, err
			}
			updates[key] = value
		case "key":
			// Primary Key cannot be changed via update
		default:
			// IGNORED
		}
	}
	return updates, nil
}

func saveSystemConfigRecord(config *models.SystemConfig) error {
	var existing models.SystemConfig
	err := db.DB.First(&existing, "key = ?", config.Key).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return db.DB.Create(config).Error
	}
	if err != nil {
		return err
	}

	updates := map[string]interface{}{
		"value":       config.Value,
		"label":       config.Label,
		"description": config.Description,
	}

	return db.DB.Model(&existing).Updates(updates).Error
}

// UpdateSystemConfigHandler upserts one system config item.
func UpdateSystemConfigHandler(c *gin.Context) {
	payload, body, err := decodeJSONBodyMap(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] 无效的 JSON 映射"})
		return
	}

	rawKey, ok := payload["key"]
	if !ok || string(rawKey) == "null" || string(rawKey) == `""` {
		c.JSON(http.StatusBadRequest, gin.H{"error": "配置键不能为空"})
		return
	}

	var key string
	if err := json.Unmarshal(rawKey, &key); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] 无效的 KEY 格式"})
		return
	}

	var existing models.SystemConfig
	err = db.DB.First(&existing, "key = ?", key).Error
	if err == nil {
		// Update existing
		updates, err := buildSystemConfigUpdates(payload)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		if err := db.DB.Model(&existing).Updates(updates).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "差分保存配置失败"})
			return
		}
		c.JSON(http.StatusOK, existing)
		return
	}

	// Create new
	var config models.SystemConfig
	if err := json.Unmarshal(body, &config); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "参数错误"})
		return
	}

	if err := db.DB.Create(&config).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "创建配置失败"})
		return
	}

	c.JSON(http.StatusOK, config)
}

// GetConfigValue returns config value with fallback.
func GetConfigValue(tx *gorm.DB, key string, defaultValue string) string {
	var config models.SystemConfig
	if err := tx.Where("key = ?", key).First(&config).Error; err != nil {
		return defaultValue
	}
	return config.Value
}
