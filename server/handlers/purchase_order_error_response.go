package handlers

import "github.com/gin-gonic/gin"

type purchaseOrderErrorResponse struct {
	Error string `json:"error"`
}

func respondPurchaseOrderError(c *gin.Context, status int, message string) {
	c.JSON(status, purchaseOrderErrorResponse{Error: message})
}
