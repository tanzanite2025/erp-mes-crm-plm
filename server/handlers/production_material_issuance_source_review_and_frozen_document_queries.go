package handlers

import (
	"net/http"
	"strconv"
	"xdfc-server/db"
	"xdfc-server/services"

	"github.com/gin-gonic/gin"
)

func ReviewProductionMaterialIssuanceSourcesHandler(c *gin.Context) {
	if !requireAuthenticatedProductionMaterialIssuanceHTTPActor(c) {
		return
	}
	var request struct {
		Sources []services.ProductionMaterialIssuanceSourceSelection `json:"sources"`
	}
	if err := decodeProductionMaterialIssuanceStrictHTTPRequest(c, &request); err != nil {
		respondToProductionMaterialIssuanceQueryError(c, err)
		return
	}
	for _, source := range request.Sources {
		if !isCanonicalProductionMaterialIssuanceHTTPUUID(source.SalesOrderID) {
			respondToProductionMaterialIssuanceQueryError(c, services.ErrProductionMaterialIssuanceInvalidRequest)
			return
		}
		if !isCanonicalProductionMaterialIssuanceHTTPUUID(source.BOMID) {
			respondToProductionMaterialIssuanceQueryError(c, services.ErrProductionMaterialIssuanceInvalidRequest)
			return
		}
	}
	bases, err := services.ReviewProductionMaterialIssuanceSources(c.Request.Context(), db.DB, request.Sources)
	if err != nil {
		respondToProductionMaterialIssuanceQueryError(c, err)
		return
	}
	c.Header("Cache-Control", "no-store")
	c.JSON(http.StatusOK, gin.H{"sources": bases, "warehouseCategoryCode": services.ProductionMaterialInventoryWarehouseCategoryCode})
}

func ListProductionMaterialIssuanceDocumentsHandler(c *gin.Context) {
	if !requireAuthenticatedProductionMaterialIssuanceHTTPActor(c) {
		return
	}
	query := c.Request.URL.Query()
	for key, values := range query {
		if len(values) != 1 || (key != "status" && key != "page" && key != "pageSize") {
			respondToProductionMaterialIssuanceQueryError(c, services.ErrProductionMaterialIssuanceInvalidRequest)
			return
		}
	}
	page, pageSize := 1, 20
	for key, destination := range map[string]*int{"page": &page, "pageSize": &pageSize} {
		if values, present := query[key]; present {
			parsed, err := strconv.Atoi(values[0])
			if err != nil {
				respondToProductionMaterialIssuanceQueryError(c, services.ErrProductionMaterialIssuanceInvalidRequest)
				return
			}
			*destination = parsed
		}
	}
	result, err := services.ListProductionMaterialIssuanceDocuments(c.Request.Context(), db.DB, query.Get("status"), page, pageSize)
	if err != nil {
		respondToProductionMaterialIssuanceQueryError(c, err)
		return
	}
	c.Header("Cache-Control", "no-store")
	c.JSON(http.StatusOK, result)
}

func GetProductionMaterialIssuanceDocumentHandler(c *gin.Context) {
	if !requireAuthenticatedProductionMaterialIssuanceHTTPActor(c) {
		return
	}
	documentID := c.Param("id")
	if !isCanonicalProductionMaterialIssuanceHTTPUUID(documentID) {
		respondToProductionMaterialIssuanceQueryError(c, services.ErrProductionMaterialIssuanceInvalidRequest)
		return
	}
	result, err := services.GetProductionMaterialIssuanceDocument(c.Request.Context(), db.DB, documentID)
	if err != nil {
		respondToProductionMaterialIssuanceQueryError(c, err)
		return
	}
	c.Header("Cache-Control", "no-store")
	c.JSON(http.StatusOK, result)
}
