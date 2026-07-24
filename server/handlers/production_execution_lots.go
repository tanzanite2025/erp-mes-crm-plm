package handlers

import (
	"errors"
	"net/http"
	"strconv"
	"xdfc-server/middleware"
	"xdfc-server/services"

	"github.com/gin-gonic/gin"
)

func GetProductionExecutionLotsHandler(c *gin.Context) {
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "50"))
	response, err := services.ListProductionExecutionLots(services.ProductionExecutionLotListQuery{
		ProductBarcode: c.Query("productBarcode"),
		BatchNo:        c.Query("batchNo"),
		PlanID:         c.Query("planId"),
		TaskID:         c.Query("taskId"),
		Limit:          limit,
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] 生产执行批次查询失败: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, response)
}

func SaveProductionExecutionLotHandler(c *gin.Context) {
	var req services.SaveProductionExecutionLotRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] 生产执行批次请求格式错误: " + err.Error()})
		return
	}

	req.Operator = middleware.GetSafeUsername(c)
	response, err := services.SaveProductionExecutionLot(req)
	if err != nil {
		switch {
		case errors.Is(err, services.ErrInvalidProductionExecutionLot):
			c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] " + err.Error()})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] 生产执行批次保存失败: " + err.Error()})
		}
		return
	}

	c.JSON(http.StatusOK, response)
}
