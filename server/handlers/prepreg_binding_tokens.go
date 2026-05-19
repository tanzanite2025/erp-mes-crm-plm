package handlers

import (
	"errors"
	"log"
	"net/http"
	"xdfc-server/services"

	"github.com/gin-gonic/gin"
)

func CreatePrepregBindingTokenBatchHandler(c *gin.Context) {
	var input services.CreatePrepregBindingTokenBatchRequest
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] 生成请求格式错误: " + err.Error()})
		return
	}

	result, err := services.CreatePrepregBindingTokenBatch(input.Quantity)
	if err != nil {
		var validationErr *services.PrepregMaterialSpecValidationError
		if errors.As(err, &validationErr) {
			log.Printf("[PREPREG_BINDING_TOKEN_BATCH][VALIDATION] quantity=%d error=%v", input.Quantity, err)
			c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] " + validationErr.Error()})
			return
		}
		log.Printf("[PREPREG_BINDING_TOKEN_BATCH][INTERNAL] quantity=%d error=%T %v", input.Quantity, err, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[RAW_MATERIALS] 批量生成绑定二维码失败: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, result)
}

func GetPrepregBindingTokenStateHandler(c *gin.Context) {
	result, err := services.GetPrepregBindingTokenState(c.Param("token"))
	if err != nil {
		var validationErr *services.PrepregMaterialSpecValidationError
		switch {
		case errors.Is(err, services.ErrPrepregBindingTokenExpired):
			c.JSON(http.StatusGone, gin.H{"error": "[VALIDATION] 绑定二维码已过期，请重新生成"})
			return
		case errors.As(err, &validationErr):
			c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] " + validationErr.Error()})
			return
		default:
			c.JSON(http.StatusInternalServerError, gin.H{"error": "[RAW_MATERIALS] 绑定二维码状态读取失败: " + err.Error()})
			return
		}
	}

	c.JSON(http.StatusOK, result)
}

func BindPrepregBindingTokenToSpecHandler(c *gin.Context) {
	var input services.BindPrepregBindingTokenRequest
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] 绑定请求格式错误: " + err.Error()})
		return
	}

	result, err := services.BindPrepregBindingTokenToSpec(c.Param("token"), input.SpecID)
	if err != nil {
		var validationErr *services.PrepregMaterialSpecValidationError
		switch {
		case errors.Is(err, services.ErrPrepregMaterialSpecNotFound):
			c.JSON(http.StatusNotFound, gin.H{"error": "[RAW_MATERIALS] 目标预浸料规格不存在"})
			return
		case errors.Is(err, services.ErrPrepregBindingTokenExpired):
			c.JSON(http.StatusGone, gin.H{"error": "[VALIDATION] 绑定二维码已过期，请重新生成"})
			return
		case errors.Is(err, services.ErrPrepregBindingTokenConflict):
			c.JSON(http.StatusConflict, gin.H{"error": "[VALIDATION] 该绑定二维码已绑定到其它预浸料规格"})
			return
		case errors.As(err, &validationErr):
			c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] " + validationErr.Error()})
			return
		default:
			c.JSON(http.StatusInternalServerError, gin.H{"error": "[RAW_MATERIALS] 绑定二维码保存失败: " + err.Error()})
			return
		}
	}

	c.JSON(http.StatusOK, result)
}
