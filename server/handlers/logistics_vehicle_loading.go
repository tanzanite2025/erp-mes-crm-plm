package handlers

import (
	"errors"
	"net/http"
	"xdfc-server/services"

	"github.com/gin-gonic/gin"
)

func GetVehicleLoadingRecommendationsHandler(c *gin.Context) {
	var request services.VehicleLoadingRecommendationsRequest
	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] 推荐请求参数错误"})
		return
	}

	response, err := services.BuildVehicleLoadingRecommendations(request)
	if err != nil {
		switch {
		case errors.Is(err, services.ErrVehicleLoadingVehicleSpecsRequired),
			errors.Is(err, services.ErrVehicleLoadingSummaryInvalid),
			errors.Is(err, services.ErrVehicleLoadingSourceInvalid):
			c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] " + err.Error()})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] 生成配车推荐失败: " + err.Error()})
		}
		return
	}

	c.JSON(http.StatusOK, response)
}
