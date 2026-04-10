package handlers

import (
	"errors"
	"net/http"
	"strconv"
	"xdfc-server/models"
	"xdfc-server/services"

	"github.com/gin-gonic/gin"
)

func GetProductTypesHandler(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("pageSize", "50"))
	if page < 1 {
		page = 1
	}
	if pageSize < 1 {
		pageSize = 50
	}

	isOptions := c.Query("options") == "true"
	items, total, err := services.ListProductTypes(services.ProductTypeListQuery{
		Page:     page,
		PageSize: pageSize,
		Options:  isOptions,
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] failed to list product types: " + err.Error()})
		return
	}

	if isOptions {
		c.JSON(http.StatusOK, items)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"items":    items,
		"total":    total,
		"page":     page,
		"pageSize": pageSize,
	})
}

func SaveProductTypeHandler(c *gin.Context) {
	var pt models.ProductType
	if err := c.ShouldBindJSON(&pt); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] invalid product type payload: " + err.Error()})
		return
	}

	pt.ID = ""
	saved, err := services.CreateProductType(pt)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] failed to create product type: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, saved)
}

func PatchProductTypeHandler(c *gin.Context) {
	id := c.Param("id")
	var req services.SDRTSDeltaHandlerRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] invalid product type patch payload: " + err.Error()})
		return
	}

	updates, err := services.BuildProductTypeUpdates(req.Delta)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] invalid product type delta: " + err.Error()})
		return
	}

	saved, err := services.PatchProductType(id, int(req.Metadata.Version), updates)
	if err != nil {
		switch {
		case errors.Is(err, services.ErrProductTypeVersionConflict):
			c.JSON(http.StatusConflict, gin.H{"error": "version conflict", "code": "VERSION_CONFLICT"})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] failed to patch product type: " + err.Error()})
		}
		return
	}

	c.JSON(http.StatusOK, saved)
}

func DeleteProductTypeHandler(c *gin.Context) {
	id := c.Param("id")
	if err := services.DeleteProductType(id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] failed to delete product type: " + err.Error()})
		return
	}
	c.Status(http.StatusNoContent)
}

func SyncProductTypesHandler(c *gin.Context) {
	var types []services.SyncProductTypeInput
	if err := c.ShouldBindJSON(&types); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := services.SyncProductTypes(types); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] failed to sync product types: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "product types synced", "count": len(types)})
}
