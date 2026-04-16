package handlers

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"net/http"
	"strconv"
	"xdfc-server/db"
	"xdfc-server/services"

	"github.com/gin-gonic/gin"
	"github.com/redis/go-redis/v9"
)

var ctx = context.Background()

func jsonFieldIsArray(payload map[string]json.RawMessage, field string) bool {
	raw, ok := payload[field]
	if !ok {
		return false
	}

	var items []json.RawMessage
	return json.Unmarshal(raw, &items) == nil
}

func jsonFieldIsString(payload map[string]json.RawMessage, field string) bool {
	raw, ok := payload[field]
	if !ok {
		return false
	}

	var value string
	return json.Unmarshal(raw, &value) == nil
}

func jsonFieldIsNumber(payload map[string]json.RawMessage, field string) bool {
	raw, ok := payload[field]
	if !ok {
		return false
	}

	var value float64
	return json.Unmarshal(raw, &value) == nil
}

func isValidMaterialCachePayload(cached []byte, isOptions bool) bool {
	var payload map[string]json.RawMessage
	if err := json.Unmarshal(cached, &payload); err != nil {
		return false
	}

	if !jsonFieldIsArray(payload, "items") || !jsonFieldIsString(payload, "version") {
		return false
	}

	if isOptions {
		return true
	}

	return jsonFieldIsNumber(payload, "total") &&
		jsonFieldIsNumber(payload, "page") &&
		jsonFieldIsNumber(payload, "pageSize")
}

func getMaterialCacheVersion() string {
	if db.RDB == nil {
		return "v1"
	}
	ver, err := db.RDB.Get(ctx, "global:materials:ver").Result()
	if err == redis.Nil || err != nil {
		db.RDB.Set(ctx, "global:materials:ver", 1, 0)
		return "1"
	}
	return ver
}

func incrMaterialCacheVersion() {
	if db.RDB != nil {
		db.RDB.Incr(ctx, "global:materials:ver")
		NotifyCacheInvalidate("material-archive")
	}
}

// GetMaterialsHandler 获取物料列表（双轨制支持：轻量化 Options 或 重量物理分页）
func GetMaterialsHandler(c *gin.Context) {
	category := c.Query("category")
	search := c.Query("search")
	isOptions := c.Query("options") == "true"
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("pageSize", "20"))

	ver := getMaterialCacheVersion()
	cacheKey := fmt.Sprintf("materials:%s:cat:%s:search:%s:options:%v:page:%d:size:%d", ver, category, search, isOptions, page, pageSize)

	if db.RDB != nil {
		if cached, err := db.RDB.Get(ctx, cacheKey).Result(); err == nil {
			cachedBytes := []byte(cached)
			if isValidMaterialCachePayload(cachedBytes, isOptions) {
				c.Data(http.StatusOK, "application/json; charset=utf-8", cachedBytes)
				return
			}

			log.Printf("[CACHE_INVALID] Dropping stale materials cache key=%s options=%v", cacheKey, isOptions)
			_ = db.RDB.Del(ctx, cacheKey).Err()
		}
	}

	if isOptions {
		options, err := services.ListMaterialOptions(category, search)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] 获取字典失败: " + err.Error()})
			return
		}

		response := MaterialOptionsApiDTO{
			Items:   toMaterialOptionApiDTOs(options),
			Version: ver,
		}
		if db.RDB != nil {
			if jsonBytes, err := json.Marshal(response); err == nil {
				db.RDB.Set(ctx, cacheKey, jsonBytes, 0)
			}
		}
		c.JSON(http.StatusOK, response)
		return
	}

	materials, total, err := services.ListMaterials(services.MaterialListPageQuery{
		Category: category,
		Search:   search,
		Page:     page,
		PageSize: pageSize,
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] 获取分页物料失败: " + err.Error()})
		return
	}

	response := MaterialListPageApiDTO{
		Items:    toMaterialApiDTOs(materials),
		Total:    total,
		Page:     page,
		PageSize: pageSize,
		Version:  ver,
	}
	if db.RDB != nil {
		if jsonBytes, err := json.Marshal(response); err == nil {
			db.RDB.Set(ctx, cacheKey, jsonBytes, 0)
		}
	}
	c.JSON(http.StatusOK, response)
}

// SaveMaterialHandler 新增或更新物料
func SaveMaterialHandler(c *gin.Context) {
	var input services.SaveMaterialAPIRequest
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] 物料数据格式错误: " + err.Error()})
		return
	}

	saved, err := services.SaveMaterial(input)
	if err != nil {
		if errors.Is(err, services.ErrMaterialVersionConflict) {
			respondVersionConflict(c)
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] 保存物料失败: " + err.Error()})
		return
	}

	incrMaterialCacheVersion()
	c.JSON(http.StatusOK, toMaterialApiDTO(saved))
}

// BulkSyncMaterialsHandler 批量同步物料 (数据抢救)
func BulkSyncMaterialsHandler(c *gin.Context) {
	if !enforceBulkSyncPermissions(c) {
		return
	}

	var input services.BulkSyncMaterialsAPIPayload
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] 批量同步数据错误: " + err.Error()})
		return
	}

	if err := services.BulkSyncMaterials(input); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] 批量同步物料失败: " + err.Error()})
		return
	}

	incrMaterialCacheVersion()
	c.JSON(http.StatusOK, gin.H{"status": "success", "count": len(input.Materials)})
}

// DeleteMaterialHandler 删除物料 (加固：检查引用)
func DeleteMaterialHandler(c *gin.Context) {
	id := c.Param("id")

	err := services.DeleteMaterial(id)
	if err != nil {
		switch {
		case errors.Is(err, services.ErrMaterialInInventory):
			c.JSON(http.StatusForbidden, gin.H{"error": "[BUSINESS_RULE_VIOLATION] 无法删除：该物料在库存中仍有余额"})
		case errors.Is(err, services.ErrMaterialLinkedSales):
			c.JSON(http.StatusForbidden, gin.H{"error": "[BUSINESS_RULE_VIOLATION] 无法删除：该物料已被销售订单引用，请先作废相关订单"})
		case errors.Is(err, services.ErrMaterialLinkedBOM):
			c.JSON(http.StatusForbidden, gin.H{"error": "[BUSINESS_RULE_VIOLATION] 无法彻底销毁：此物料已在系统现存 BOM 配方中作为核心组件被固定。为保证配方历史审查完整性，该物料已被锁定；如果不再使用，请修改其状态为【归档/Archived】进行封存，切勿物理删除。"})
		case errors.Is(err, services.ErrMaterialLinkedPurchase):
			c.JSON(http.StatusForbidden, gin.H{"error": "[BUSINESS_RULE_VIOLATION] 无法彻底销毁：此物料曾出现在过往的合法采购流水单中，属于财务对账溯源的关键凭证。建议您将其状态修改为【停用/Inactive】以保护历史订单账本完整性。"})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] 删除物料失败: " + err.Error()})
		}
		return
	}

	incrMaterialCacheVersion()
	c.Status(http.StatusNoContent)
}
