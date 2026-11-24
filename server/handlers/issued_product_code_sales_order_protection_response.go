package handlers

import (
	"errors"
	"net/http"
	"xdfc-server/services"

	"github.com/gin-gonic/gin"
)

func respondToProtectedIssuedProductCodeSalesOrder(c *gin.Context, err error) bool {
	if !errors.Is(err, services.ErrSalesOrderLineProtectedByIssuedProductCodeInventory) {
		return false
	}
	c.JSON(http.StatusConflict, gin.H{"error": err.Error(), "code": "SALES_ORDER_PROTECTED_BY_ISSUED_PRODUCT_CODES"})
	return true
}
