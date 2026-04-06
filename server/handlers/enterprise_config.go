package handlers

import (
	"net/http"
	"xdfc-server/db"
	"xdfc-server/models"

	"github.com/gin-gonic/gin"
)

// GetEnterpriseConfigHandler 获取企业配置 (单例模式)
func GetEnterpriseConfigHandler(c *gin.Context) {
	var config models.EnterpriseConfig
	if err := db.DB.First(&config).Error; err != nil {
		// 如果不存在，返回默认值
		defaultConfig := models.EnterpriseConfig{
			Name: "",
			Plan: "",
		}
		c.JSON(http.StatusOK, defaultConfig)
		return
	}
	c.JSON(http.StatusOK, config)
}

// SaveEnterpriseConfigHandler 保存企业配置
func SaveEnterpriseConfigHandler(c *gin.Context) {
	var input models.EnterpriseConfig
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] 企业配置数据格式错误: " + err.Error()})
		return
	}

	var existing models.EnterpriseConfig
	if err := db.DB.First(&existing).Error; err != nil {
		// 创建新纪录
		if err := db.DB.Create(&input).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] 创建企业配置失败: " + err.Error()})
			return
		}
		c.JSON(http.StatusOK, input)
		return
	}

	// 更新现有记录
	if err := db.DB.Model(&existing).Updates(input).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] 更新企业配置失败: " + err.Error()})
		return
	}

	db.DB.First(&existing)
	c.JSON(http.StatusOK, existing)
}
