package handlers

import (
	"net/http"
	"xdfc-server/services"

	"github.com/gin-gonic/gin"
)

func GetQualityDefectTypesHandler(c *gin.Context) {
	defectTypes, err := services.ListQualityDefectTypes()
	if err != nil {
		respondDomainError(c, err, "[SERVER] 读取异常点失败: ")
		return
	}
	c.JSON(http.StatusOK, defectTypes)
}

func SaveQualityDefectTypeHandler(c *gin.Context) {
	var input services.SaveQualityDefectTypeRequest
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "异常点配置格式无效"})
		return
	}
	defectType, err := services.SaveQualityDefectType(auditContextFromGin(c), c.Param("id"), input)
	if err != nil {
		respondDomainError(c, err, "[SERVER] 保存异常点失败: ")
		return
	}
	c.JSON(http.StatusOK, defectType)
}

func GetQualityInspectionStageDefectTypeBindingsHandler(c *gin.Context) {
	bindings, err := services.GetQualityInspectionStageDefectTypeBindings(c.Param("id"))
	if err != nil {
		respondDomainError(c, err, "[SERVER] 读取检验站异常点绑定失败: ")
		return
	}
	c.JSON(http.StatusOK, bindings)
}

func ReplaceQualityInspectionStageDefectTypeBindingsHandler(c *gin.Context) {
	var input services.ReplaceQualityInspectionStageDefectTypeBindingsRequest
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "检验站异常点绑定格式无效"})
		return
	}
	bindings, err := services.ReplaceQualityInspectionStageDefectTypeBindings(auditContextFromGin(c), c.Param("id"), input)
	if err != nil {
		respondDomainError(c, err, "[SERVER] 保存检验站异常点绑定失败: ")
		return
	}
	c.JSON(http.StatusOK, bindings)
}
