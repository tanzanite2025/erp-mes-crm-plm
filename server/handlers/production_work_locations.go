package handlers

import (
	"errors"
	"net/http"
	"xdfc-server/middleware"
	"xdfc-server/services"

	"github.com/gin-gonic/gin"
)

func GetProductionWorkLocationsHandler(c *gin.Context) {
	response, err := services.ListProductionWorkLocations()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] 生产作业地点查询失败: " + err.Error()})
		return
	}
	c.JSON(http.StatusOK, response)
}

func SaveProductionWorkLocationHandler(c *gin.Context) {
	var location services.ProductionWorkLocationDTO
	if err := c.ShouldBindJSON(&location); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] 生产作业地点格式错误: " + err.Error()})
		return
	}
	response, err := services.SaveProductionWorkLocation(services.SaveProductionWorkLocationRequest{
		Location: location,
		Operator: middleware.GetSafeUsername(c),
		IP:       c.ClientIP(),
	})
	if err != nil {
		if errors.Is(err, services.ErrInvalidProductionWorkLocation) {
			c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] " + err.Error()})
			return
		}
		if errors.Is(err, services.ErrProductionWorkLocationVersionConflict) {
			c.JSON(http.StatusConflict, gin.H{"error": "[CONFLICT] " + err.Error()})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] 生产作业地点保存失败: " + err.Error()})
		return
	}
	c.JSON(http.StatusOK, response)
}
