package handlers

import (
	"errors"
	"net/http"
	"xdfc-server/middleware"
	"xdfc-server/services"

	"github.com/gin-gonic/gin"
)

func getReceivableLedgersHandler(c *gin.Context) {
	page, pageSize := parsePageQuery(c, 50)

	response, err := services.ListReceivableLedgers(services.ReceivableLedgerQuery{
		Page:        page,
		PageSize:    pageSize,
		Status:      queryStatusFilter(c),
		SourceType:  querySourceType(c),
		SourceRefID: querySourceRefID(c),
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "获取应收台账列表失败"})
		return
	}

	c.JSON(http.StatusOK, response)
}

func searchReceivableLedgersHandler(c *gin.Context) {
	page, pageSize := parsePageQuery(c, 20)

	response, err := services.SearchReceivableLedgers(services.LedgerSearchQuery{
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
		c.JSON(http.StatusInternalServerError, gin.H{"error": "搜索应收台账失败"})
		return
	}

	c.JSON(http.StatusOK, response)
}

func getReceivableLedgerHandler(c *gin.Context) {
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

func createReceiptRecordHandler(c *gin.Context) {
	req, ok := bindCreateReceiptRecordRequest(c)
	if !ok {
		return
	}

	response, err := services.CreateReceiptRecord(c.Param("id"), req, middleware.GetSafeUsername(c))
	if err != nil {
		handleCreateReceiptRecordError(c, err)
		return
	}

	c.JSON(http.StatusOK, response)
}
