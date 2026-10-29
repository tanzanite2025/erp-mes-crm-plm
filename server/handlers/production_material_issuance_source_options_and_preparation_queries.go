package handlers

import (
	"net/http"
	"strconv"
	"xdfc-server/db"
	"xdfc-server/services"

	"github.com/gin-gonic/gin"
)

func QueryProductionMaterialIssuanceSourceOptionsHandler(c *gin.Context) {
	if !requireAuthenticatedProductionMaterialIssuanceHTTPActor(c) {
		return
	}
	query := services.ProductionMaterialIssuanceSourceOptionsQuery{Page: 1, PageSize: 20}
	for key, values := range c.Request.URL.Query() {
		if len(values) != 1 {
			respondToProductionMaterialIssuanceQueryError(c, services.ErrProductionMaterialIssuanceInvalidRequest)
			return
		}
		if key == "search" {
			query.Search = values[0]
			continue
		}
		if key != "page" && key != "pageSize" {
			respondToProductionMaterialIssuanceQueryError(c, services.ErrProductionMaterialIssuanceInvalidRequest)
			return
		}
		value, err := strconv.Atoi(values[0])
		if err != nil {
			respondToProductionMaterialIssuanceQueryError(c, services.ErrProductionMaterialIssuanceInvalidRequest)
			return
		}
		if key == "page" {
			query.Page = value
		} else {
			query.PageSize = value
		}
	}
	result, err := services.QueryProductionMaterialIssuanceSourceOptions(c.Request.Context(), db.DB, query)
	if err != nil {
		respondToProductionMaterialIssuanceQueryError(c, err)
		return
	}
	c.Header("Cache-Control", "no-store")
	c.JSON(http.StatusOK, result)
}

func PrepareProductionMaterialIssuanceSourcesHandler(c *gin.Context) {
	if !requireAuthenticatedProductionMaterialIssuanceHTTPActor(c) {
		return
	}
	if c.Request.URL.RawQuery != "" {
		respondToProductionMaterialIssuanceQueryError(c, services.ErrProductionMaterialIssuanceInvalidRequest)
		return
	}
	var request struct {
		Sources []services.ProductionMaterialIssuanceSourcePreparationSelection `json:"sources"`
	}
	if err := decodeProductionMaterialIssuanceStrictHTTPRequest(c, &request); err != nil {
		respondToProductionMaterialIssuanceQueryError(c, err)
		return
	}
	for _, source := range request.Sources {
		if !isCanonicalProductionMaterialIssuanceHTTPUUID(source.SalesOrderID) || (source.BOMID != "" && !isCanonicalProductionMaterialIssuanceHTTPUUID(source.BOMID)) {
			respondToProductionMaterialIssuanceQueryError(c, services.ErrProductionMaterialIssuanceInvalidRequest)
			return
		}
	}
	result, err := services.PrepareProductionMaterialIssuanceSources(c.Request.Context(), db.DB, request.Sources)
	if err != nil {
		respondToProductionMaterialIssuanceQueryError(c, err)
		return
	}
	c.Header("Cache-Control", "no-store")
	c.JSON(http.StatusOK, result)
}
