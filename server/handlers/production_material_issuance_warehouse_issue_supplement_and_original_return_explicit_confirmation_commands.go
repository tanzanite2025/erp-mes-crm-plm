package handlers

import (
	"net/http"
	"xdfc-server/db"
	"xdfc-server/middleware"
	"xdfc-server/models"
	"xdfc-server/services"

	"github.com/gin-gonic/gin"
)

func ConfirmProductionMaterialIssuanceOrdinaryWarehouseIssueHandler(c *gin.Context) {
	confirmProductionMaterialIssuanceWarehouseMovementFromAuthenticatedRoute(c, models.ProductionMaterialMovementIssue)
}

func ConfirmProductionMaterialIssuanceWarehouseSupplementHandler(c *gin.Context) {
	confirmProductionMaterialIssuanceWarehouseMovementFromAuthenticatedRoute(c, models.ProductionMaterialMovementSupplement)
}

func ConfirmProductionMaterialIssuanceWarehouseReturnHandler(c *gin.Context) {
	confirmProductionMaterialIssuanceWarehouseMovementFromAuthenticatedRoute(c, models.ProductionMaterialMovementReturn)
}

func confirmProductionMaterialIssuanceWarehouseMovementFromAuthenticatedRoute(c *gin.Context, kind string) {
	if !requireProductionMaterialIssuanceHTTPDocumentIdentityWithoutQueryParameters(c) {
		return
	}
	// The route supplies the action and document; authentication supplies the
	// operator. None can be overridden by fields in the JSON body.
	var body struct {
		CommandID       string                                                      `json:"commandId"`
		ExpectedVersion int                                                         `json:"expectedVersion"`
		Reason          string                                                      `json:"reason"`
		Materials       []services.ProductionMaterialIssuanceWarehouseMaterialInput `json:"materials"`
	}
	if err := decodeProductionMaterialIssuanceStrictHTTPRequest(c, &body); err != nil {
		respondToProductionMaterialIssuanceCommandError(c, err)
		return
	}
	if !isCanonicalProductionMaterialIssuanceHTTPUUID(body.CommandID) {
		respondToProductionMaterialIssuanceCommandError(c, services.ErrProductionMaterialIssuanceInvalidRequest)
		return
	}
	for _, material := range body.Materials {
		if !isCanonicalProductionMaterialIssuanceHTTPUUID(material.MaterialID) {
			respondToProductionMaterialIssuanceCommandError(c, services.ErrProductionMaterialIssuanceInvalidRequest)
			return
		}
		for _, allocation := range material.Allocations {
			if allocation.OriginalAllocationID != nil && !isCanonicalProductionMaterialIssuanceHTTPUUID(*allocation.OriginalAllocationID) {
				respondToProductionMaterialIssuanceCommandError(c, services.ErrProductionMaterialIssuanceInvalidRequest)
				return
			}
		}
	}
	result, err := services.ConfirmProductionMaterialIssuanceWarehouseMovement(c.Request.Context(), db.DB, services.ProductionMaterialIssuanceCommandActor{
		UserID: middleware.GetSafeUserID(c), Username: middleware.GetSafeUsername(c), IP: c.ClientIP(),
	}, services.ProductionMaterialIssuanceWarehouseConfirmationRequest{
		CommandID: body.CommandID, DocumentID: c.Param("id"), ExpectedVersion: body.ExpectedVersion,
		Kind: kind, Reason: body.Reason, Materials: body.Materials,
	})
	if err != nil {
		respondToProductionMaterialIssuanceCommandError(c, err)
		return
	}
	c.Header("Cache-Control", "no-store")
	c.JSON(http.StatusOK, result)
}
