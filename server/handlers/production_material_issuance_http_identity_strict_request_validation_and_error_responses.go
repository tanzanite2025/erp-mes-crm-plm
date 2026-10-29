package handlers

import (
	"encoding/json"
	"errors"
	"io"
	"log"
	"net/http"
	"strings"
	"xdfc-server/middleware"
	"xdfc-server/services"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

func requireAuthenticatedProductionMaterialIssuanceHTTPActor(c *gin.Context) bool {
	if strings.TrimSpace(middleware.GetSafeUserID(c)) == "" {
		c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "authentication required"})
		return false
	}
	return true
}

func isCanonicalProductionMaterialIssuanceHTTPUUID(value string) bool {
	parsed, err := uuid.Parse(value)
	return err == nil && parsed.String() == value
}

func requireProductionMaterialIssuanceHTTPDocumentIdentityWithoutQueryParameters(c *gin.Context) bool {
	if !requireAuthenticatedProductionMaterialIssuanceHTTPActor(c) {
		return false
	}
	if !isCanonicalProductionMaterialIssuanceHTTPUUID(c.Param("id")) || c.Request.URL.RawQuery != "" {
		respondToProductionMaterialIssuanceQueryError(c, services.ErrProductionMaterialIssuanceInvalidRequest)
		return false
	}
	return true
}

func decodeProductionMaterialIssuanceStrictHTTPRequest(c *gin.Context, destination any) error {
	c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, 256*1024)
	decoder := json.NewDecoder(c.Request.Body)
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(destination); err != nil {
		return services.ErrProductionMaterialIssuanceInvalidRequest
	}
	var trailing any
	if err := decoder.Decode(&trailing); err != io.EOF {
		return services.ErrProductionMaterialIssuanceInvalidRequest
	}
	return nil
}

func respondToProductionMaterialIssuanceHTTPError(c *gin.Context, err error, fallbackCode, fallbackMessage string) {
	status, code := http.StatusInternalServerError, fallbackCode
	switch {
	case errors.Is(err, services.ErrProductionMaterialIssuanceInvalidRequest), errors.Is(err, services.ErrInvalidProductionMaterialRequirementSelection):
		status, code = http.StatusBadRequest, "PRODUCTION_MATERIAL_ISSUANCE_INVALID_REQUEST"
	case errors.Is(err, services.ErrProductionMaterialIssuanceBasisChanged):
		status, code = http.StatusConflict, "PRODUCTION_MATERIAL_ISSUANCE_BASIS_CHANGED"
	case errors.Is(err, services.ErrProductionMaterialIssuanceSourceCovered):
		status, code = http.StatusConflict, "PRODUCTION_MATERIAL_ISSUANCE_SOURCE_COVERED"
	case errors.Is(err, services.ErrProductionMaterialIssuanceCommandReused):
		status, code = http.StatusConflict, "PRODUCTION_MATERIAL_ISSUANCE_COMMAND_REUSED"
	case errors.Is(err, services.ErrProductionMaterialIssuanceStockUnavailable):
		status, code = http.StatusConflict, "PRODUCTION_MATERIAL_ISSUANCE_STOCK_UNAVAILABLE"
	case errors.Is(err, services.ErrProductionMaterialIssuanceAllocationInvalid):
		status, code = http.StatusUnprocessableEntity, "PRODUCTION_MATERIAL_ISSUANCE_ALLOCATION_INVALID"
	case errors.Is(err, gorm.ErrRecordNotFound):
		status, code = http.StatusNotFound, "PRODUCTION_MATERIAL_ISSUANCE_NOT_FOUND"
	}
	message := err.Error()
	if status == http.StatusInternalServerError {
		log.Printf("[CRITICAL] production material issuance HTTP failed: %v", err)
		message = fallbackMessage
	}
	c.Header("Cache-Control", "no-store")
	c.JSON(status, gin.H{"error": message, "code": code})
}

func respondToProductionMaterialIssuanceQueryError(c *gin.Context, err error) {
	respondToProductionMaterialIssuanceHTTPError(c, err, "PRODUCTION_MATERIAL_ISSUANCE_QUERY_FAILED", "[CRITICAL] 生产领料依据读取失败，请重试或联系管理员")
}
