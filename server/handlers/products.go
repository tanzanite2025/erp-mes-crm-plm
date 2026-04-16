package handlers

import (
	"errors"
	"net/http"
	"strconv"
	"xdfc-server/services"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

func GetProductsHandler(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("pageSize", "50"))
	if page < 1 {
		page = 1
	}
	if pageSize < 1 {
		pageSize = 50
	}

	isOptions := c.Query("options") == "true"
	items, total, err := services.ListProducts(services.ProductListQuery{
		Page:     page,
		PageSize: pageSize,
		Options:  isOptions,
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] failed to fetch product list: " + err.Error()})
		return
	}

	if isOptions {
		c.JSON(http.StatusOK, toProductApiDTOs(items))
		return
	}

	c.JSON(http.StatusOK, ProductListPageApiDTO{
		Items:    toProductApiDTOs(items),
		Total:    total,
		Page:     page,
		PageSize: pageSize,
	})
}

func GetProductHandler(c *gin.Context) {
	id := c.Param("id")
	product, err := services.GetProductByID(id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "[CRITICAL] product not found: " + id})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] failed to fetch product: " + err.Error()})
		return
	}
	c.JSON(http.StatusOK, toProductApiDTO(product))
}

func SaveProductHandler(c *gin.Context) {
	var input services.SaveProductAPIRequest
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] invalid product payload: " + err.Error()})
		return
	}

	saved, err := services.SaveProduct(input)

	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "[CRITICAL] product not found"})
			return
		}
		respondDomainError(c, err, "[SERVER] failed to save product: ")
		return
	}

	c.JSON(http.StatusOK, toProductApiDTO(saved))
}

func PatchProductHandler(c *gin.Context) {
	id := c.Param("id")
	var req services.SDRTSDeltaHandlerRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] invalid product patch payload: " + err.Error()})
		return
	}

	saved, err := services.PatchProduct(id, int(req.Metadata.Version), req.Delta)
	if err != nil {
		switch {
		case errors.Is(err, gorm.ErrRecordNotFound):
			c.JSON(http.StatusNotFound, gin.H{"error": "[CRITICAL] product not found"})
		default:
			respondDomainError(c, err, "[SERVER] failed to patch product: ")
		}
		return
	}

	c.JSON(http.StatusOK, toProductApiDTO(saved))
}

func DeleteProductHandler(c *gin.Context) {
	id := c.Param("id")
	if err := services.DeleteProduct(id); err != nil {
		respondDomainError(c, err, "[SERVER] failed to delete product: ")
		return
	}

	c.Status(http.StatusNoContent)
}

func GetNextProductCodeHandler(c *gin.Context) {
	typeID := c.Query("typeId")
	nextCode, err := services.GetNextProductModelCode(typeID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] failed to allocate next product model code: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"nextCode": nextCode})
}

func BulkSyncProductsHandler(c *gin.Context) {
	if !enforceBulkSyncPermissions(c) {
		return
	}

	var input services.BulkSyncProductsAPIPayload
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] invalid bulk product payload: " + err.Error()})
		return
	}

	if err := services.BulkSyncProducts(input); err != nil {
		respondDomainError(c, err, "[SERVER] bulk product sync failed: ")
		return
	}

	c.JSON(http.StatusOK, gin.H{"status": "success", "count": len(input.Products)})
}
