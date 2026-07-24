package handlers

import (
	"errors"
	"net/http"
	"xdfc-server/middleware"
	"xdfc-server/services"

	"github.com/gin-gonic/gin"
)

func GetProductBarcodeStateHandler(c *gin.Context) {
	response, err := services.GetProductBarcodeState(c.Param("productBarcode"))
	if err != nil {
		switch {
		case errors.Is(err, services.ErrProductBarcodeStateNotFound):
			c.JSON(http.StatusNotFound, gin.H{"error": "[NOT_FOUND] 产品一维码状态不存在"})
		case errors.Is(err, services.ErrInvalidProductBarcodeState):
			c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] " + err.Error()})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] 产品一维码状态查询失败: " + err.Error()})
		}
		return
	}

	c.JSON(http.StatusOK, response)
}

func SaveProductBarcodeStateHandler(c *gin.Context) {
	var req services.SaveProductBarcodeStateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] 状态请求格式错误: " + err.Error()})
		return
	}

	req.Operator = middleware.GetSafeUsername(c)
	req.IP = c.ClientIP()
	response, err := services.SaveProductBarcodeState(req)
	if err != nil {
		switch {
		case errors.Is(err, services.ErrInvalidProductBarcodeState):
			c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] " + err.Error()})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] 产品一维码状态保存失败: " + err.Error()})
		}
		return
	}

	c.JSON(http.StatusOK, response)
}
