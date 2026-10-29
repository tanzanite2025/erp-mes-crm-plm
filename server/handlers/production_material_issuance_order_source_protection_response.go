package handlers

import (
	"errors"
	"net/http"
	"xdfc-server/services"

	"github.com/gin-gonic/gin"
)

func respondToProtectedProductionMaterialIssuanceOrderSource(c *gin.Context, err error) bool {
	if !errors.Is(err, services.ErrProductionMaterialIssuanceOrderProtected) {
		return false
	}
	c.JSON(http.StatusConflict, gin.H{"error": err.Error(), "code": "PRODUCTION_MATERIAL_SOURCE_PROTECTED"})
	return true
}
