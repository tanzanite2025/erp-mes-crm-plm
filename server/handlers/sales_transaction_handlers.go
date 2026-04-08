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

func ExecuteSalesOrderTransactionHandler(c *gin.Context) {
	orderID := strings.TrimSpace(c.Param("id"))
	if orderID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "订单 ID 不能为空"})
		return
	}

	var req services.SalesOrderTransactionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] transaction 数据格式错误: " + err.Error()})
		return
	}

	actorID := strings.TrimSpace(req.ActorID)
	if actorID == "" {
		actorID = middleware.GetSafeUserID(c)
	}

	result, err := services.ExecuteSalesOrderTransaction(services.ExecuteSalesOrderTransactionInput{
		OrderID:         orderID,
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
			c.JSON(http.StatusNotFound, gin.H{"error": "[CRITICAL] 订单不存在"})
		case errors.Is(err, services.ErrSalesTransactionVersionConflict):
			respondVersionConflict(c)
		case errors.Is(err, services.ErrSalesTransactionUnsupportedIntent), errors.Is(err, services.ErrSalesTransactionInvalidPayload):
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] 执行销售事务失败: " + err.Error()})
		}
		return
	}

	c.JSON(http.StatusOK, result)
}
