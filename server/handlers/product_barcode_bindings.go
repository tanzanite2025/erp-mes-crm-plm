package handlers

import (
	"errors"
	"net/http"
	"xdfc-server/middleware"
	"xdfc-server/services"

	"github.com/gin-gonic/gin"
)

func GetProductBarcodeBindingsHandler(c *gin.Context) {
	response, err := services.ListProductBarcodeBindings(services.ProductBarcodeBindingListQuery{
		Limit:               services.ParseProductBarcodeBindingListLimit(c.DefaultQuery("limit", "10")),
		ProductBarcode:      c.Query("productBarcode"),
		PrepregBindingToken: c.Query("prepregBindingToken"),
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] 产品绑定记录查询失败: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, response)
}

func CreateProductBarcodeBindingHandler(c *gin.Context) {
	var req services.CreateProductBarcodeBindingRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] 绑定请求格式错误: " + err.Error()})
		return
	}

	response, err := services.CreateProductBarcodeBinding(req, middleware.GetSafeUsername(c))
	if err != nil {
		var validationErr *services.ProductBarcodeBindingValidationError
		var conflictErr *services.ProductBarcodeBindingConflictError
		switch {
		case errors.Is(err, services.ErrPrepregBindingTokenExpired):
			c.JSON(http.StatusGone, gin.H{"error": "[VALIDATION] 预浸料二维码已过期，请重新生成"})
			return
		case errors.As(err, &conflictErr):
			c.JSON(http.StatusConflict, gin.H{"error": "[CONFLICT] " + conflictErr.Error()})
			return
		case errors.As(err, &validationErr):
			c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] " + validationErr.Error()})
			return
		default:
			c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] 产品绑定提交失败: " + err.Error()})
			return
		}
	}

	c.JSON(http.StatusOK, response)
}
