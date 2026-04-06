package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"xdfc-server/db"
	"xdfc-server/models"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// clearDictCaches 清除由于字典变更导致的所有内存常驻缓存
func clearDictCaches() {
	ctx := context.Background()
	// 1. 清除分组缓存
	db.RDB.Del(ctx, "global:cache:dict:groups")

	// 2. 游标扫描并批量删除所有 entries 子组缓存及全量缓存
	var cursor uint64
	for {
		// 分批次获取以防止阻塞 Redis
		keys, nextCursor, err := db.RDB.Scan(ctx, cursor, "global:cache:dict:entries:*", 100).Result()
		if err != nil {
			break
		}
		if len(keys) > 0 {
			db.RDB.Del(ctx, keys...)
		}
		cursor = nextCursor
		if cursor == 0 {
			break
		}
	}
}

// GetDictGroupsHandler 获取所有字典组
func GetDictGroupsHandler(c *gin.Context) {
	ctx := context.Background()
	cacheKey := "global:cache:dict:groups"

	// 1. 直出内存
	if cachedData, err := db.RDB.Get(ctx, cacheKey).Result(); err == nil && cachedData != "" {
		c.Data(http.StatusOK, "application/json", []byte(cachedData))
		return
	}

	// 2. 兜底获取
	var groups []models.DictGroup
	if err := db.DB.Order("is_system desc, code asc").Find(&groups).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] 获取字典组失败: " + err.Error()})
		return
	}

	// 2.5 自愈逻辑：如果数据库中完全没有字典组，自动尝试触发一次 Seed
	if len(groups) == 0 {
		fmt.Println("[DICT_SELF_HEAL] 未检测到字典数据，尝试自动注入种子数据...")
		if err := db.SeedDictionary(db.DB); err == nil {
			// Seed 成功后重新查询
			db.DB.Order("is_system desc, code asc").Find(&groups)
			fmt.Printf("[DICT_SELF_HEAL] 注入成功，已恢复 %d 个分组\n", len(groups))
		}
	}

	// 3. 构建内存
	if jsonBytes, err := json.Marshal(groups); err == nil {
		db.RDB.Set(ctx, cacheKey, string(jsonBytes), 0)
	}

	c.JSON(http.StatusOK, groups)
}

// SaveDictGroupHandler 保存或更新字典组
func SaveDictGroupHandler(c *gin.Context) {
	var input models.DictGroup
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "无效的参数格式"})
		return
	}

	err := db.DB.Transaction(func(tx *gorm.DB) error {
		var existing models.DictGroup
		res := tx.Where("code = ?", input.Code).First(&existing)

		switch res.Error {
		case nil:
			return tx.Model(&existing).Updates(input).Error
		case gorm.ErrRecordNotFound:
			return tx.Create(&input).Error
		default:
			return res.Error
		}
	})

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] 保存字典组失败: " + err.Error()})
		return
	}

	clearDictCaches()
	c.JSON(http.StatusOK, gin.H{"message": "保存成功"})
}

// GetDictEntriesHandler 获取所有字典条目
func GetDictEntriesHandler(c *gin.Context) {
	groupID := c.Query("groupId")
	ctx := context.Background()

	cacheKey := "global:cache:dict:entries:ALL"
	if groupID != "" {
		cacheKey = "global:cache:dict:entries:" + groupID
	}

	// 1. 直出内存
	if cachedData, err := db.RDB.Get(ctx, cacheKey).Result(); err == nil && cachedData != "" {
		c.Data(http.StatusOK, "application/json", []byte(cachedData))
		return
	}

	// 2. 兜底查询
	var entries []models.DictEntry
	query := db.DB.Order("sort_order asc, code asc")
	if groupID != "" {
		query = query.Where("group_id = ?", groupID)
	}
	if err := query.Find(&entries).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] 获取字典项失败: " + err.Error()})
		return
	}

	// 3. 构建内存
	if jsonBytes, err := json.Marshal(entries); err == nil {
		db.RDB.Set(ctx, cacheKey, string(jsonBytes), 0)
	}

	c.JSON(http.StatusOK, entries)
}

// SaveDictEntryHandler 保存或更新字典条目
func SaveDictEntryHandler(c *gin.Context) {
	var input models.DictEntry
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "无效的参数格式"})
		return
	}

	err := db.DB.Transaction(func(tx *gorm.DB) error {
		var existing models.DictEntry
		res := tx.Where("code = ?", input.Code).First(&existing)

		switch res.Error {
		case nil:
			// 更新
			return tx.Model(&existing).Updates(input).Error
		case gorm.ErrRecordNotFound:
			// 新增
			return tx.Create(&input).Error
		default:
			return res.Error
		}
	})

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] 保存字典项失败: " + err.Error()})
		return
	}

	clearDictCaches()
	c.JSON(http.StatusOK, gin.H{"message": "保存成功"})
}

// SyncDictionaryHandler 同步系统内置字典 (API 入口)
func SyncDictionaryHandler(c *gin.Context) {
	if err := db.SeedDictionary(db.DB); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] 字典同步失败: " + err.Error()})
		return
	}

	clearDictCaches()
	c.JSON(http.StatusOK, gin.H{"message": "系统内置项同步完成"})
}

// BulkSyncDictionaryHandler 批量同步字典项 (高性能迁移接口)
func BulkSyncDictionaryHandler(c *gin.Context) {
	if !enforceBulkSyncRole(c) {
		return
	}

	var input struct {
		Groups  []models.DictGroup `json:"groups"`
		Entries []models.DictEntry `json:"entries"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "无效的参数格式"})
		return
	}

	err := db.DB.Transaction(func(tx *gorm.DB) error {
		// 1. 批量保存组
		for _, g := range input.Groups {
			if g.Code == "" {
				continue
			}
			var existing models.DictGroup
			if tx.Where("code = ?", g.Code).First(&existing).Error == nil {
				tx.Model(&existing).Updates(g)
			} else {
				tx.Create(&g)
			}
		}

		// 2. 批量保存项
		for _, e := range input.Entries {
			if e.Code == "" {
				continue
			}
			var existing models.DictEntry
			if tx.Where("code = ?", e.Code).First(&existing).Error == nil {
				tx.Model(&existing).Updates(e)
			} else {
				tx.Create(&e)
			}
		}
		return nil
	})

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] 批量同步失败: " + err.Error()})
		return
	}

	clearDictCaches()
	c.JSON(http.StatusOK, gin.H{"message": "批量同步成功", "groups_count": len(input.Groups), "entries_count": len(input.Entries)})
}
