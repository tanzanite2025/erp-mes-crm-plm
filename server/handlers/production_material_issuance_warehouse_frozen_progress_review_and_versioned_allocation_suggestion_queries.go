package handlers

import (
	"net/http"
	"xdfc-server/db"
	"xdfc-server/services"

	"github.com/gin-gonic/gin"
)

func GetProductionMaterialIssuanceWarehouseReviewHandler(c *gin.Context) {
	if !requireProductionMaterialIssuanceHTTPDocumentIdentityWithoutQueryParameters(c) {
		return
	}
	result, err := services.GetProductionMaterialIssuanceWarehouseReview(c.Request.Context(), db.DB, c.Param("id"))
	if err != nil {
		respondToProductionMaterialIssuanceQueryError(c, err)
		return
	}
	c.Header("Cache-Control", "no-store")
	c.JSON(http.StatusOK, result)
}

func SuggestProductionMaterialIssuanceOrdinaryOrderLineAllocationsHandler(c *gin.Context) {
	if !requireProductionMaterialIssuanceHTTPDocumentIdentityWithoutQueryParameters(c) {
		return
	}
	var body struct {
		ExpectedVersion int     `json:"expectedVersion"`
		MaterialID      string  `json:"materialId"`
		Quantity        float64 `json:"quantity"`
	}
	if err := decodeProductionMaterialIssuanceStrictHTTPRequest(c, &body); err != nil {
		respondToProductionMaterialIssuanceQueryError(c, err)
		return
	}
	if body.ExpectedVersion <= 0 || !isCanonicalProductionMaterialIssuanceHTTPUUID(body.MaterialID) || body.Quantity <= 0 {
		respondToProductionMaterialIssuanceQueryError(c, services.ErrProductionMaterialIssuanceInvalidRequest)
		return
	}
	review, err := services.GetProductionMaterialIssuanceWarehouseReview(c.Request.Context(), db.DB, c.Param("id"))
	if err != nil {
		respondToProductionMaterialIssuanceQueryError(c, err)
		return
	}
	if review.Document.Version != body.ExpectedVersion {
		respondToProductionMaterialIssuanceQueryError(c, services.ErrProductionMaterialIssuanceBasisChanged)
		return
	}
	allocations, err := services.SuggestProductionMaterialIssuanceOrdinaryOrderLineAllocations(review, body.MaterialID, body.Quantity)
	if err != nil {
		respondToProductionMaterialIssuanceQueryError(c, err)
		return
	}
	c.Header("Cache-Control", "no-store")
	c.JSON(http.StatusOK, gin.H{
		"documentId": review.Document.ID, "expectedVersion": review.Document.Version,
		"materialId": body.MaterialID, "quantity": body.Quantity, "allocations": allocations,
	})
}
