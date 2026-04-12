package handlers

import (
	"errors"
	"net/http"
	"strconv"
	"strings"
	"xdfc-server/services"

	"github.com/gin-gonic/gin"
)

func GetReceivableLedgersHandler(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("pageSize", "50"))
	status := strings.TrimSpace(c.Query("status"))

	response, err := services.ListReceivableLedgers(services.ReceivableLedgerQuery{
		Page:     page,
		PageSize: pageSize,
		Status:   status,
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "获取应收台账列表失败"})
		return
	}

	c.JSON(http.StatusOK, response)
}

func SearchPayableLedgersHandler(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("pageSize", "20"))
	status := strings.TrimSpace(c.Query("status"))
	currency := strings.TrimSpace(c.Query("currency"))
	keyword := strings.TrimSpace(c.Query("keyword"))
	outstandingMin, _ := strconv.ParseFloat(strings.TrimSpace(c.Query("outstandingMin")), 64)
	outstandingMax, _ := strconv.ParseFloat(strings.TrimSpace(c.Query("outstandingMax")), 64)
	sortBy := strings.TrimSpace(c.Query("sortBy"))
	sortOrder := strings.TrimSpace(c.Query("sortOrder"))

	response, err := services.SearchPayableLedgers(services.LedgerSearchQuery{
		Keyword:        keyword,
		Page:           page,
		PageSize:       pageSize,
		Status:         status,
		Currency:       currency,
		OutstandingMin: outstandingMin,
		OutstandingMax: outstandingMax,
		SortBy:         sortBy,
		SortOrder:      sortOrder,
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "搜索应付台账失败"})
		return
	}

	c.JSON(http.StatusOK, response)
}

func SearchReceivableLedgersHandler(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("pageSize", "20"))
	status := strings.TrimSpace(c.Query("status"))
	currency := strings.TrimSpace(c.Query("currency"))
	keyword := strings.TrimSpace(c.Query("keyword"))
	outstandingMin, _ := strconv.ParseFloat(strings.TrimSpace(c.Query("outstandingMin")), 64)
	outstandingMax, _ := strconv.ParseFloat(strings.TrimSpace(c.Query("outstandingMax")), 64)
	sortBy := strings.TrimSpace(c.Query("sortBy"))
	sortOrder := strings.TrimSpace(c.Query("sortOrder"))

	response, err := services.SearchReceivableLedgers(services.LedgerSearchQuery{
		Keyword:        keyword,
		Page:           page,
		PageSize:       pageSize,
		Status:         status,
		Currency:       currency,
		OutstandingMin: outstandingMin,
		OutstandingMax: outstandingMax,
		SortBy:         sortBy,
		SortOrder:      sortOrder,
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "搜索应收台账失败"})
		return
	}

	c.JSON(http.StatusOK, response)
}

func GetReceivableLedgerHandler(c *gin.Context) {
	response, err := services.GetReceivableLedgerByID(c.Param("id"))
	if err != nil {
		if errors.Is(err, services.ErrReceivableLedgerNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "应收台账不存在"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "获取应收台账详情失败"})
		return
	}
	c.JSON(http.StatusOK, response)
}

func GetPayableLedgerHandler(c *gin.Context) {
	response, err := services.GetPayableLedgerByID(c.Param("id"))
	if err != nil {
		if errors.Is(err, services.ErrPayableLedgerNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "应付台账不存在"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "获取应付台账详情失败"})
		return
	}
	c.JSON(http.StatusOK, response)
}

func CreateReceiptRecordHandler(c *gin.Context) {
	var req services.CreateReceiptRecordRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "收款登记参数错误: " + err.Error()})
		return
	}

	response, err := services.CreateReceiptRecord(c.Param("id"), req)
	if err != nil {
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
		return
	}

	c.JSON(http.StatusOK, response)
}

func CreatePaymentRecordHandler(c *gin.Context) {
	var req services.CreatePaymentRecordRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "付款登记参数错误: " + err.Error()})
		return
	}

	response, err := services.CreatePaymentRecord(c.Param("id"), req)
	if err != nil {
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
		return
	}

	c.JSON(http.StatusOK, response)
}

func GetPayableLedgersHandler(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("pageSize", "50"))
	status := strings.TrimSpace(c.Query("status"))

	response, err := services.ListPayableLedgers(services.PayableLedgerQuery{
		Page:     page,
		PageSize: pageSize,
		Status:   status,
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "获取应付台账列表失败"})
		return
	}

	c.JSON(http.StatusOK, response)
}
