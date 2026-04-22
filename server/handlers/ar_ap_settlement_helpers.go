package handlers

import (
	"errors"
	"net/http"
	"xdfc-server/services"

	"github.com/gin-gonic/gin"
)

func bindCreateReceiptRecordRequest(c *gin.Context) (services.CreateReceiptRecordRequest, bool) {
	var req services.CreateReceiptRecordRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "收款登记参数错误: " + err.Error()})
		return services.CreateReceiptRecordRequest{}, false
	}
	return req, true
}

func bindCreatePaymentRecordRequest(c *gin.Context) (services.CreatePaymentRecordRequest, bool) {
	var req services.CreatePaymentRecordRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "付款登记参数错误: " + err.Error()})
		return services.CreatePaymentRecordRequest{}, false
	}
	return req, true
}

func handleCreateReceiptRecordError(c *gin.Context, err error) {
	switch {
	case errors.Is(err, services.ErrReceivableLedgerNotFound):
		c.JSON(http.StatusNotFound, gin.H{"error": "应收台账不存在"})
	case errors.Is(err, services.ErrSettlementAllocationsRequired):
		c.JSON(http.StatusBadRequest, gin.H{"error": "收款分摊明细不能为空"})
	case errors.Is(err, services.ErrSettlementAmountInvalid):
		c.JSON(http.StatusBadRequest, gin.H{"error": "收款金额必须大于 0"})
	case errors.Is(err, services.ErrSettlementAllocationSumMismatch):
		c.JSON(http.StatusBadRequest, gin.H{"error": "收款金额与分摊明细合计不一致"})
	case errors.Is(err, services.ErrSettlementAllocationOverflow):
		c.JSON(http.StatusBadRequest, gin.H{"error": "收款分摊金额超过台账未收金额"})
	case errors.Is(err, services.ErrSettlementLedgerStatusInvalid):
		c.JSON(http.StatusBadRequest, gin.H{"error": "目标应收台账状态不允许继续核销"})
	default:
		c.JSON(http.StatusInternalServerError, gin.H{"error": "收款登记失败"})
	}
}

func handleCreatePaymentRecordError(c *gin.Context, err error) {
	switch {
	case errors.Is(err, services.ErrPayableLedgerNotFound):
		c.JSON(http.StatusNotFound, gin.H{"error": "应付台账不存在"})
	case errors.Is(err, services.ErrSettlementAllocationsRequired):
		c.JSON(http.StatusBadRequest, gin.H{"error": "付款分摊明细不能为空"})
	case errors.Is(err, services.ErrSettlementAmountInvalid):
		c.JSON(http.StatusBadRequest, gin.H{"error": "付款金额必须大于 0"})
	case errors.Is(err, services.ErrSettlementAllocationSumMismatch):
		c.JSON(http.StatusBadRequest, gin.H{"error": "付款金额与分摊明细合计不一致"})
	case errors.Is(err, services.ErrSettlementAllocationOverflow):
		c.JSON(http.StatusBadRequest, gin.H{"error": "付款分摊金额超过台账未付金额"})
	case errors.Is(err, services.ErrSettlementLedgerStatusInvalid):
		c.JSON(http.StatusBadRequest, gin.H{"error": "目标应付台账状态不允许继续核销"})
	default:
		c.JSON(http.StatusInternalServerError, gin.H{"error": "付款登记失败"})
	}
}
