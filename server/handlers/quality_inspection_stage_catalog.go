package handlers

import (
	"net/http"
	"xdfc-server/services"

	"github.com/gin-gonic/gin"
)

func GetQualityInspectionStagesHandler(c *gin.Context) {
	stages, err := services.ListQualityInspectionStages()
	if err != nil {
		respondDomainError(c, err, "[SERVER] 读取检验站失败: ")
		return
	}
	c.JSON(http.StatusOK, stages)
}

func SaveQualityInspectionStageHandler(c *gin.Context) {
	var input services.SaveQualityInspectionStageRequest
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "检验站配置格式无效"})
		return
	}
	stage, err := services.SaveQualityInspectionStage(auditContextFromGin(c), c.Param("id"), input)
	if err != nil {
		respondDomainError(c, err, "[SERVER] 保存检验站失败: ")
		return
	}
	c.JSON(http.StatusOK, stage)
}
