package handlers

import (
	"errors"
	"net/http"
	"strconv"
	"xdfc-server/services"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

func GetBOMsHandler(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("pageSize", "50"))
	if page < 1 {
		page = 1
	}
	if pageSize < 1 {
		pageSize = 50
	}

	isOptions := c.Query("options") == "true"
	items, total, err := services.ListBOMs(services.BOMListQuery{
		Page:      page,
		PageSize:  pageSize,
		Options:   isOptions,
		ProductID: c.Query("productId"),
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] failed to fetch BOM list: " + err.Error()})
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

func GetBOMHandler(c *gin.Context) {
	id := c.Param("id")
	bom, err := services.GetBOMByID(id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "[CRITICAL] BOM not found: " + id})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] failed to fetch BOM: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, bom)
}

func SaveBOMHandler(c *gin.Context) {
	var input services.SaveBOMInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] invalid BOM payload: " + err.Error()})
		return
	}

	saved, err := services.SaveBOM(input)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] failed to save BOM: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, saved)
}

func DeleteBOMHandler(c *gin.Context) {
	id := c.Param("id")
	err := services.DeleteBOM(id)
	if err != nil {
		if errors.Is(err, services.ErrBOMIDRequired) {
			c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] BOM ID is required"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] failed to delete BOM: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "BOM deleted"})
}
