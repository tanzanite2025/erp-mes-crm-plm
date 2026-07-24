package handlers

import (
	"errors"
	"net/http"
	"xdfc-server/middleware"
	"xdfc-server/services"

	"github.com/gin-gonic/gin"
)

func ExecuteProductionScanCommandHandler(c *gin.Context) {
	var req services.ExecuteProductionScanCommandRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] 扫码执行请求格式错误: " + err.Error()})
		return
	}

	req.ActorID = middleware.GetSafeUserID(c)
	req.Operator = middleware.GetSafeUsername(c)
	req.IP = c.ClientIP()

	response, err := services.ExecuteProductionScanCommand(req)
	if err != nil {
		switch {
		case errors.Is(err, services.ErrInvalidProductionScanCommand):
			c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] " + err.Error()})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] 扫码执行失败: " + err.Error()})
		}
		return
	}

	c.JSON(http.StatusOK, response)
}
