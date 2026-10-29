package handlers

import (
	"net/http"
	"strconv"
	"xdfc-server/db"
	"xdfc-server/services"

	"github.com/gin-gonic/gin"
)

func QueryProductionMaterialIssuanceActiveOrderProgressHandler(c *gin.Context) {
	if !requireAuthenticatedProductionMaterialIssuanceHTTPActor(c) {
		return
	}
	query := services.ProductionMaterialIssuanceActiveProgressQuery{MaterialsPage: 1, OrdersPage: 1, PageSize: 20}
	fields := map[string]*int{"materialsPage": &query.MaterialsPage, "ordersPage": &query.OrdersPage, "pageSize": &query.PageSize}
	for key, values := range c.Request.URL.Query() {
		destination, exists := fields[key]
		if !exists || len(values) != 1 {
			respondToProductionMaterialIssuanceQueryError(c, services.ErrProductionMaterialIssuanceInvalidRequest)
			return
		}
		value, err := strconv.Atoi(values[0])
		if err != nil {
			respondToProductionMaterialIssuanceQueryError(c, services.ErrProductionMaterialIssuanceInvalidRequest)
			return
		}
		*destination = value
	}
	result, err := services.QueryProductionMaterialIssuanceActiveOrderProgress(c.Request.Context(), db.DB, query)
	if err != nil {
		respondToProductionMaterialIssuanceQueryError(c, err)
		return
	}
	c.Header("Cache-Control", "no-store")
	c.JSON(http.StatusOK, result)
}
