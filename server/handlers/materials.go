package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"xdfc-server/db"
	"xdfc-server/models"

	"github.com/gin-gonic/gin"
	"github.com/redis/go-redis/v9"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

var ctx = context.Background()

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
		NotifyCacheInvalidate("material-archive") // 触发器：全局 WebSocket 失效广播
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
			c.Data(http.StatusOK, "application/json; charset=utf-8", []byte(cached))
			return
		}
	}

	var total int64
	query := db.DB.Model(&models.Material{})

	if category != "" && category != "ALL" {
		query = query.Where("category = ?", category)
	}

	if search != "" {
		searchPattern := "%" + search + "%"
		// 搜索名称或编码
		query = query.Where("name ILIKE ? OR code ILIKE ?", searchPattern, searchPattern)
	}

	// 1. 获取全局轻量化下拉字典
	if isOptions {
		var options []struct {
			ID       string `json:"id"`
			Code     string `json:"code"`
			Name     string `json:"name"`
			Spec     string `json:"spec"`
			Uom      string `json:"uom"`
			Category string `json:"category"`
			Status   string `json:"status"`
		}
		if err := query.Order("code asc").Select("id, code, name, spec, uom, category, status").Find(&options).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] 获取字典失败: " + err.Error()})
			return
		}

		response := gin.H{"data": options, "version": ver}

		if db.RDB != nil {
			if jsonBytes, err := json.Marshal(response); err == nil {
				db.RDB.Set(ctx, cacheKey, jsonBytes, 0) // 无过期，依赖大版本触发失效
			}
		}
		c.JSON(http.StatusOK, response)
		return
	}

	// 2. 获取原生全量档案 (带物理分页)
	query.Count(&total)

	var materials []models.Material
	if err := query.Order("code asc").Limit(pageSize).Offset((page - 1) * pageSize).Find(&materials).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] 获取分页物料失败: " + err.Error()})
		return
	}

	response := gin.H{
		"data":     materials,
		"total":    total,
		"page":     page,
		"pageSize": pageSize,
		"version":  ver, // Export current sync version
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
	var input models.Material
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] 物料数据格式错误: " + err.Error()})
		return
	}

	err := db.DB.Transaction(func(tx *gorm.DB) error {
		if input.ID != "" {
			var existing models.Material
			if err := tx.Where("id = ?", input.ID).First(&existing).Error; err == nil {
				input.MasterDataControl.MergeMissingFrom(existing.MasterDataControl, "R1")
				// 乐观锁校验
				if input.Version != existing.Version {
					return ErrVersionConflict
				}
				input.Version = existing.Version + 1
				return tx.Model(&existing).Updates(input).Error
			}
		}

		input.MasterDataControl.Normalize("R1")
		input.Version = 1
		return tx.Create(&input).Error
	})

	if err != nil {
		if err == ErrVersionConflict {
			respondVersionConflict(c)
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] 保存物料失败: " + err.Error()})
		return
	}

	incrMaterialCacheVersion() // 触发器：使所有查询缓存基于命名空间失效
	c.JSON(http.StatusOK, input)
}

// BulkSyncMaterialsHandler 批量同步物料 (数据抢救)
func BulkSyncMaterialsHandler(c *gin.Context) {
	if !enforceBulkSyncRole(c) {
		return
	}

	var input struct {
		Materials     []models.Material `json:"materials"`
		GlobalVersion int               `json:"globalVersion"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] 批量同步数据错误: " + err.Error()})
		return
	}

	err := db.DB.Transaction(func(tx *gorm.DB) error {
		for _, m := range input.Materials {
			m.MasterDataControl.Normalize("R1")

			if err := tx.Clauses(clause.OnConflict{
				Columns:   []clause.Column{{Name: "code"}},
				UpdateAll: true,
			}).Create(&m).Error; err != nil {
				return err
			}
		}
		return nil
	})

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] 批量同步物料失败: " + err.Error()})
		return
	}

	incrMaterialCacheVersion() // 触发器：批量写入刷新命名空间
	c.JSON(http.StatusOK, gin.H{"status": "success", "count": len(input.Materials)})
}

// DeleteMaterialHandler 删除物料 (加固：检查引用)
func DeleteMaterialHandler(c *gin.Context) {
	id := c.Param("id")

	// 1. 【审计校验】检查库存是否存在引用
	var invCount int64
	db.DB.Model(&models.Inventory{}).Where("material_id = ? AND quantity > 0", id).Count(&invCount)
	if invCount > 0 {
		c.JSON(http.StatusForbidden, gin.H{"error": "[BUSINESS_RULE_VIOLATION] 无法删除：该物料在库存中仍有余额"})
		return
	}

	// 2. 【审计校验】检查销售订单是否存在引用
	var orderCount int64
	db.DB.Model(&models.SalesOrderLine{}).Where("product_id = ?", id).Count(&orderCount)
	if orderCount > 0 {
		c.JSON(http.StatusForbidden, gin.H{"error": "[BUSINESS_RULE_VIOLATION] 无法删除：该物料已被销售订单引用，请先作废相关订单"})
		return
	}

	// 3. 【审计校验】检查 BOM 结构层是否存在引用
	var bomCount int64
	db.DB.Model(&models.BOMItem{}).Where("material_id = ?", id).Count(&bomCount)
	if bomCount > 0 {
		c.JSON(http.StatusForbidden, gin.H{"error": "[BUSINESS_RULE_VIOLATION] 无法彻底销毁：此物料已在系统现存 BOM 配方中作为核心组件被固定。为保证配方历史审查完整性，该物料已被锁定；如果不再使用，请修改其状态为【归档/Archived】进行封存，切勿物理删除。"})
		return
	}

	// 4. 【审计校验】检查采购记录是否产生过流水
	var purchaseCount int64
	db.DB.Model(&models.PurchaseOrderLine{}).Where("material_id = ?", id).Count(&purchaseCount)
	if purchaseCount > 0 {
		c.JSON(http.StatusForbidden, gin.H{"error": "[BUSINESS_RULE_VIOLATION] 无法彻底销毁：此物料曾出现在过往的合法采购流水单中，属于财务对账溯源的关键凭证。建议您将其状态修改为【停用/Inactive】以保护历史订单账本完整性。"})
		return
	}

	if err := db.DB.Delete(&models.Material{}, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] 删除物料失败: " + err.Error()})
		return
	}
	incrMaterialCacheVersion() // 触发器：删除后命名空间失效
	c.Status(http.StatusNoContent)
}
