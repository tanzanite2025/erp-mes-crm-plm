package handlers

import (
	"errors"
	"net/http"
	"strings"
	"xdfc-server/middleware"
	"xdfc-server/services"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

func ExecuteCustomerTransactionHandler(c *gin.Context) {
	customerID := strings.TrimSpace(c.Param("id"))
	if customerID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "客户 ID 不能为空"})
		return
	}

	var req services.EntityTransactionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] customer transaction 数据格式错误: " + err.Error()})
		return
	}

	actorID := strings.TrimSpace(req.ActorID)
	if actorID == "" {
		actorID = middleware.GetSafeUserID(c)
	}

	result, err := services.ExecuteCustomerTransaction(services.ExecuteCustomerTransactionInput{
		CustomerID:      customerID,
		Intent:          req.Intent,
		ActorID:         actorID,
		Operator:        middleware.GetSafeUsername(c),
		ExpectedVersion: req.ExpectedVersion,
		Payload:         req.Payload,
		IP:              c.ClientIP(),
	})
	if err != nil {
		switch {
		case errors.Is(err, gorm.ErrRecordNotFound):
			c.JSON(http.StatusNotFound, gin.H{"error": "[CRITICAL] 客户不存在"})
		case errors.Is(err, services.ErrCustomerTransactionVersionConflict):
			respondVersionConflict(c)
		case errors.Is(err, services.ErrCustomerTransactionUnsupportedIntent), errors.Is(err, services.ErrCustomerTransactionInvalidPayload):
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] 执行客户事务失败: " + err.Error()})
		}
		return
	}

	c.JSON(http.StatusOK, services.MapCustomerToResponse(*result))
}

func ExecuteSupplierTransactionHandler(c *gin.Context) {
	supplierID := strings.TrimSpace(c.Param("id"))
	if supplierID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "供应商 ID 不能为空"})
		return
	}

	var req services.EntityTransactionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] supplier transaction 数据格式错误: " + err.Error()})
		return
	}

	actorID := strings.TrimSpace(req.ActorID)
	if actorID == "" {
		actorID = middleware.GetSafeUserID(c)
	}

	result, err := services.ExecuteSupplierTransaction(services.ExecuteSupplierTransactionInput{
		SupplierID:      supplierID,
		Intent:          req.Intent,
		ActorID:         actorID,
		Operator:        middleware.GetSafeUsername(c),
		ExpectedVersion: req.ExpectedVersion,
		Payload:         req.Payload,
		IP:              c.ClientIP(),
	})
	if err != nil {
		switch {
		case errors.Is(err, gorm.ErrRecordNotFound):
			c.JSON(http.StatusNotFound, gin.H{"error": "[CRITICAL] 供应商不存在"})
		case errors.Is(err, services.ErrSupplierTransactionVersionConflict):
			respondVersionConflict(c)
		case errors.Is(err, services.ErrSupplierTransactionUnsupportedIntent), errors.Is(err, services.ErrSupplierTransactionInvalidPayload):
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] 执行供应商事务失败: " + err.Error()})
		}
		return
	}

	c.JSON(http.StatusOK, services.MapSupplierToResponse(*result))
}
