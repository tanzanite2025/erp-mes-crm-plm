package handlers

import (
	"errors"
	"net/http"
	"xdfc-server/models"
	"xdfc-server/services"

	"github.com/gin-gonic/gin"
)

func SolveRawMaterialBatchOptimizerHandler(c *gin.Context) {
	var input models.RawMaterialBatchOptimizerSolveRequest
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] 拆批优化请求格式错误: " + err.Error()})
		return
	}

	response, err := services.SolveRawMaterialBatchOptimizer(input)
	if err != nil {
		var validationErr services.RawMaterialBatchOptimizerValidationError
		if errors.As(err, &validationErr) {
			c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] 拆批优化请求校验失败: " + validationErr.Error()})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[RAW_MATERIALS] 拆批优化求解失败: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, response)
}
