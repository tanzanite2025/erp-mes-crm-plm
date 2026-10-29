package handlers

import (
	"net/http"
	"xdfc-server/db"
	"xdfc-server/middleware"
	"xdfc-server/services"

	"github.com/gin-gonic/gin"
)

func respondToProductionMaterialIssuanceCommandError(c *gin.Context, err error) {
	respondToProductionMaterialIssuanceHTTPError(c, err, "PRODUCTION_MATERIAL_ISSUANCE_COMMAND_FAILED", "[CRITICAL] 生产领料操作未确认，请使用原请求重试或查询原单")
}

func DispatchProductionMaterialIssuanceReviewedBasisHandler(c *gin.Context) {
	if !requireAuthenticatedProductionMaterialIssuanceHTTPActor(c) {
		return
	}
	var request services.ProductionMaterialIssuanceDispatchRequest
	if err := decodeProductionMaterialIssuanceStrictHTTPRequest(c, &request); err != nil {
		respondToProductionMaterialIssuanceCommandError(c, err)
		return
	}
	if !isCanonicalProductionMaterialIssuanceHTTPUUID(request.CommandID) {
		respondToProductionMaterialIssuanceCommandError(c, services.ErrProductionMaterialIssuanceInvalidRequest)
		return
	}
	for _, source := range request.Sources {
		if !isCanonicalProductionMaterialIssuanceHTTPUUID(source.SalesOrderID) || !isCanonicalProductionMaterialIssuanceHTTPUUID(source.BOMID) {
			respondToProductionMaterialIssuanceCommandError(c, services.ErrProductionMaterialIssuanceInvalidRequest)
			return
		}
	}
	result, err := services.DispatchProductionMaterialIssuanceDocument(c.Request.Context(), db.DB, services.ProductionMaterialIssuanceCommandActor{
		UserID: middleware.GetSafeUserID(c), Username: middleware.GetSafeUsername(c), IP: c.ClientIP(),
	}, request)
	if err != nil {
		respondToProductionMaterialIssuanceCommandError(c, err)
		return
	}
	c.Header("Cache-Control", "no-store")
	c.JSON(http.StatusOK, result)
}

func WithdrawProductionMaterialIssuanceDocumentWithExpectedVersionHandler(c *gin.Context) {
	if !requireAuthenticatedProductionMaterialIssuanceHTTPActor(c) {
		return
	}
	// Identity comes from the route, never a second caller-provided body identity.
	var body struct {
		CommandID       string `json:"commandId"`
		ExpectedVersion int    `json:"expectedVersion"`
		Reason          string `json:"reason"`
	}
	if err := decodeProductionMaterialIssuanceStrictHTTPRequest(c, &body); err != nil {
		respondToProductionMaterialIssuanceCommandError(c, err)
		return
	}
	if !isCanonicalProductionMaterialIssuanceHTTPUUID(body.CommandID) || !isCanonicalProductionMaterialIssuanceHTTPUUID(c.Param("id")) {
		respondToProductionMaterialIssuanceCommandError(c, services.ErrProductionMaterialIssuanceInvalidRequest)
		return
	}
	result, err := services.WithdrawProductionMaterialIssuanceDocument(c.Request.Context(), db.DB, services.ProductionMaterialIssuanceCommandActor{
		UserID: middleware.GetSafeUserID(c), Username: middleware.GetSafeUsername(c), IP: c.ClientIP(),
	}, services.ProductionMaterialIssuanceWithdrawalRequest{CommandID: body.CommandID, DocumentID: c.Param("id"), ExpectedVersion: body.ExpectedVersion, Reason: body.Reason})
	if err != nil {
		respondToProductionMaterialIssuanceCommandError(c, err)
		return
	}
	c.Header("Cache-Control", "no-store")
	c.JSON(http.StatusOK, result)
}
