package handlers

import (
	"net/http"
	"xdfc-server/db"
	"xdfc-server/models"
	"xdfc-server/services"

	"github.com/gin-gonic/gin"
)

// GetEnterpriseConfigHandler 获取企业配置 (单例模式)
func GetEnterpriseConfigHandler(c *gin.Context) {
	var config models.EnterpriseConfig
	if err := db.DB.First(&config).Error; err != nil {
		// 如果不存在，返回默认值
		defaultConfig := models.EnterpriseConfig{
			Name:    "",
			Plan:    "",
			LogoURL: services.DefaultEnterpriseLogoURL,
		}
		c.JSON(http.StatusOK, defaultConfig)
		return
	}
	services.ApplyEnterpriseConfigDefaults(&config)
	c.JSON(http.StatusOK, config)
}

// SaveEnterpriseConfigHandler 保存企业配置
func SaveEnterpriseConfigHandler(c *gin.Context) {
	var input models.EnterpriseConfig
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] 企业配置数据格式错误: " + err.Error()})
		return
	}

	if err := services.SaveEnterpriseConfig(auditContextFromGin(c), &input); err != nil {
		respondDomainError(c, err, "[SERVER] 保存企业配置失败: ")
		return
	}

	var updated models.EnterpriseConfig
	db.DB.First(&updated)
	services.ApplyEnterpriseConfigDefaults(&updated)
	c.JSON(http.StatusOK, updated)
}
