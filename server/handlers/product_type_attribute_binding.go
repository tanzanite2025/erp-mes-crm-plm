package handlers

import (
	"errors"
	"net/http"
	"xdfc-server/models"
	"xdfc-server/services"

	"github.com/gin-gonic/gin"
)

func GetProductTypeAttributeBindingsHandler(c *gin.Context) {
	items, err := services.ListProductTypeAttributeBindings(services.ProductTypeAttributeBindingListQuery{
		ProductTypeID: c.Query("productTypeId"),
		ActiveOnly:    c.Query("activeOnly") == "true",
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] failed to list product type attribute bindings: " + err.Error()})
		return
	}
	c.JSON(http.StatusOK, items)
}

func SaveProductTypeAttributeBindingHandler(c *gin.Context) {
	var input models.ProductTypeAttributeBinding
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] invalid product type attribute binding payload: " + err.Error()})
		return
	}

	input.ID = ""
	saved, err := services.CreateProductTypeAttributeBinding(input)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] failed to create product type attribute binding: " + err.Error()})
		return
	}
	c.JSON(http.StatusOK, saved)
}

func PatchProductTypeAttributeBindingHandler(c *gin.Context) {
	id := c.Param("id")
	var req services.SDRTSDeltaHandlerRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] invalid product type attribute binding patch payload: " + err.Error()})
		return
	}

	updates, err := services.BuildProductTypeAttributeBindingUpdates(req.Delta)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] invalid product type attribute binding delta: " + err.Error()})
		return
	}

	saved, err := services.PatchProductTypeAttributeBinding(id, int(req.Metadata.Version), updates)
	if err != nil {
		switch {
		case errors.Is(err, services.ErrProductTypeAttributeBindingVersionConflict):
			respondVersionConflict(c)
		default:
			c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] failed to patch product type attribute binding: " + err.Error()})
		}
		return
	}

	c.JSON(http.StatusOK, saved)
}

func SyncProductTypeAttributeBindingsHandler(c *gin.Context) {
	var input services.SyncProductTypeAttributeBindingsInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] invalid product type attribute binding sync payload: " + err.Error()})
		return
	}
	if err := services.SyncProductTypeAttributeBindings(input); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] failed to sync product type attribute bindings: " + err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "product type attribute bindings synced", "count": len(input.Bindings)})
}

func DeleteProductTypeAttributeBindingHandler(c *gin.Context) {
	id := c.Param("id")
	if id == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] missing id"})
		return
	}
	if err := services.DeleteProductTypeAttributeBinding(id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] failed to delete product type attribute binding: " + err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "deleted"})
}
