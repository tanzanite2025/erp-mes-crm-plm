package handlers

import (
	"errors"
	"net/http"
	"strconv"
	"xdfc-server/middleware"
	"xdfc-server/services"

	"github.com/gin-gonic/gin"
)

func GetProductionOperationExecutionsHandler(c *gin.Context) {
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "50"))
	response, err := services.ListProductionOperationExecutions(services.ProductionOperationExecutionListQuery{
		ProductBarcode: c.Query("productBarcode"),
		ProcessStepID:  c.Query("processStepId"),
		RouteStepID:    c.Query("routeStepId"),
		ExecutionLotID: c.Query("executionLotId"),
		Limit:          limit,
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] 工序执行记录查询失败: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, response)
}

func RecordProductionOperationExecutionHandler(c *gin.Context) {
	var req services.RecordProductionOperationExecutionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] 工序执行请求格式错误: " + err.Error()})
		return
	}

	req.Operator = middleware.GetSafeUsername(c)
	response, err := services.RecordProductionOperationExecution(req)
	if err != nil {
		switch {
		case errors.Is(err, services.ErrInvalidProductionOperationExecution):
			c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] " + err.Error()})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] 工序执行记录保存失败: " + err.Error()})
		}
		return
	}

	c.JSON(http.StatusOK, response)
}
