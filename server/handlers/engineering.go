package handlers

import (
	"errors"
	"net/http"
	"strconv"
	"strings"
	"xdfc-server/services"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

func GetEngineeringSpecsHandler(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("pageSize", "50"))
	if page < 1 {
		page = 1
	}
	if pageSize < 1 {
		pageSize = 50
	}

	isOptions := c.Query("options") == "true"
	items, total, err := services.ListEngineeringSpecs(services.EngineeringSpecListQuery{
		Page:     page,
		PageSize: pageSize,
		Options:  isOptions,
		SpecType: c.Query("type"),
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] failed to fetch engineering specs: " + err.Error()})
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

func GetEngineeringSpecHandler(c *gin.Context) {
	id := c.Param("id")
	spec, err := services.GetEngineeringSpecByID(id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "[CRITICAL] engineering spec not found: " + id})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] failed to fetch engineering spec: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, spec)
}

func SaveEngineeringSpecHandler(c *gin.Context) {
	var input services.SaveEngineeringSpecInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] invalid engineering spec payload: " + err.Error()})
		return
	}

	saved, err := services.SaveEngineeringSpec(input)
	if err != nil {
		switch {
		case errors.As(err, new(*services.CuttingPlanValidationError)):
			c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] " + err.Error()})
		case errors.As(err, new(*services.PrepregMaterialSpecValidationError)):
			c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] " + err.Error()})
		case errors.Is(err, gorm.ErrRecordNotFound):
			c.JSON(http.StatusNotFound, gin.H{"error": "[CRITICAL] engineering spec not found"})
		case errors.Is(err, services.ErrEngineeringSpecVersionConflict):
			respondVersionConflict(c)
		case errors.Is(err, services.ErrEngineeringSpecDuplicateKey):
			c.JSON(http.StatusConflict, gin.H{"error": "[BUSINESS_RULE_VIOLATION] engineering spec duplicate normalized ratio key"})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] failed to save engineering spec: " + err.Error()})
		}
		return
	}

	c.JSON(http.StatusOK, saved)
}

func BulkSyncEngineeringSpecsHandler(c *gin.Context) {
	if !enforceBulkSyncPermissions(c) {
		return
	}

	var input []services.BulkSyncEngineeringSpecInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] invalid bulk engineering payload: " + err.Error()})
		return
	}

	if err := services.BulkSyncEngineeringSpecs(input); err != nil {
		if strings.Contains(err.Error(), "name/code is required") {
			c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] name/code is required"})
			return
		}
		if errors.Is(err, services.ErrEngineeringSpecDuplicateKey) {
			c.JSON(http.StatusConflict, gin.H{"error": "[BUSINESS_RULE_VIOLATION] engineering spec duplicate normalized ratio key"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] bulk engineering sync failed: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"status": "success", "count": len(input)})
}

func DeleteEngineeringSpecHandler(c *gin.Context) {
	id := c.Param("id")
	err := services.DeleteEngineeringSpec(id)
	if err != nil {
		switch {
		case errors.Is(err, services.ErrEngineeringSpecLinkedProducts), errors.Is(err, services.ErrEngineeringSpecLinkedBOM):
			c.JSON(http.StatusForbidden, gin.H{"error": "[BUSINESS_RULE_VIOLATION] engineering spec is still referenced"})
		case errors.Is(err, services.ErrEngineeringSpecLinkedDrilling):
			c.JSON(http.StatusForbidden, gin.H{"error": "[BUSINESS_RULE_VIOLATION] engineering spec linked by drilling plan"})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] failed to delete engineering spec: " + err.Error()})
		}
		return
	}

	c.Status(http.StatusNoContent)
}
