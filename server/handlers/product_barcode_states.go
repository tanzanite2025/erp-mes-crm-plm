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

func GetProductBarcodeStateContractHandler(c *gin.Context) {
	c.JSON(http.StatusOK, services.GetProductBarcodeStateContract())
}

func InitializeProductBarcodeStateHandler(c *gin.Context) {
	var req services.InitializeProductBarcodeStateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] 状态请求格式错误: " + err.Error()})
		return
	}

	req.Operator = middleware.GetSafeUsername(c)
	req.IP = c.ClientIP()
	response, err := services.InitializeProductBarcodeState(req)
	if err != nil {
		switch {
		case errors.Is(err, services.ErrProductBarcodeStateAlreadyInitialized):
			c.JSON(http.StatusConflict, gin.H{"error": "[CONFLICT] 产品一维码状态已初始化，后续状态请通过生产扫码或执行命令推进"})
		case errors.Is(err, services.ErrInvalidProductBarcodeState):
			c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] " + err.Error()})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] 产品一维码状态初始化失败: " + err.Error()})
		}
		return
	}

	c.JSON(http.StatusOK, response)
}
