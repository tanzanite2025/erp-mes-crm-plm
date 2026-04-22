package handlers

import (
	"errors"
	"net/http"
	"xdfc-server/services"

	"github.com/gin-gonic/gin"
)

func getPayableLedgersHandler(c *gin.Context) {
	page, pageSize := parsePageQuery(c, 50)

	response, err := services.ListPayableLedgers(services.PayableLedgerQuery{
		Page:     page,
		PageSize: pageSize,
		Status:   queryStatusFilter(c),
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "获取应付台账列表失败"})
		return
	}

	c.JSON(http.StatusOK, response)
}

func searchPayableLedgersHandler(c *gin.Context) {
	page, pageSize := parsePageQuery(c, 20)

	response, err := services.SearchPayableLedgers(services.LedgerSearchQuery{
		Keyword:        queryKeywordFilter(c),
		Page:           page,
		PageSize:       pageSize,
		Status:         queryStatusFilter(c),
		Currency:       queryCurrencyFilter(c),
		OutstandingMin: queryOutstandingMin(c),
		OutstandingMax: queryOutstandingMax(c),
		SortBy:         querySortBy(c),
		SortOrder:      querySortOrder(c),
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "搜索应付台账失败"})
		return
	}

	c.JSON(http.StatusOK, response)
}

func getPayableLedgerHandler(c *gin.Context) {
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

func createPaymentRecordHandler(c *gin.Context) {
	req, ok := bindCreatePaymentRecordRequest(c)
	if !ok {
		return
	}

	response, err := services.CreatePaymentRecord(c.Param("id"), req)
	if err != nil {
		handleCreatePaymentRecordError(c, err)
		return
	}

	c.JSON(http.StatusOK, response)
}
