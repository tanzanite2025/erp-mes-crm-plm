package handlers

import (
	"encoding/json"
	"errors"
	"net/http"
	"strings"
	"xdfc-server/db"
	"xdfc-server/models"
	"xdfc-server/services"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

func GetLinearBarcodeProtocolConfigHandler(c *gin.Context) {
	config, err := services.LoadLinearBarcodeProtocolConfig(db.DB)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] 获取一维码协议配置失败"})
		return
	}

	c.JSON(http.StatusOK, config)
}

func UpdateLinearBarcodeProtocolConfigHandler(c *gin.Context) {
	var input services.LinearBarcodeProtocolConfig
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] 一维码协议配置格式错误"})
		return
	}

	normalized := services.NormalizeLinearBarcodeProtocolConfig(input)
	if strings.TrimSpace(normalized.SequenceRuleKey) == "" || len(normalized.Rules) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] 一维码协议配置不完整"})
		return
	}

	payload, err := json.Marshal(normalized)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] 一维码协议配置序列化失败"})
		return
	}

	record := models.SystemConfig{
		Key:         services.LinearBarcodeProtocolConfigKey,
		Value:       string(payload),
		Label:       "Linear Barcode Protocol",
		Description: "Persisted code128 wheel barcode protocol config used by management and PDA ingest clients.",
	}

	var existing models.SystemConfig
	err = db.DB.Where("key = ?", services.LinearBarcodeProtocolConfigKey).First(&existing).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		if err := db.DB.Create(&record).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] 创建一维码协议配置失败"})
			return
		}
	} else if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] 数据库查询失败"})
		return
	} else {
		if err := db.DB.Model(&existing).Updates(map[string]interface{}{
			"value":       record.Value,
			"label":       record.Label,
			"description": record.Description,
		}).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] 更新一维码协议配置失败"})
			return
		}
	}

	c.JSON(http.StatusOK, normalized)
}
