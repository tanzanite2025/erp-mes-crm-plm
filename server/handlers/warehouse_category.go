package handlers

import (
	"net/http"
	"strconv"
	"xdfc-server/db"
	"xdfc-server/models"

	"github.com/gin-gonic/gin"
)

// GetWarehouseCategoriesHandler 获取所有仓库分类 (支持分页)
func GetWarehouseCategoriesHandler(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("pageSize", "50"))
	if page < 1 { page = 1 }
	if pageSize < 1 { pageSize = 50 }

	isOptions := c.Query("options") == "true"
	query := db.DB.Model(&models.WarehouseCategory{})

	if isOptions {
		var categories []models.WarehouseCategory
		if err := query.Order("sort_order asc, code asc").Find(&categories).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] 获取仓库分类选项失败: " + err.Error()})
			return
		}
		c.JSON(http.StatusOK, categories) // 保持向前兼容数组格式
		return
	}

	var total int64
	query.Count(&total)

	var items []models.WarehouseCategory
	if err := query.Order("sort_order asc, code asc").Limit(pageSize).Offset((page - 1) * pageSize).Find(&items).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] 获取仓库分类失败: " + err.Error()})
		return
	}
	
	c.JSON(http.StatusOK, gin.H{
		"items":    items,
		"total":    total,
		"page":     page,
		"pageSize": pageSize,
	})
}

// SaveWarehouseCategoryHandler 保存或更新仓库分类
func SaveWarehouseCategoryHandler(c *gin.Context) {
	var input models.WarehouseCategory
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "无效的参数格式"})
		return
	}

	var existing models.WarehouseCategory
	res := db.DB.Where("code = ?", input.Code).First(&existing)
	
	if res.Error == nil {
		// 更新
		if err := db.DB.Model(&existing).Updates(input).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] 更新仓库分类失败"})
			return
		}
	} else {
		// 新建
		if err := db.DB.Create(&input).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] 创建仓库分类失败"})
			return
		}
	}

	c.JSON(http.StatusOK, gin.H{"message": "保存成功"})
}

// DeleteWarehouseCategoryHandler 删除仓库分类
func DeleteWarehouseCategoryHandler(c *gin.Context) {
	id := c.Param("id")
	var category models.WarehouseCategory
	if err := db.DB.Where("id = ?", id).First(&category).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "分类不存在"})
		return
	}

	if category.IsSystem {
		c.JSON(http.StatusForbidden, gin.H{"error": "系统内置分类不允许删除"})
		return
	}

	if err := db.DB.Delete(&category).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] 删除失败"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "删除成功"})
}
