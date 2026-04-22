package handlers

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"strings"
	"xdfc-server/db"
	"xdfc-server/models"
	"xdfc-server/services"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

var ErrVersionConflict = errors.New("version conflict")

const versionConflictMessage = "数据已被更新，请刷新后重试"

func mapDomainErrorToHTTPStatus(err error) int {
	if err == nil {
		return http.StatusOK
	}
	switch {
	case strings.HasPrefix(err.Error(), "[NOT_FOUND]"):
		return http.StatusNotFound
	case strings.HasPrefix(err.Error(), "[CONFLICT]"):
		return http.StatusConflict
	case strings.HasPrefix(err.Error(), "[VALIDATION]"):
		return http.StatusBadRequest
	case strings.Contains(err.Error(), "nested delta path is not supported"):
		return http.StatusBadRequest
	default:
		return http.StatusInternalServerError
	}
}

func respondDomainError(c *gin.Context, err error, fallbackMessage string) {
	if err == nil {
		return
	}
	status := mapDomainErrorToHTTPStatus(err)
	if status == http.StatusInternalServerError {
		c.JSON(status, gin.H{"error": fallbackMessage + err.Error()})
		return
	}
	c.JSON(status, gin.H{"error": err.Error()})
}

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

func normalizeUnitCategoryValue(value string) string {
	trimmed := strings.TrimSpace(value)
	if trimmed == "" {
		return "OTHER"
	}

	upper := strings.ToUpper(trimmed)
	switch upper {
	case "QUANTITY", "WEIGHT", "LENGTH", "AREA", "VOLUME", "TIME", "OTHER":
		return upper
	}

	switch strings.ToLower(trimmed) {
	case "quantity", "数量":
		return "QUANTITY"
	case "weight", "重量":
		return "WEIGHT"
	case "length", "长度":
		return "LENGTH"
	case "area", "面积":
		return "AREA"
	case "volume", "体积":
		return "VOLUME"
	case "time", "时间":
		return "TIME"
	default:
		return "OTHER"
	}
}

func normalizeUnitModel(unit *models.Unit) {
	if unit == nil {
		return
	}
	unit.Category = normalizeUnitCategoryValue(unit.Category)
}

func normalizeUnitModels(units []models.Unit) {
	for index := range units {
		normalizeUnitModel(&units[index])
	}
}

func saveUnitRecord(unit *models.Unit) error {
	normalizeUnitModel(unit)

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
			if key == "category" {
				updates[key] = normalizeUnitCategoryValue(value)
				continue
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
	if db.RDB != nil {
		if cachedData, err := db.RDB.Get(ctx, cacheKey).Result(); err == nil && cachedData != "" {
			var units []models.Unit
			if err := json.Unmarshal([]byte(cachedData), &units); err == nil {
				normalizeUnitModels(units)
				if jsonBytes, err := json.Marshal(units); err == nil {
					db.RDB.Set(ctx, cacheKey, string(jsonBytes), 0)
					c.Data(http.StatusOK, "application/json", jsonBytes)
					return
				}
			}

			c.Data(http.StatusOK, "application/json", []byte(cachedData))
			return
		}
	}

	// 2. 缓存未击中，常规拉取
	var units []models.Unit
	if err := db.DB.Order("category, code").Find(&units).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	normalizeUnitModels(units)

	// 3. 构建新的内存常驻序列
	if jsonBytes, err := json.Marshal(units); err == nil && db.RDB != nil {
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

func PatchUnitHandler(c *gin.Context) {
	id := c.Param("id")
	var req services.SDRTSDeltaHandlerRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] invalid unit patch payload: " + err.Error()})
		return
	}
	if strings.TrimSpace(req.Metadata.ID) != "" && strings.TrimSpace(req.Metadata.ID) != id {
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] unit patch id mismatch"})
		return
	}
	if err := validateSupportedTopLevelDeltaKeys(req.Delta, "code", "name", "category", "precision", "status", "isSystem", "description"); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] invalid unit delta: " + err.Error()})
		return
	}

	payload := make(map[string]json.RawMessage, len(req.Delta))
	for key, raw := range req.Delta {
		valueRaw, err := extractDeltaNewValue(raw)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] invalid unit delta payload: " + err.Error()})
			return
		}
		payload[key] = valueRaw
	}

	updates, err := buildUnitUpdates(payload)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] invalid unit delta: " + err.Error()})
		return
	}
	if err := patchUnitRecord(id, updates); err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "unit not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	var unit models.Unit
	if err := db.DB.First(&unit, "id = ?", id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "unit not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	normalizeUnitModel(&unit)

	if db.RDB != nil {
		db.RDB.Del(context.Background(), "global:cache:units")
	}

	c.JSON(http.StatusOK, unit)
}

// BulkSyncUnitsHandler 批量同步计量单位 (用于数据抢救)
func BulkSyncUnitsHandler(c *gin.Context) {
	if !enforceBulkSyncPermissions(c) {
		return
	}

	var units []models.Unit
	if err := c.ShouldBindJSON(&units); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	normalizeUnitModels(units)

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
	if db.RDB != nil {
		db.RDB.Del(context.Background(), "global:cache:units")
	}

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
