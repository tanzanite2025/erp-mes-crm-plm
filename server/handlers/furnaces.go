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
		c.JSON(http.StatusOK, furnaces)
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
		"items":    items,
		"total":    total,
		"page":     page,
		"pageSize": pageSize,
	})
}

func buildFurnaceUpdates(payload map[string]json.RawMessage) (map[string]interface{}, error) {
	updates := make(map[string]interface{})
	for key, raw := range payload {
		switch key {
		case "sn", "name", "type", "status", "location", "description":
			var value string
			if err := json.Unmarshal(raw, &value); err != nil {
				return nil, err
			}
			updates[key] = value
		case "maxTemp", "currentTemp":
			var value float64
			if err := json.Unmarshal(raw, &value); err != nil {
				return nil, err
			}
			updates[key] = value
		case "id", "createdAt", "updatedAt", "createdBy", "updatedBy":
			// Skip metadata handled by server
		default:
			// IGNORED
		}
	}
	return updates, nil
}

func saveFurnaceRecord(furnace *models.Furnace) error {
	if furnace.ID == "" {
		return db.DB.Create(furnace).Error
	}

	var existing models.Furnace
	if err := db.DB.First(&existing, "id = ?", furnace.ID).Error; err != nil {
		return err
	}

	updates := map[string]interface{}{
		"sn":           furnace.SN,
		"name":         furnace.Name,
		"type":         furnace.Type,
		"max_temp":     furnace.MaxTemp,
		"current_temp": furnace.CurrentTemp,
		"status":       furnace.Status,
		"location":     furnace.Location,
		"description":  furnace.Description,
		"updated_by":   furnace.UpdatedBy,
	}

	return db.DB.Model(&existing).Updates(updates).Error
}

func patchFurnaceRecord(id string, updates map[string]interface{}) error {
	var existing models.Furnace
	if err := db.DB.First(&existing, "id = ?", id).Error; err != nil {
		return err
	}
	return db.DB.Model(&existing).Updates(updates).Error
}

func buildFurnacePatchUpdates(delta map[string]json.RawMessage) (map[string]interface{}, error) {
	updates := make(map[string]interface{})
	for key, raw := range delta {
		valueRaw, err := extractDeltaNewValue(raw)
		if err != nil {
			return nil, err
		}
		switch key {
		case "sn", "name", "type", "status", "location", "description":
			var value string
			if err := json.Unmarshal(valueRaw, &value); err != nil {
				return nil, err
			}
			updates[key] = value
		case "maxTemp", "currentTemp":
			var value float64
			if err := json.Unmarshal(valueRaw, &value); err != nil {
				return nil, err
			}
			updates[key] = value
		}
	}
	return updates, nil
}

// SaveFurnaceHandler 保存/创建炉台
func SaveFurnaceHandler(c *gin.Context) {
	var input services.SaveFurnaceRequest
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] 炉台格式错误"})
		return
	}

	operator := middleware.GetSafeUsername(c)

	furnace := models.Furnace{
		ID:          input.ID,
		SN:          input.SN,
		Name:        input.Name,
		Type:        input.Type,
		MaxTemp:     input.MaxTemp,
		CurrentTemp: input.CurrentTemp,
		Status:      input.Status,
		Location:    input.Location,
		Description: input.Description,
	}

	furnace.CreatedBy = operator
	furnace.UpdatedBy = operator

	if err := saveFurnaceRecord(&furnace); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] 保存炉台资产失败: " + err.Error()})
		return
	}
	c.JSON(http.StatusOK, furnace)
}

// PatchFurnaceHandler 局部更新炉台 (差分更新支持)
func PatchFurnaceHandler(c *gin.Context) {
	id := c.Param("id")
	var input services.DeltaHandlerRequest
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] 无效的更新数据"})
		return
	}

	updates, err := buildFurnacePatchUpdates(input.Delta)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] 无效的炉台差量数据"})
		return
	}

	operator := middleware.GetSafeUsername(c)
	updates["updated_by"] = operator
	updates["updated_at"] = time.Now()

	if err := db.DB.Model(&models.Furnace{}).Where("id = ?", id).Updates(updates).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] 更新炉台属性失败: " + err.Error()})
		return
	}
	var furnace models.Furnace
	if err := db.DB.First(&furnace, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] 获取更新后的炉台失败: " + err.Error()})
		return
	}
	c.JSON(http.StatusOK, furnace)
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

	err := db.DB.Model(&models.Furnace{}).Where("id = ?", id).Updates(map[string]interface{}{
		"current_temp": input.Temp,
		"updated_at":   time.Now(),
	}).Error

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] 更新遥测失败"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"status": "success"})
}

// BulkSyncFurnacesHandler 批量同步炉台 (数据抢救)
func BulkSyncFurnacesHandler(c *gin.Context) {
	if !enforceBulkSyncRole(c) {
		return
	}

	var furnaces []models.Furnace
	if err := c.ShouldBindJSON(&furnaces); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] 批量同步数据错误: " + err.Error()})
		return
	}

	err := db.DB.Transaction(func(tx *gorm.DB) error {
		for _, f := range furnaces {
			if f.ID != "" {
				// 更新模式：局部同步，保护审计标签
				if err := tx.Model(&models.Furnace{}).Where("id = ?", f.ID).Omit("CreatedAt", "CreatedBy").Updates(&f).Error; err != nil {
					return err
				}
			} else {
				// 新增模式
				if err := tx.Create(&f).Error; err != nil {
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

	c.JSON(http.StatusOK, gin.H{"status": "success", "count": len(furnaces)})
}
