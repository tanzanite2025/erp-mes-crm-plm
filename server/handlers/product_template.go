package handlers

import (
	"net/http"
	"strconv"
	"xdfc-server/db"
	"xdfc-server/models"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// GetProductTemplatesHandler 鑾峰彇鎵€鏈夎鏍兼ā鏉?(鏀寔鍒嗛〉)
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
	query := db.DB.Model(&models.ProductTemplate{})

	if isOptions {
		var templates []models.ProductTemplate
		if err := query.Order("created_at desc").Find(&templates).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] 鑾峰彇妯℃澘閫夐」澶辫触: " + err.Error()})
			return
		}
		c.JSON(http.StatusOK, templates)
		return
	}

	var total int64
	query.Count(&total)

	var items []models.ProductTemplate
	if err := query.Order("created_at desc").Limit(pageSize).Offset((page - 1) * pageSize).Find(&items).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] 鑾峰彇妯℃澘鍒楄〃澶辫触: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"items":    items,
		"total":    total,
		"page":     page,
		"pageSize": pageSize,
	})
}

// SaveProductTemplateHandler 淇濆瓨鎴栨洿鏂版ā鏉?
func SaveProductTemplateHandler(c *gin.Context) {
	var input models.ProductTemplate
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] 妯℃澘鏁版嵁鏍煎紡閿欒: " + err.Error()})
		return
	}

	var saved models.ProductTemplate
	err := db.DB.Transaction(func(tx *gorm.DB) error {
		if input.ID != "" {
			var existing models.ProductTemplate
			if err := tx.Where("id = ?", input.ID).First(&existing).Error; err != nil {
				return err
			}
			if input.Version != existing.Version {
				return ErrVersionConflict
			}

			input.MasterDataControl.MergeMissingFrom(existing.MasterDataControl, "R1")
			input.Version = existing.Version + 1
			if err := tx.Model(&existing).Updates(input).Error; err != nil {
				return err
			}
			return tx.First(&saved, "id = ?", existing.ID).Error
		}

		input.MasterDataControl.Normalize("R1")
		input.Version = 1
		if err := tx.Create(&input).Error; err != nil {
			return err
		}
		saved = input
		return nil
	})

	if err != nil {
		if err == ErrVersionConflict {
			respondVersionConflict(c)
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] 淇濆瓨妯℃澘澶辫触: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, saved)
}

// SyncProductTemplatesHandler 鎵归噺鍚屾妯℃澘 (鏁版嵁鎶㈡晳)
func SyncProductTemplatesHandler(c *gin.Context) {
	var input []models.ProductTemplate
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] 鎵归噺鍚屾鏁版嵁閿欒: " + err.Error()})
		return
	}

	err := db.DB.Transaction(func(tx *gorm.DB) error {
		for _, t := range input {
			t.MasterDataControl.Normalize("R1")
			if t.ID != "" {
				// 更新模式：局部同步，锁定审计标签 (CreatedAt)
				if err := tx.Model(&models.ProductTemplate{}).Where("id = ?", t.ID).Omit("CreatedAt", "CreatedBy").Updates(&t).Error; err != nil {
					return err
				}
			} else {
				// 新增模式
				if err := tx.Create(&t).Error; err != nil {
					return err
				}
			}
		}
		return nil
	})

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] 鎵归噺鍚屾妯℃澘澶辫触: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"status": "success", "count": len(input)})
}
