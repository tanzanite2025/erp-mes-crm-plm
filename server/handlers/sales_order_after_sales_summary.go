package handlers

import (
	"net/http"
	"xdfc-server/services"

	"github.com/gin-gonic/gin"
)

type salesOrderAfterSalesSummaryRequest struct {
	SalesOrderIDs []string `json:"salesOrderIds"`
}

func GetSalesOrderAfterSalesSummaryHandler(c *gin.Context) {
	var req salesOrderAfterSalesSummaryRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	items, err := services.ListSalesOrderAfterSalesSummaries(req.SalesOrderIDs)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] failed to load sales order after-sales summary: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"items": items})
}
