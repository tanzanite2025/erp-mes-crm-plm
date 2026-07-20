package handlers

import (
	"errors"
	"net/http"
	"strconv"
	"xdfc-server/services"

	"github.com/gin-gonic/gin"
)

func respondLinearBarcodePrintError(c *gin.Context, err error) {
	var validationErr *services.LinearBarcodePrintValidationError
	switch {
	case errors.As(err, &validationErr):
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] " + validationErr.Error()})
	case errors.Is(err, services.ErrLinearBarcodeSalesOrderNotFound), errors.Is(err, services.ErrLinearBarcodeOrderLineNotFound):
		c.JSON(http.StatusNotFound, gin.H{"error": "[NOT_FOUND] 销售订单或订单行不存在"})
	case errors.Is(err, services.ErrLinearBarcodeOrderNotPrintable):
		c.JSON(http.StatusConflict, gin.H{"error": "[BUSINESS_RULE_VIOLATION] 仅排产中的销售订单允许预打一维码"})
	case isUniqueViolation(err):
		c.JSON(http.StatusConflict, gin.H{"error": "[BUSINESS_RULE_VIOLATION] 发号结果与已有一维码冲突，请重试"})
	default:
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] 批量一维码发号落库失败: " + err.Error()})
	}
}

func CreateLinearBarcodeBatchHandler(c *gin.Context) {
	var input services.CreateLinearBarcodeBatchRequest
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] 批量一维码请求格式错误"})
		return
	}

	result, err := services.CreateLinearBarcodeBatch(input)
	if err != nil {
		respondLinearBarcodePrintError(c, err)
		return
	}
	c.JSON(http.StatusOK, result)
}

func ListLinearBarcodeInventoryHandler(c *gin.Context) {
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "200"))
	result, err := services.ListLinearBarcodeInventory(services.ListLinearBarcodeInventoryRequest{
		SalesOrderID: c.Query("salesOrderId"),
		BatchID:      c.Query("batchId"),
		Status:       c.Query("status"),
		Limit:        limit,
	})
	if err != nil {
		respondLinearBarcodePrintError(c, err)
		return
	}
	c.JSON(http.StatusOK, result)
}
