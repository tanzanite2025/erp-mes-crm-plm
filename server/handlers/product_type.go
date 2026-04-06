package handlers

import (
	"encoding/json"
	"net/http"
	"strconv"
	"xdfc-server/db"
	"xdfc-server/models"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// GetProductTypesHandler 获取所有产品分类 (树形结构，支持顶层分页)
func GetProductTypesHandler(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("pageSize", "50"))
	if page < 1 { page = 1 }
	if pageSize < 1 { pageSize = 50 }

	isOptions := c.Query("options") == "true"
	query := db.DB.Model(&models.ProductType{})

	if isOptions {
		var types []models.ProductType
		if err := query.Order("sort_order asc").Preload("Children", func(db *gorm.DB) *gorm.DB {
			return db.Order("sort_order asc")
		}).Find(&types).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] 获取分类选项失败: " + err.Error()})
			return
		}
		c.JSON(http.StatusOK, types)
		return
	}

	var total int64
	query.Count(&total)

	var items []models.ProductType
	if err := query.Order("sort_order asc").Preload("Children", func(db *gorm.DB) *gorm.DB {
		return db.Order("sort_order asc")
	}).Limit(pageSize).Offset((page - 1) * pageSize).Find(&items).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] 获取分类列表失败: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"items":    items,
		"total":    total,
		"page":     page,
		"pageSize": pageSize,
	})
}

func buildProductTypeUpdates(payload map[string]json.RawMessage) (map[string]interface{}, error) {
	updates := make(map[string]interface{})
	for key, raw := range payload {
		switch key {
		case "name", "code", "description":
			var value string
			if err := json.Unmarshal(raw, &value); err != nil {
				return nil, err
			}
			updates[key] = value
		case "active":
			var value bool
			if err := json.Unmarshal(raw, &value); err != nil {
				return nil, err
			}
			updates[key] = value
		case "sortOrder":
			var value int
			if err := json.Unmarshal(raw, &value); err != nil {
				return nil, err
			}
			updates["sort_order"] = value
		case "parentId", "templateId":
			if string(raw) == "null" {
				updates[key] = nil
				continue
			}
			var value string
			if err := json.Unmarshal(raw, &value); err != nil {
				return nil, err
			}
			updates[key] = value
		case "id", "createdAt", "updatedAt":
			// Skip metadata
		default:
			// IGNORED
		}
	}
	return updates, nil
}

func patchProductTypeRecord(id string, updates map[string]interface{}) error {
	var existing models.ProductType
	if err := db.DB.First(&existing, "id = ?", id).Error; err != nil {
		return err
	}
	return db.DB.Model(&existing).Updates(updates).Error
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
		updates, err := buildProductTypeUpdates(payload)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		if err := patchProductTypeRecord(id, updates); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] 差分保存分类失败: " + err.Error()})
			return
		}
		var pt models.ProductType
		db.DB.First(&pt, "id = ?", id)
		c.JSON(http.StatusOK, pt)
		return
	}

	var pt models.ProductType
	if err := json.Unmarshal(body, &pt); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] 分类格式错误"})
		return
	}

	if err := db.DB.Create(&pt).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] 创建分类失败: " + err.Error()})
		return
	}
	c.JSON(http.StatusOK, pt)
}

// SyncProductTypesHandler 批量同步产品分类 (用于初始化/迁移)
func SyncProductTypesHandler(c *gin.Context) {
	var types []models.ProductType
	if err := c.ShouldBindJSON(&types); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	err := db.DB.Transaction(func(tx *gorm.DB) error {
		for _, t := range types {
			if t.ID != "" {
				// 更新模式：局部同步，锁定审计标签 (CreatedAt)
				if err := tx.Model(&models.ProductType{}).Where("id = ?", t.ID).Omit("CreatedAt").Updates(&t).Error; err != nil {
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
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] 批量同步分类失败: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "分类同步成功", "count": len(types)})
}
