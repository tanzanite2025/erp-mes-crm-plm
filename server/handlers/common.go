package handlers

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"strings"
	"xdfc-server/db"
	"xdfc-server/models"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

var ErrVersionConflict = errors.New("version conflict")

const versionConflictMessage = "数据已被更新，请刷新后重试"

// respondVersionConflict 统一返回乐观锁冲突响应（不改变业务逻辑，仅标准化返回）
func respondVersionConflict(c *gin.Context) {
	c.JSON(http.StatusConflict, gin.H{
		"error": versionConflictMessage,
		"code":  "CONFLICT",
	})
}

func normalizeOptionalUUIDString(value string) (string, error) {
	trimmed := strings.TrimSpace(value)
	if trimmed == "" {
		return "", nil
	}

	parsed, err := uuid.Parse(trimmed)
	if err != nil {
		return "", err
	}

	return parsed.String(), nil
}

func saveUnitRecord(unit *models.Unit) error {
	if strings.TrimSpace(unit.ID) == "" {
		return db.DB.Create(unit).Error
	}

	var existing models.Unit
	if err := db.DB.First(&existing, "id = ?", unit.ID).Error; err != nil {
		return err
	}

	updates := map[string]interface{}{
		"code":        unit.Code,
		"name":        unit.Name,
		"category":    unit.Category,
		"precision":   unit.Precision,
		"status":      unit.Status,
		"is_system":   unit.IsSystem,
		"description": unit.Description,
	}
	return db.DB.Model(&existing).Updates(updates).Error
}

func buildUnitUpdates(payload map[string]json.RawMessage) (map[string]interface{}, error) {
	updates := make(map[string]interface{})
	for key, raw := range payload {
		switch key {
		case "code", "name", "category", "status", "description":
			var value string
			if err := json.Unmarshal(raw, &value); err != nil {
				return nil, err
			}
			updates[key] = value
		case "precision":
			var value int
			if err := json.Unmarshal(raw, &value); err != nil {
				return nil, err
			}
			updates[key] = value
		case "isSystem":
			var value bool
			if err := json.Unmarshal(raw, &value); err != nil {
				return nil, err
			}
			updates["is_system"] = value
		case "id", "createdAt", "updatedAt":
		default:
			return nil, errors.New("unsupported unit field: " + key)
		}
	}
	return updates, nil
}

func patchUnitRecord(id string, updates map[string]interface{}) error {
	var existing models.Unit
	if err := db.DB.First(&existing, "id = ?", id).Error; err != nil {
		return err
	}
	return db.DB.Model(&existing).Updates(updates).Error
}

// GetUnitsHandler 获取所有计量单位
func GetUnitsHandler(c *gin.Context) {
	ctx := context.Background()
	cacheKey := "global:cache:units"

	// 1. 内存常驻直出 (Bypass GORM)
	if cachedData, err := db.RDB.Get(ctx, cacheKey).Result(); err == nil && cachedData != "" {
		c.Data(http.StatusOK, "application/json", []byte(cachedData))
		return
	}

	// 2. 缓存未击中，常规拉取
	var units []models.Unit
	if err := db.DB.Order("category, code").Find(&units).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// 3. 构建新的内存常驻序列
	if jsonBytes, err := json.Marshal(units); err == nil {
		db.RDB.Set(ctx, cacheKey, string(jsonBytes), 0) // 永不过期，靠写入操作硬驱逐
	}

	c.JSON(http.StatusOK, units)
}

// SaveUnitHandler 保存/更新计量单位
func SaveUnitHandler(c *gin.Context) {
	payload, body, err := decodeJSONBodyMap(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if rawID, ok := payload["id"]; ok {
		var id string
		if err := json.Unmarshal(rawID, &id); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		updates, err := buildUnitUpdates(payload)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		if err := patchUnitRecord(id, updates); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		var unit models.Unit
		if err := db.DB.First(&unit, "id = ?", id).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		if db.RDB != nil {
			db.RDB.Del(context.Background(), "global:cache:units")
		}
		c.JSON(http.StatusOK, unit)
		return
	}

	var unit models.Unit
	if err := json.Unmarshal(body, &unit); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := saveUnitRecord(&unit); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// 清洗常驻内存
	if db.RDB != nil {
		db.RDB.Del(context.Background(), "global:cache:units")
	}

	c.JSON(http.StatusOK, unit)
}

// BulkSyncUnitsHandler 批量同步计量单位 (用于数据抢救)
func BulkSyncUnitsHandler(c *gin.Context) {
	if !enforceBulkSyncRole(c) {
		return
	}

	var units []models.Unit
	if err := c.ShouldBindJSON(&units); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	err := db.DB.Transaction(func(tx *gorm.DB) error {
		for _, u := range units {
			// 解决冲突：如果 code 已经存在，则更新名称、分类、精度和描述
			if err := tx.Clauses(clause.OnConflict{
				Columns:   []clause.Column{{Name: "code"}},
				UpdateAll: true,
			}).Create(&u).Error; err != nil {
				return err
			}
		}
		return nil
	})

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// 清洗常驻内存
	db.RDB.Del(context.Background(), "global:cache:units")

	c.JSON(http.StatusOK, gin.H{"status": "success", "count": len(units)})
}

// DeleteUnitHandler 删除计量单位
func DeleteUnitHandler(c *gin.Context) {
	id := c.Param("id")
	if err := db.DB.Delete(&models.Unit{}, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] 删除单位失败: " + err.Error()})
		return
	}

	// 清洗常驻内存
	db.RDB.Del(context.Background(), "global:cache:units")

	c.Status(http.StatusNoContent)
}
