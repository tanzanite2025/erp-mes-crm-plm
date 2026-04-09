package handlers

import (
	"encoding/json"
	"net/http"
	"strconv"
	"xdfc-server/models"
	"xdfc-server/services"

	"github.com/gin-gonic/gin"
)

// GetProductTypesHandler 获取所有产品分类 (树形结构，支持顶层分页)
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
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] 获取分类列表失败: " + err.Error()})
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

// SaveProductTypeHandler 保存单个产品分类
func SaveProductTypeHandler(c *gin.Context) {
	payload, body, err := decodeJSONBodyMap(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] 无效的 JSON 映射"})
		return
	}

	if rawID, ok := payload["id"]; ok && string(rawID) != "null" && string(rawID) != `""` {
		var id string
		if err := json.Unmarshal(rawID, &id); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] 无效的 ID 格式"})
			return
		}
		updates, err := services.BuildProductTypeUpdates(payload)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		saved, err := services.PatchProductType(id, updates)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] 差分保存分类失败: " + err.Error()})
			return
		}
		c.JSON(http.StatusOK, saved)
		return
	}

	var pt models.ProductType
	if err := json.Unmarshal(body, &pt); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] 分类格式错误"})
		return
	}

	saved, err := services.CreateProductType(pt)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] 创建分类失败: " + err.Error()})
		return
	}
	c.JSON(http.StatusOK, saved)
}

// SyncProductTypesHandler 批量同步产品分类 (用于初始化/迁移)
func SyncProductTypesHandler(c *gin.Context) {
	var types []services.SyncProductTypeInput
	if err := c.ShouldBindJSON(&types); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := services.SyncProductTypes(types); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] 批量同步分类失败: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "分类同步成功", "count": len(types)})
}
