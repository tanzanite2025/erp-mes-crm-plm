package handlers

import (
	"net/http"
	"xdfc-server/services"

	"github.com/gin-gonic/gin"
)

// GetInventoryHandler returns paginated inventory records.
func GetInventoryHandler(c *gin.Context) {
	page, pageSize := parsePageAndSize(c, 1, 50)
	items, total, err := services.ListInventory(page, pageSize)
	if err != nil {
		respondInventoryError(c, http.StatusInternalServerError, "INVENTORY_QUERY_FAILED", "[SERVER] failed to load inventory: "+err.Error())
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"items":    items,
		"total":    total,
		"page":     page,
		"pageSize": pageSize,
	})
}

// GetInboundHistoryHandler returns paginated inbound history.
func GetInboundHistoryHandler(c *gin.Context) {
	page, pageSize := parsePageAndSize(c, 1, 50)
	items, total := services.ListInboundHistory(page, pageSize)

	c.JSON(http.StatusOK, gin.H{
		"items":    items,
		"total":    total,
		"page":     page,
		"pageSize": pageSize,
	})
}

// GetShipmentHistoryHandler returns paginated shipment history.
func GetShipmentHistoryHandler(c *gin.Context) {
	page, pageSize := parsePageAndSize(c, 1, 50)
	items, total := services.ListShipmentHistory(page, pageSize)

	c.JSON(http.StatusOK, gin.H{
		"items":    items,
		"total":    total,
		"page":     page,
		"pageSize": pageSize,
	})
}
