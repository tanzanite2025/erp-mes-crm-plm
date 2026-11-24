package handlers

import (
	"errors"
	"net/http"
	"xdfc-server/services"

	"github.com/gin-gonic/gin"
)

func respondToProductionReferencedSalesOrderLine(c *gin.Context, err error) bool {
	if !errors.Is(err, services.ErrSalesOrderLineProtectedByProductionRouteOrPlan) {
		return false
	}
	c.JSON(http.StatusConflict, gin.H{"error": err.Error()})
	return true
}
