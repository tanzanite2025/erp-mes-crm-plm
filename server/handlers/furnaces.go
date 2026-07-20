package handlers

import (
	"net/http"
	"strconv"
	"xdfc-server/db"
	"xdfc-server/models"
	"xdfc-server/services"

	"github.com/gin-gonic/gin"
)

// GetFurnacesHandler 获取所有炉台 (支持分页)
func GetFurnacesHandler(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("pageSize", "50"))
	if page < 1 {
		page = 1
	}
	if pageSize < 1 {
		pageSize = 50
	}

	isOptions := c.Query("options") == "true"
	query := db.DB.Model(&models.Furnace{})

	if isOptions {
		var furnaces []models.Furnace
		if err := query.Order("created_at desc").Find(&furnaces).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] 获取炉台选项失败: " + err.Error()})
			return
		}
		c.JSON(http.StatusOK, gin.H{
			"items":    mapFurnaceResponses(furnaces),
			"total":    len(furnaces),
			"page":     1,
			"pageSize": len(furnaces),
			"version":  furnaceListVersion(furnaces),
		})
		return
	}

	var total int64
	query.Count(&total)

	var items []models.Furnace
	if err := query.Order("created_at desc").Limit(pageSize).Offset((page - 1) * pageSize).Find(&items).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] 获取炉台列表失败: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"items":    mapFurnaceResponses(items),
		"total":    total,
		"page":     page,
		"pageSize": pageSize,
		"version":  furnaceListVersion(items),
	})
}

// SaveFurnaceHandler 保存/创建炉台
func SaveFurnaceHandler(c *gin.Context) {
	var input services.SaveFurnaceRequest
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] 炉台格式错误"})
		return
	}

	furnace, err := services.NewEquipmentAssetService(db.DB).SaveFurnace(auditContextFromGin(c), input)
	if err != nil {
		respondDomainError(c, err, "[SERVER] 保存炉台资产失败: ")
		return
	}
	c.JSON(http.StatusOK, mapFurnaceResponse(furnace))
}

// PatchFurnaceHandler 局部更新炉台 (差分更新支持)
func PatchFurnaceHandler(c *gin.Context) {
	id := c.Param("id")
	var input services.SDRTSDeltaHandlerRequest
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] 无效的更新数据"})
		return
	}

	furnace, err := services.NewEquipmentAssetService(db.DB).PatchFurnace(auditContextFromGin(c), id, input.Delta)
	if err != nil {
		respondDomainError(c, err, "[SERVER] 更新炉台属性失败: ")
		return
	}
	c.JSON(http.StatusOK, mapFurnaceResponse(furnace))
}

// UpdateFurnaceTelemetryHandler 更新炉台遥测 (温度)
func UpdateFurnaceTelemetryHandler(c *gin.Context) {
	id := c.Param("id")
	var input struct {
		Temp float64 `json:"temp"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] 数据错误"})
		return
	}

	if err := services.NewEquipmentAssetService(db.DB).UpdateFurnaceTelemetry(auditContextFromGin(c), id, input.Temp); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] 更新遥测失败"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"status": "success"})
}

// BulkSyncFurnacesHandler 批量同步炉台 (数据抢救)
func BulkSyncFurnacesHandler(c *gin.Context) {
	if !enforceBulkSyncPermissions(c) {
		return
	}

	var furnaces []models.Furnace
	if err := c.ShouldBindJSON(&furnaces); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] 批量同步数据错误: " + err.Error()})
		return
	}

	if err := services.NewEquipmentAssetService(db.DB).BulkSyncFurnaces(auditContextFromGin(c), furnaces); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] 批量同步失败: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"status": "success", "count": len(furnaces)})
}
