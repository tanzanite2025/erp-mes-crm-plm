package handlers

import (
	"net/http"
	"xdfc-server/middleware"
	"xdfc-server/services"

	"github.com/gin-gonic/gin"
)

func GetCutSizeInventoryHandler(c *gin.Context) {
	items, err := services.ListCutSizeInventory()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] failed to load cut size inventory: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, items)
}

func RecordCutSizeInventoryHandler(c *gin.Context) {
	var req services.RecordCutSizeInventoryRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] invalid cut size inventory payload: " + err.Error()})
		return
	}

	response, err := services.RecordCutSizeInventory(req, middleware.GetSafeUsername(c))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, response)
}
