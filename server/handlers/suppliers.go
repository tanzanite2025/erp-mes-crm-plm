package handlers

import (
	"net/http"
	"strconv"
	"xdfc-server/db"
	"xdfc-server/models"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

// GetSuppliersHandler 获取供应商列表 (支持分页)
func GetSuppliersHandler(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("pageSize", "50"))
	if page < 1 {
		page = 1
	}
	if pageSize < 1 {
		pageSize = 50
	}

	isOptions := c.Query("options") == "true"
	query := db.DB.Model(&models.Supplier{}).Where("is_deleted = ?", false)

	if isOptions {
		var suppliers []models.Supplier
		if err := query.Order("name asc").Find(&suppliers).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] 获取供应商选项失败: " + err.Error()})
			return
		}
		c.JSON(http.StatusOK, suppliers)
		return
	}

	var total int64
	query.Count(&total)

	var items []models.Supplier
	if err := query.Order("name asc").Limit(pageSize).Offset((page - 1) * pageSize).Find(&items).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] 获取供应商列表失败: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"items":    items,
		"total":    total,
		"page":     page,
		"pageSize": pageSize,
	})
}

// SaveSupplierHandler 新增或更新供应商
func SaveSupplierHandler(c *gin.Context) {
	var input models.Supplier
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] 供应商数据格式错误: " + err.Error()})
		return
	}

	err := db.DB.Transaction(func(tx *gorm.DB) error {
		if input.ID != "" {
			var existing models.Supplier
			if err := tx.Where("id = ?", input.ID).First(&existing).Error; err == nil {
				// 乐观锁校验
				if input.Version != existing.Version {
					return ErrVersionConflict
				}
				input.Version = existing.Version + 1
				// 使用 Select("*") 确保零值字段正常更新
				return tx.Model(&existing).Select("*").Updates(input).Error
			}
		}

		input.Version = 1
		return tx.Create(&input).Error
	})

	if err != nil {
		if err == ErrVersionConflict {
			respondVersionConflict(c)
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] 保存供应商失败: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, input)
}

// DeleteSupplierHandler 逻辑删除供应商
func DeleteSupplierHandler(c *gin.Context) {
	id := c.Param("id")
	if err := db.DB.Model(&models.Supplier{}).Where("id = ?", id).Update("is_deleted", true).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] 删除供应商失败: " + err.Error()})
		return
	}
	c.Status(http.StatusNoContent)
}

// BulkSyncSuppliersHandler 批量同步供应商 (数据抢救)
func BulkSyncSuppliersHandler(c *gin.Context) {
	if !enforceBulkSyncRole(c) {
		return
	}

	var suppliers []models.Supplier
	if err := c.ShouldBindJSON(&suppliers); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] 批量同步数据错误: " + err.Error()})
		return
	}

	err := db.DB.Transaction(func(tx *gorm.DB) error {
		for _, s := range suppliers {
			if err := tx.Clauses(clause.OnConflict{
				Columns:   []clause.Column{{Name: "code"}},
				UpdateAll: true,
			}).Create(&s).Error; err != nil {
				return err
			}
		}
		return nil
	})

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] 批量同步失败: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"status": "success", "count": len(suppliers)})
}
