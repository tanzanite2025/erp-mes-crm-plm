package handlers

import (
	"encoding/json"
	"net/http"
	"strconv"
	"time"
	"xdfc-server/db"
	"xdfc-server/middleware"
	"xdfc-server/models"
	"xdfc-server/services"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// GetMoldsHandler 获取所有模具 (支持分页)
func GetMoldsHandler(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("pageSize", "50"))
	if page < 1 {
		page = 1
	}
	if pageSize < 1 {
		pageSize = 50
	}

	isOptions := c.Query("options") == "true"
	query := db.DB.Model(&models.Mold{})

	if isOptions {
		var molds []models.Mold
		if err := query.Order("created_at desc").Find(&molds).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] 获取模具选项失败: " + err.Error()})
			return
		}
		c.JSON(http.StatusOK, gin.H{
			"molds":   molds,
			"data":    molds,
			"version": time.Now().Unix(),
		})
		return
	}

	var total int64
	query.Count(&total)

	var items []models.Mold
	if err := query.Order("created_at desc").Limit(pageSize).Offset((page - 1) * pageSize).Find(&items).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] 获取模具列表失败: " + err.Error()})
		return
	}

	// 兼容前端特定遗留版本的字段名及版本号需求
	c.JSON(http.StatusOK, gin.H{
		"items":    items,
		"molds":    items,
		"data":     items,
		"total":    total,
		"page":     page,
		"pageSize": pageSize,
		"version":  time.Now().Unix(),
	})
}

// GetMoldHandler 获取单个模具
func GetMoldHandler(c *gin.Context) {
	id := c.Param("id")
	var mold models.Mold
	if err := db.DB.First(&mold, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "[SERVER] 模具不存在"})
		return
	}
	c.JSON(http.StatusOK, mold)
}

func GetMoldCapacityHandler(c *gin.Context) {
	groupName := c.Query("groupName")
	requestedQty, err := strconv.Atoi(c.DefaultQuery("requestedQty", "0"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] requestedQty must be a valid integer"})
		return
	}

	result, err := services.CheckMoldCapacity(groupName, requestedQty)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] failed to calculate mold capacity: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, result)
}

func CheckMoldCapacityAlertsHandler(c *gin.Context) {
	var input []services.MoldCapacityCheckRequest
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] invalid mold capacity alert payload: " + err.Error()})
		return
	}

	alerts, err := services.CheckMoldCapacityAlerts(input)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] failed to calculate mold capacity alerts: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, alerts)
}

func buildMoldUpdates(payload map[string]json.RawMessage) (map[string]interface{}, error) {
	updates := make(map[string]interface{})
	for key, raw := range payload {
		switch key {
		case "sn", "name", "groupName", "status", "location", "description", "imageUrl":
			var value string
			if err := json.Unmarshal(raw, &value); err != nil {
				return nil, err
			}
			updates[key] = value
		case "maxCycles", "currentCycles", "maintenanceThreshold", "totalLifeCycles":
			var value int
			if err := json.Unmarshal(raw, &value); err != nil {
				return nil, err
			}
			updates[key] = value
		case "isAlerted":
			var value bool
			if err := json.Unmarshal(raw, &value); err != nil {
				return nil, err
			}
			updates["is_alerted"] = value
		case "lastCheckedAt":
			if string(raw) == "null" {
				updates["last_checked_at"] = nil
				continue
			}
			var value time.Time
			if err := json.Unmarshal(raw, &value); err != nil {
				return nil, err
			}
			updates["last_checked_at"] = value
		case "id", "createdAt", "updatedAt", "createdBy", "updatedBy":
			// Skip metadata handled by server
		default:
			// log.Printf("[WARN] Unsupported mold field: %s", key)
		}
	}
	return updates, nil
}

func saveMoldRecord(mold *models.Mold) error {
	if mold.ID == "" {
		return db.DB.Create(mold).Error
	}

	var existing models.Mold
	if err := db.DB.First(&existing, "id = ?", mold.ID).Error; err != nil {
		return err
	}

	updates := map[string]interface{}{
		"sn":                    mold.SN,
		"name":                  mold.Name,
		"max_cycles":            mold.MaxCycles,
		"current_cycles":        mold.CurrentCycles,
		"maintenance_threshold": mold.MaintenanceThreshold,
		"total_life_cycles":     mold.TotalLifeCycles,
		"group_name":            mold.GroupName,
		"status":                mold.Status,
		"location":              mold.Location,
		"description":           mold.Description,
		"is_alerted":            mold.IsAlerted,
		"last_checked_at":       mold.LastCheckedAt,
		"image_url":             mold.ImageURL,
		"updated_by":            mold.UpdatedBy,
	}

	return db.DB.Model(&existing).Updates(updates).Error
}

func patchMoldRecord(id string, updates map[string]interface{}) error {
	var existing models.Mold
	if err := db.DB.First(&existing, "id = ?", id).Error; err != nil {
		return err
	}
	return db.DB.Model(&existing).Updates(updates).Error
}

func buildMoldPatchUpdates(delta map[string]json.RawMessage) (map[string]interface{}, error) {
	updates := make(map[string]interface{})
	for key, raw := range delta {
		valueRaw, err := extractDeltaNewValue(raw)
		if err != nil {
			return nil, err
		}
		switch key {
		case "sn", "name", "groupName", "status", "location", "description", "imageUrl":
			var value string
			if err := json.Unmarshal(valueRaw, &value); err != nil {
				return nil, err
			}
			updates[key] = value
		case "maxCycles", "currentCycles", "maintenanceThreshold", "totalLifeCycles":
			var value int
			if err := json.Unmarshal(valueRaw, &value); err != nil {
				return nil, err
			}
			updates[key] = value
		case "isAlerted":
			var value bool
			if err := json.Unmarshal(valueRaw, &value); err != nil {
				return nil, err
			}
			updates["is_alerted"] = value
		case "lastCheckedAt":
			value, err := parseOptionalTimeValue(valueRaw)
			if err != nil {
				return nil, err
			}
			updates["last_checked_at"] = value
		}
	}
	return updates, nil
}

// SaveMoldHandler 保存/创建模具
func SaveMoldHandler(c *gin.Context) {
	var input services.SaveMoldRequest
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] 模具格式错误"})
		return
	}

	operator := middleware.GetSafeUsername(c)

	var lastCheckedAt *time.Time
	if input.LastCheckedAt != nil && *input.LastCheckedAt != "" {
		parsed, err := time.Parse(time.RFC3339, *input.LastCheckedAt)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] lastCheckedAt 格式错误"})
			return
		}
		lastCheckedAt = &parsed
	}

	mold := models.Mold{
		ID:                   input.ID,
		SN:                   input.SN,
		Name:                 input.Name,
		MaxCycles:            input.MaxCycles,
		CurrentCycles:        input.CurrentCycles,
		MaintenanceThreshold: input.MaintenanceThreshold,
		TotalLifeCycles:      input.TotalLifeCycles,
		GroupName:            input.GroupName,
		Status:               input.Status,
		Location:             input.Location,
		Description:          input.Description,
		IsAlerted:            input.IsAlerted,
		LastCheckedAt:        lastCheckedAt,
		ImageURL:             input.ImageURL,
	}

	mold.CreatedBy = operator
	mold.UpdatedBy = operator

	if err := saveMoldRecord(&mold); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] 保存模具资产失败: " + err.Error()})
		return
	}
	c.JSON(http.StatusOK, mold)
}

// PatchMoldHandler 差分更新 (解决全量保存开销风险)
func PatchMoldHandler(c *gin.Context) {
	id := c.Param("id")
	var input services.SDRTSDeltaHandlerRequest
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] 无效的更新数据"})
		return
	}

	updates, err := buildMoldPatchUpdates(input.Delta)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] 无效的模具差量数据"})
		return
	}

	operator := middleware.GetSafeUsername(c)
	updates["updated_by"] = operator
	updates["updated_at"] = time.Now()

	if err := db.DB.Model(&models.Mold{}).Where("id = ?", id).Updates(updates).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] 更新模具属性失败: " + err.Error()})
		return
	}
	var mold models.Mold
	if err := db.DB.First(&mold, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] 获取更新后的模具失败: " + err.Error()})
		return
	}
	c.JSON(http.StatusOK, mold)
}

// UpdateTelemetryHandler 更新遥测数据
func UpdateTelemetryHandler(c *gin.Context) {
	id := c.Param("id")
	var input struct {
		Cycles int `json:"cycles"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] 数据错误"})
		return
	}

	err := db.DB.Model(&models.Mold{}).Where("id = ?", id).Updates(map[string]interface{}{
		"current_cycles":    gorm.Expr("current_cycles + ?", input.Cycles),
		"total_life_cycles": gorm.Expr("total_life_cycles + ?", input.Cycles),
		"updated_at":        time.Now(),
	}).Error

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] 更新遥测失败"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"status": "success"})
}

// BulkSyncMoldsHandler 批量同步模具 (数据抢救)
func BulkSyncMoldsHandler(c *gin.Context) {
	if !enforceBulkSyncRole(c) {
		return
	}

	var molds []models.Mold
	if err := c.ShouldBindJSON(&molds); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] 批量同步数据错误: " + err.Error()})
		return
	}

	err := db.DB.Transaction(func(tx *gorm.DB) error {
		for _, m := range molds {
			if m.ID != "" {
				// 更新模式：锁定审计元数据
				if err := tx.Model(&models.Mold{}).Where("id = ?", m.ID).Omit("CreatedAt", "CreatedBy").Updates(&m).Error; err != nil {
					return err
				}
			} else {
				// 新增模式
				if err := tx.Create(&m).Error; err != nil {
					return err
				}
			}
		}
		return nil
	})

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] 批量同步失败: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"status": "success", "count": len(molds)})
}
