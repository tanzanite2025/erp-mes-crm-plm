package handlers

import (
	"net/http"
	"xdfc-server/db"
	"xdfc-server/services"

	"github.com/gin-gonic/gin"
)

func GetProductionMaterialIssuanceVersionedMaterialBatchAvailabilityHandler(c *gin.Context) {
	if !requireProductionMaterialIssuanceHTTPDocumentIdentityWithoutQueryParameters(c) {
		return
	}
	var body struct {
		ExpectedVersion int    `json:"expectedVersion"`
		MaterialID      string `json:"materialId"`
	}
	if err := decodeProductionMaterialIssuanceStrictHTTPRequest(c, &body); err != nil {
		respondToProductionMaterialIssuanceQueryError(c, err)
		return
	}
	if !isCanonicalProductionMaterialIssuanceHTTPUUID(body.MaterialID) || body.ExpectedVersion <= 0 {
		respondToProductionMaterialIssuanceQueryError(c, services.ErrProductionMaterialIssuanceInvalidRequest)
		return
	}
	result, err := services.GetProductionMaterialIssuanceMaterialBatchAvailability(c.Request.Context(), db.DB, c.Param("id"), body.ExpectedVersion, body.MaterialID)
	if err != nil {
		respondToProductionMaterialIssuanceQueryError(c, err)
		return
	}
	c.Header("Cache-Control", "no-store")
	c.JSON(http.StatusOK, result)
}
