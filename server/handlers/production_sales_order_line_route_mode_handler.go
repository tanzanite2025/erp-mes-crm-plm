package handlers

import (
	"errors"
	"net/http"
	"strconv"
	"xdfc-server/middleware"
	"xdfc-server/services"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

func ResetSalesOrderLineProductionRouteToBranchDefaultHandler(c *gin.Context) {
	salesOrderLineID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil || salesOrderLineID == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid sales order line id"})
		return
	}
	if err := services.ResetSalesOrderLineProductionRouteToBranchDefault(
		uint(salesOrderLineID), middleware.GetSafeUsername(c), c.ClientIP(),
	); err != nil {
		if errors.Is(err, services.ErrProductionSalesOrderLineRouteModeLocked) {
			c.JSON(http.StatusConflict, gin.H{"error": err.Error()})
			return
		}
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "sales order line does not exist"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to restore branch default production operations"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "branch default production operations restored"})
}
