package handlers

import (
	"errors"
	"net/http"
	"xdfc-server/services"

	"github.com/gin-gonic/gin"
)

func CreateProductBarcodeCaptureSessionHandler(c *gin.Context) {
	session, err := services.CreateProductBarcodeCaptureSession()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[PRODUCTION] 产品码扫码会话创建失败: " + err.Error()})
		return
	}
	c.JSON(http.StatusOK, session)
}

func GetProductBarcodeCaptureSessionHandler(c *gin.Context) {
	session, err := services.GetProductBarcodeCaptureSession(c.Param("sessionId"))
	if err != nil {
		if errors.Is(err, services.ErrProductBarcodeCaptureSessionNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "[PRODUCTION] 产品码扫码会话不存在"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[PRODUCTION] 产品码扫码会话读取失败: " + err.Error()})
		return
	}
	c.JSON(http.StatusOK, session)
}

func SubmitProductBarcodeCaptureSessionHandler(c *gin.Context) {
	var input services.SubmitProductBarcodeCaptureSessionRequest
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] 产品码扫码提交格式错误: " + err.Error()})
		return
	}
	if input.Token == "" {
		input.Token = c.Query("token")
	}
	session, err := services.SubmitProductBarcodeCaptureSession(c.Param("sessionId"), input)
	if err != nil {
		var validationErr *services.ProductBarcodeBindingValidationError
		switch {
		case errors.Is(err, services.ErrProductBarcodeCaptureSessionNotFound):
			c.JSON(http.StatusNotFound, gin.H{"error": "[PRODUCTION] 产品码扫码会话不存在"})
		case errors.Is(err, services.ErrProductBarcodeCaptureSessionExpired):
			c.JSON(http.StatusGone, gin.H{"error": "[PRODUCTION] 产品码扫码会话已过期"})
		case errors.Is(err, services.ErrProductBarcodeCaptureSessionToken):
			c.JSON(http.StatusForbidden, gin.H{"error": "[PRODUCTION] 产品码扫码口令无效"})
		case errors.As(err, &validationErr):
			c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] " + validationErr.Error()})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{"error": "[PRODUCTION] 产品码扫码提交失败: " + err.Error()})
		}
		return
	}
	c.JSON(http.StatusOK, session)
}
