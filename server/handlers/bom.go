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
		Status:    c.Query("status"),
		BOMType:   c.Query("bomType"),
	})
	if err != nil {
		// Check if it's a validation error
		if contains(err.Error(), "invalid status values") ||
			contains(err.Error(), "invalid BOM type values") {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		
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

	saved, err := services.SaveBOM(auditContextFromGin(c), input)
	if err != nil {
		if errors.Is(err, services.ErrBOMRelationSidecarInvalid) {
			c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] invalid BOM relation sidecar: " + err.Error()})
			return
		}
		if errors.Is(err, services.ErrBOMActiveConflict) {
			c.JSON(http.StatusConflict, gin.H{"error": "[VALIDATION] failed to save BOM: " + err.Error()})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] failed to save BOM: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, saved)
}

func DeleteBOMHandler(c *gin.Context) {
	id := c.Param("id")
	err := services.DeleteBOM(auditContextFromGin(c), id)
	if err != nil {
		if errors.Is(err, services.ErrBOMIDRequired) {
			c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] BOM ID is required"})
			return
		}
		if errors.Is(err, services.ErrBOMDeleteLockedActive) {
			c.JSON(http.StatusConflict, gin.H{"error": "[LOCKED_ASSET] failed to delete BOM: " + err.Error()})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] failed to delete BOM: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "BOM deleted"})
}

func PromoteBOMStatusHandler(c *gin.Context) {
	id := c.Param("id")
	var input services.PromoteBOMStatusInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] invalid promote payload: " + err.Error()})
		return
	}

	saved, err := services.PromoteBOMStatus(auditContextFromGin(c), id, input)
	if err != nil {
		if errors.Is(err, services.ErrBOMIDRequired) {
			c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] BOM ID is required"})
			return
		}
		if errors.Is(err, services.ErrBOMActiveConflict) {
			c.JSON(http.StatusConflict, gin.H{"error": "[VALIDATION] failed to promote BOM: " + err.Error()})
			return
		}
		// 处理并发冲突错误
		if err.Error() != "" && (contains(err.Error(), "CONFLICT") || contains(err.Error(), "modified by another user")) {
			c.JSON(http.StatusConflict, gin.H{"error": "[CONFLICT] " + err.Error()})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] failed to promote BOM: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, saved)
}

func contains(s, substr string) bool {
	return len(s) > 0 && len(substr) > 0 && (s == substr || len(s) >= len(substr) && findSubstring(s, substr))
}

func findSubstring(s, substr string) bool {
	for i := 0; i <= len(s)-len(substr); i++ {
		if s[i:i+len(substr)] == substr {
			return true
		}
	}
	return false
}

func DeriveMBOMFromEBOMHandler(c *gin.Context) {
	ebomID := c.Param("id")
	var input services.DeriveMBOMInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] invalid derive MBOM payload: " + err.Error()})
		return
	}

	saved, err := services.DeriveMBOMFromEBOM(auditContextFromGin(c), ebomID, input)
	if err != nil {
		if errors.Is(err, services.ErrBOMIDRequired) {
			c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] EBOM ID is required"})
			return
		}
		if errors.Is(err, services.ErrEBOMNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "[CRITICAL] Source EBOM not found: " + ebomID})
			return
		}
		if errors.Is(err, services.ErrInvalidBOMType) {
			c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] " + err.Error()})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] failed to derive MBOM: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, saved)
}
