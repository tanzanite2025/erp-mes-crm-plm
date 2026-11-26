package handlers

import (
	"net/http"
	"strconv"
	"xdfc-server/services"

	"github.com/gin-gonic/gin"
)

func GetProductionOperationExecutionsHandler(c *gin.Context) {
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "50"))
	response, err := services.ListProductionOperationExecutions(services.ProductionOperationExecutionListQuery{
		ProductBarcode:           c.Query("productBarcode"),
		ProcessStepID:            c.Query("processStepId"),
		RouteStepID:              c.Query("routeStepId"),
		ProductionWorkLocationID: c.Query("productionWorkLocationId"),
		ExecutionLotID:           c.Query("executionLotId"),
		Limit:                    limit,
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] 工序执行记录查询失败: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, response)
}
