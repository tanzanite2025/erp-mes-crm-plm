package handlers

import (
	"net/http"
	"xdfc-server/services"

	"github.com/gin-gonic/gin"
)

// GetInventoryHandler returns paginated inventory records.
func GetInventoryHandler(c *gin.Context) {
	page, pageSize := parsePageAndSize(c, 1, 50)
	response, err := services.ListInventory(page, pageSize)
	if err != nil {
		respondInventoryError(c, http.StatusInternalServerError, "INVENTORY_QUERY_FAILED", "[SERVER] failed to load inventory: "+err.Error())
		return
	}

	c.JSON(http.StatusOK, response)
}

func SearchWarehouseMasterDataHandler(c *gin.Context) {
	response, err := services.SearchWarehouseMasterData(c.Query("q"), c.Query("scope"))
	if err != nil {
		respondInventoryError(c, http.StatusInternalServerError, "WAREHOUSE_MASTER_DATA_SEARCH_FAILED", "[SERVER] failed to search warehouse master data: "+err.Error())
		return
	}

	c.JSON(http.StatusOK, response)
}

// GetInboundHistoryHandler returns paginated inbound history.
func GetInboundHistoryHandler(c *gin.Context) {
	page, pageSize := parsePageAndSize(c, 1, 50)
	response := services.ListInboundHistory(page, pageSize)

	c.JSON(http.StatusOK, response)
}

// GetShipmentHistoryHandler returns paginated shipment history.
func GetShipmentHistoryHandler(c *gin.Context) {
	page, pageSize := parsePageAndSize(c, 1, 50)
	response := services.ListShipmentHistory(page, pageSize)

	c.JSON(http.StatusOK, response)
}

// GetShipmentDemandsHandler returns warehouse-owned order demand rows awaiting virtual shipment preparation.
func GetShipmentDemandsHandler(c *gin.Context) {
	response, err := services.ListShipmentDemands()
	if err != nil {
		respondInventoryError(c, http.StatusInternalServerError, "INVENTORY_SHIPMENT_DEMAND_QUERY_FAILED", "[SERVER] failed to load shipment demands: "+err.Error())
		return
	}

	c.JSON(http.StatusOK, response)
}

// GetInventoryValuationHandler returns aggregated inventory valuation.
func GetInventoryValuationHandler(c *gin.Context) {
	response, err := services.GetInventoryValuation()
	if err != nil {
		respondInventoryError(c, http.StatusInternalServerError, "INVENTORY_VALUATION_FAILED", "[SERVER] failed to aggregate inventory valuation: "+err.Error())
		return
	}

	c.JSON(http.StatusOK, response)
}

// GetInventoryAlertSummaryHandler returns inventory low-stock alert summary.
func GetInventoryAlertSummaryHandler(c *gin.Context) {
	response, err := services.GetInventoryAlertSummary()
	if err != nil {
		respondInventoryError(c, http.StatusInternalServerError, "INVENTORY_ALERT_SUMMARY_FAILED", "[SERVER] failed to aggregate inventory alert summary: "+err.Error())
		return
	}

	c.JSON(http.StatusOK, response)
}
