package handlers

import (
	"net/http"
	"strconv"
	"xdfc-server/services"

	"github.com/gin-gonic/gin"
)

func GetProductTemplatesHandler(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("pageSize", "50"))
	if page < 1 {
		page = 1
	}
	if pageSize < 1 {
		pageSize = 50
	}

	isOptions := c.Query("options") == "true"
	items, total, err := services.ListProductTemplates(services.ProductTemplateListQuery{
		Page:     page,
		PageSize: pageSize,
		Options:  isOptions,
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] failed to fetch product templates: " + err.Error()})
		return
	}

	if isOptions {
		c.JSON(http.StatusOK, mapProductTemplatesToResponseDTOs(items))
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"items":    mapProductTemplatesToResponseDTOs(items),
		"total":    total,
		"page":     page,
		"pageSize": pageSize,
	})
}

func SaveProductTemplateHandler(c *gin.Context) {
	var input services.SaveProductTemplateInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] invalid product template payload: " + err.Error()})
		return
	}

	saved, err := services.SaveProductTemplate(input)

	if err != nil {
		respondDomainError(c, err, "[SERVER] failed to save product template: ")
		return
	}

	c.JSON(http.StatusOK, mapProductTemplateToResponseDTO(saved))
}

func PatchProductTemplateHandler(c *gin.Context) {
	id := c.Param("id")
	var req services.SDRTSDeltaHandlerRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] invalid product template patch payload: " + err.Error()})
		return
	}

	updates, err := services.BuildProductTemplateUpdates(req.Delta)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] invalid product template delta: " + err.Error()})
		return
	}

	saved, err := services.PatchProductTemplate(id, int(req.Metadata.Version), updates)
	if err != nil {
		respondDomainError(c, err, "[SERVER] failed to patch product template: ")
		return
	}

	c.JSON(http.StatusOK, mapProductTemplateToResponseDTO(saved))
}

func DeleteProductTemplateHandler(c *gin.Context) {
	id := c.Param("id")
	if err := services.DeleteProductTemplate(id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] failed to delete product template: " + err.Error()})
		return
	}
	c.Status(http.StatusNoContent)
}

func SyncProductTemplatesHandler(c *gin.Context) {
	var input []services.BulkSyncProductTemplateInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] invalid bulk template payload: " + err.Error()})
		return
	}

	if err := services.SyncProductTemplates(input); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] bulk template sync failed: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"status": "success", "count": len(input)})
}
