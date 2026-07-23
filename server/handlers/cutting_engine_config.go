package handlers

import (
	"net/http"
	"xdfc-server/db"
	"xdfc-server/services"

	"github.com/gin-gonic/gin"
)

func GetCuttingEngineConfigHandler(c *gin.Context) {
	config, err := services.LoadCuttingEngineConfig(db.DB)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] 获取裁纱引擎配置失败"})
		return
	}

	c.JSON(http.StatusOK, config)
}

func UpdateCuttingEngineConfigHandler(c *gin.Context) {
	var input services.CuttingEngineConfigInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] 裁纱引擎配置格式错误"})
		return
	}

	saved, err := services.SaveCuttingEngineConfig(auditContextFromGin(c), db.DB, input)
	if err != nil {
		respondDomainError(c, err, "[SERVER] 保存裁纱引擎配置失败: ")
		return
	}

	c.JSON(http.StatusOK, saved)
}
