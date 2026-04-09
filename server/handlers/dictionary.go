package handlers

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"strings"
	"time"
	"xdfc-server/db"
	"xdfc-server/models"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type createDictGroupRequest struct {
	Name        string `json:"name"`
	Code        string `json:"code"`
	Description string `json:"description"`
	Active      *bool  `json:"active"`
}

type patchDictGroupRequest struct {
	Name        *string `json:"name"`
	Description *string `json:"description"`
	Active      *bool   `json:"active"`
	Version     string  `json:"version"`
}

type createDictEntryRequest struct {
	GroupID     string `json:"groupId"`
	Label       string `json:"label"`
	Code        string `json:"code"`
	Description string `json:"description"`
	Options     []any  `json:"options"`
	SortOrder   *int   `json:"sortOrder"`
	Active      *bool  `json:"active"`
}

type patchDictEntryRequest struct {
	Label       *string `json:"label"`
	Description *string `json:"description"`
	Options     *[]any  `json:"options"`
	SortOrder   *int    `json:"sortOrder"`
	Active      *bool   `json:"active"`
	Version     string  `json:"version"`
}

type dictOptionPayload struct {
	Label string `json:"label"`
	Value string `json:"value"`
	Ext   string `json:"ext,omitempty"`
}

func normalizeCode(code string) string {
	return strings.ToUpper(strings.TrimSpace(code))
}

func parseVersion(version string) (time.Time, error) {
	raw := strings.TrimSpace(version)
	if raw == "" {
		return time.Time{}, errors.New("version is required")
	}
	if parsed, err := time.Parse(time.RFC3339Nano, raw); err == nil {
		return parsed.UTC(), nil
	}
	if parsed, err := time.Parse(time.RFC3339, raw); err == nil {
		return parsed.UTC(), nil
	}
	return time.Time{}, fmt.Errorf("invalid version timestamp: %s", raw)
}

func isVersionMatch(current time.Time, expected time.Time) bool {
	return current.UTC().Truncate(time.Millisecond).Equal(expected.UTC().Truncate(time.Millisecond))
}

func normalizeOptions(raw []any) (json.RawMessage, error) {
	normalized := make([]dictOptionPayload, 0, len(raw))

	for idx, item := range raw {
		switch v := item.(type) {
		case string:
			label := strings.TrimSpace(v)
			if label == "" {
				return nil, fmt.Errorf("options[%d] is empty", idx)
			}
			normalized = append(normalized, dictOptionPayload{
				Label: label,
				Value: strings.ToUpper(label),
			})
		case map[string]any:
			labelRaw, hasLabel := v["label"]
			valueRaw, hasValue := v["value"]
			if !hasLabel || !hasValue {
				return nil, fmt.Errorf("options[%d] must include label and value", idx)
			}

			label, okLabel := labelRaw.(string)
			value, okValue := valueRaw.(string)
			if !okLabel || !okValue {
				return nil, fmt.Errorf("options[%d] label/value must be strings", idx)
			}

			label = strings.TrimSpace(label)
			value = strings.TrimSpace(value)
			if label == "" || value == "" {
				return nil, fmt.Errorf("options[%d] label/value cannot be empty", idx)
			}

			option := dictOptionPayload{Label: label, Value: value}
			if extRaw, ok := v["ext"]; ok {
				if extStr, ok := extRaw.(string); ok && strings.TrimSpace(extStr) != "" {
					option.Ext = strings.TrimSpace(extStr)
				}
			}
			normalized = append(normalized, option)
		default:
			return nil, fmt.Errorf("options[%d] must be string or object", idx)
		}
	}

	if len(normalized) == 0 {
		return json.RawMessage("[]"), nil
	}

	payload, err := json.Marshal(normalized)
	if err != nil {
		return nil, fmt.Errorf("marshal options failed: %w", err)
	}
	return payload, nil
}

// clearDictCaches 清除由于字典变更导致的所有内存常驻缓存
func clearDictCaches() {
	ctx := context.Background()
	db.RDB.Del(ctx, "global:cache:dict:groups")

	var cursor uint64
	for {
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

	if cachedData, err := db.RDB.Get(ctx, cacheKey).Result(); err == nil && cachedData != "" {
		c.Data(http.StatusOK, "application/json", []byte(cachedData))
		return
	}

	var groups []models.DictGroup
	if err := db.DB.Order("is_system desc, code asc").Find(&groups).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] 获取字典组失败: " + err.Error()})
		return
	}

	if len(groups) == 0 {
		fmt.Println("[DICT_SELF_HEAL] 未检测到字典数据，尝试自动注入种子数据...")
		if err := db.SeedDictionary(db.DB); err == nil {
			db.DB.Order("is_system desc, code asc").Find(&groups)
			fmt.Printf("[DICT_SELF_HEAL] 注入成功，已恢复 %d 个分组\n", len(groups))
		}
	}

	if jsonBytes, err := json.Marshal(groups); err == nil {
		db.RDB.Set(ctx, cacheKey, string(jsonBytes), 0)
	}

	c.JSON(http.StatusOK, groups)
}

// SaveDictGroupHandler 创建字典组 (POST)
func SaveDictGroupHandler(c *gin.Context) {
	var input createDictGroupRequest
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "无效的参数格式"})
		return
	}

	name := strings.TrimSpace(input.Name)
	code := normalizeCode(input.Code)
	if name == "" || code == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "name/code 不能为空"})
		return
	}

	active := true
	if input.Active != nil {
		active = *input.Active
	}

	var created models.DictGroup
	err := db.DB.Transaction(func(tx *gorm.DB) error {
		var existing models.DictGroup
		if err := tx.Unscoped().Where("code = ?", code).Limit(1).Find(&existing).Error; err != nil {
			return err
		}
		if existing.ID != "" {
			return fmt.Errorf("conflict: dictionary group %s already exists", code)
		}

		created = models.DictGroup{
			Name:        name,
			Code:        code,
			Description: strings.TrimSpace(input.Description),
			Active:      active,
			IsSystem:    false,
		}
		return tx.Create(&created).Error
	})

	if err != nil {
		if strings.Contains(err.Error(), "conflict:") {
			c.JSON(http.StatusConflict, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] 创建字典组失败: " + err.Error()})
		return
	}

	clearDictCaches()
	c.JSON(http.StatusOK, created)
}

// PatchDictGroupHandler 更新字典组元信息 (PATCH)
func PatchDictGroupHandler(c *gin.Context) {
	groupCode := normalizeCode(c.Param("code"))
	if groupCode == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "group code is required"})
		return
	}

	var input patchDictGroupRequest
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "无效的参数格式"})
		return
	}

	expectedVersion, err := parseVersion(input.Version)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if input.Name == nil && input.Description == nil && input.Active == nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "at least one field must be provided"})
		return
	}

	var updated models.DictGroup
	err = db.DB.Transaction(func(tx *gorm.DB) error {
		var existing models.DictGroup
		if err := tx.Where("code = ?", groupCode).First(&existing).Error; err != nil {
			return err
		}
		if existing.IsSystem {
			return errors.New("forbidden: system groups cannot be modified")
		}
		if !isVersionMatch(existing.UpdatedAt, expectedVersion) {
			return errors.New("conflict: stale dictionary group version")
		}

		updates := map[string]any{}
		if input.Name != nil {
			name := strings.TrimSpace(*input.Name)
			if name == "" {
				return errors.New("name cannot be empty")
			}
			updates["name"] = name
		}
		if input.Description != nil {
			updates["description"] = strings.TrimSpace(*input.Description)
		}
		if input.Active != nil {
			updates["active"] = *input.Active
		}

		if len(updates) == 0 {
			updated = existing
			return nil
		}
		if err := tx.Model(&existing).Updates(updates).Error; err != nil {
			return err
		}
		return tx.First(&updated, "id = ?", existing.ID).Error
	})

	if err != nil {
		switch {
		case errors.Is(err, gorm.ErrRecordNotFound):
			c.JSON(http.StatusNotFound, gin.H{"error": "dictionary group not found"})
		case strings.HasPrefix(err.Error(), "forbidden:"):
			c.JSON(http.StatusForbidden, gin.H{"error": err.Error()})
		case strings.HasPrefix(err.Error(), "conflict:"):
			c.JSON(http.StatusConflict, gin.H{"error": err.Error()})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] 更新字典组失败: " + err.Error()})
		}
		return
	}

	clearDictCaches()
	c.JSON(http.StatusOK, updated)
}

// DeleteDictGroupHandler 删除字典组 (DELETE)
func DeleteDictGroupHandler(c *gin.Context) {
	groupCode := normalizeCode(c.Param("code"))
	if groupCode == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "group code is required"})
		return
	}

	err := db.DB.Transaction(func(tx *gorm.DB) error {
		var existing models.DictGroup
		if err := tx.Where("code = ?", groupCode).First(&existing).Error; err != nil {
			return err
		}
		if existing.IsSystem {
			return errors.New("forbidden: system groups cannot be deleted")
		}
		if err := tx.Where("group_id = ?", existing.ID).Delete(&models.DictEntry{}).Error; err != nil {
			return err
		}
		return tx.Delete(&existing).Error
	})

	if err != nil {
		switch {
		case errors.Is(err, gorm.ErrRecordNotFound):
			c.JSON(http.StatusNotFound, gin.H{"error": "dictionary group not found"})
		case strings.HasPrefix(err.Error(), "forbidden:"):
			c.JSON(http.StatusForbidden, gin.H{"error": err.Error()})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] 删除字典组失败: " + err.Error()})
		}
		return
	}

	clearDictCaches()
	c.JSON(http.StatusOK, gin.H{"message": "删除成功"})
}

// GetDictEntriesHandler 获取所有字典条目
func GetDictEntriesHandler(c *gin.Context) {
	groupID := c.Query("groupId")
	ctx := context.Background()

	cacheKey := "global:cache:dict:entries:ALL"
	if groupID != "" {
		cacheKey = "global:cache:dict:entries:" + groupID
	}

	if cachedData, err := db.RDB.Get(ctx, cacheKey).Result(); err == nil && cachedData != "" {
		c.Data(http.StatusOK, "application/json", []byte(cachedData))
		return
	}

	var entries []models.DictEntry
	query := db.DB.Order("sort_order asc, code asc")
	if groupID != "" {
		query = query.Where("group_id = ?", groupID)
	}
	if err := query.Find(&entries).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] 获取字典项失败: " + err.Error()})
		return
	}

	if jsonBytes, err := json.Marshal(entries); err == nil {
		db.RDB.Set(ctx, cacheKey, string(jsonBytes), 0)
	}

	c.JSON(http.StatusOK, entries)
}

// SaveDictEntryHandler 创建字典条目 (POST)
func SaveDictEntryHandler(c *gin.Context) {
	var input createDictEntryRequest
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "无效的参数格式"})
		return
	}

	groupID := strings.TrimSpace(input.GroupID)
	label := strings.TrimSpace(input.Label)
	code := normalizeCode(input.Code)
	if groupID == "" || label == "" || code == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "groupId/label/code 不能为空"})
		return
	}

	optionsJSON, err := normalizeOptions(input.Options)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	sortOrder := 0
	if input.SortOrder != nil {
		sortOrder = *input.SortOrder
	}
	active := true
	if input.Active != nil {
		active = *input.Active
	}

	var created models.DictEntry
	err = db.DB.Transaction(func(tx *gorm.DB) error {
		var group models.DictGroup
		if err := tx.Where("id = ?", groupID).First(&group).Error; err != nil {
			return err
		}

		var existing models.DictEntry
		if err := tx.Unscoped().Where("code = ?", code).Limit(1).Find(&existing).Error; err != nil {
			return err
		}
		if existing.ID != "" {
			return fmt.Errorf("conflict: dictionary entry %s already exists", code)
		}

		created = models.DictEntry{
			GroupID:     groupID,
			Label:       label,
			Code:        code,
			Description: strings.TrimSpace(input.Description),
			Options:     optionsJSON,
			SortOrder:   sortOrder,
			Active:      active,
			IsSystem:    false,
		}
		return tx.Create(&created).Error
	})

	if err != nil {
		switch {
		case errors.Is(err, gorm.ErrRecordNotFound):
			c.JSON(http.StatusBadRequest, gin.H{"error": "dictionary group not found"})
		case strings.HasPrefix(err.Error(), "conflict:"):
			c.JSON(http.StatusConflict, gin.H{"error": err.Error()})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] 创建字典项失败: " + err.Error()})
		}
		return
	}

	clearDictCaches()
	c.JSON(http.StatusOK, created)
}

// PatchDictEntryHandler 更新字典条目 (PATCH)
func PatchDictEntryHandler(c *gin.Context) {
	entryCode := normalizeCode(c.Param("code"))
	if entryCode == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "entry code is required"})
		return
	}

	var input patchDictEntryRequest
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "无效的参数格式"})
		return
	}

	expectedVersion, err := parseVersion(input.Version)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if input.Label == nil && input.Description == nil && input.Options == nil && input.SortOrder == nil && input.Active == nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "at least one field must be provided"})
		return
	}

	var updated models.DictEntry
	err = db.DB.Transaction(func(tx *gorm.DB) error {
		var existing models.DictEntry
		if err := tx.Where("code = ?", entryCode).First(&existing).Error; err != nil {
			return err
		}
		if !isVersionMatch(existing.UpdatedAt, expectedVersion) {
			return errors.New("conflict: stale dictionary entry version")
		}

		if existing.IsSystem && (input.Label != nil || input.Active != nil || input.SortOrder != nil) {
			return errors.New("forbidden: system entry metadata is immutable")
		}

		updates := map[string]any{}
		if input.Label != nil {
			label := strings.TrimSpace(*input.Label)
			if label == "" {
				return errors.New("label cannot be empty")
			}
			updates["label"] = label
		}
		if input.Description != nil {
			updates["description"] = strings.TrimSpace(*input.Description)
		}
		if input.SortOrder != nil {
			updates["sort_order"] = *input.SortOrder
		}
		if input.Active != nil {
			updates["active"] = *input.Active
		}
		if input.Options != nil {
			optionsJSON, err := normalizeOptions(*input.Options)
			if err != nil {
				return err
			}
			updates["options"] = optionsJSON
		}

		if len(updates) == 0 {
			updated = existing
			return nil
		}
		if err := tx.Model(&existing).Updates(updates).Error; err != nil {
			return err
		}
		return tx.First(&updated, "id = ?", existing.ID).Error
	})

	if err != nil {
		switch {
		case errors.Is(err, gorm.ErrRecordNotFound):
			c.JSON(http.StatusNotFound, gin.H{"error": "dictionary entry not found"})
		case strings.HasPrefix(err.Error(), "forbidden:"):
			c.JSON(http.StatusForbidden, gin.H{"error": err.Error()})
		case strings.HasPrefix(err.Error(), "conflict:"):
			c.JSON(http.StatusConflict, gin.H{"error": err.Error()})
		default:
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		}
		return
	}

	clearDictCaches()
	c.JSON(http.StatusOK, updated)
}

// DeleteDictEntryHandler 删除字典条目 (DELETE)
func DeleteDictEntryHandler(c *gin.Context) {
	entryCode := normalizeCode(c.Param("code"))
	if entryCode == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "entry code is required"})
		return
	}

	err := db.DB.Transaction(func(tx *gorm.DB) error {
		var existing models.DictEntry
		if err := tx.Where("code = ?", entryCode).First(&existing).Error; err != nil {
			return err
		}
		if existing.IsSystem {
			return errors.New("forbidden: system entries cannot be deleted")
		}
		return tx.Delete(&existing).Error
	})

	if err != nil {
		switch {
		case errors.Is(err, gorm.ErrRecordNotFound):
			c.JSON(http.StatusNotFound, gin.H{"error": "dictionary entry not found"})
		case strings.HasPrefix(err.Error(), "forbidden:"):
			c.JSON(http.StatusForbidden, gin.H{"error": err.Error()})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] 删除字典项失败: " + err.Error()})
		}
		return
	}

	clearDictCaches()
	c.JSON(http.StatusOK, gin.H{"message": "删除成功"})
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
		for _, g := range input.Groups {
			code := normalizeCode(g.Code)
			name := strings.TrimSpace(g.Name)
			if code == "" || name == "" {
				continue
			}

			var existing models.DictGroup
			if err := tx.Where("code = ?", code).First(&existing).Error; err == nil {
				if existing.IsSystem {
					continue
				}
				if err := tx.Model(&existing).Updates(map[string]any{
					"name":        name,
					"description": strings.TrimSpace(g.Description),
					"active":      g.Active,
				}).Error; err != nil {
					return err
				}
				continue
			}

			if err := tx.Create(&models.DictGroup{
				Name:        name,
				Code:        code,
				Description: strings.TrimSpace(g.Description),
				Active:      g.Active,
				IsSystem:    false,
			}).Error; err != nil {
				return err
			}
		}

		for _, e := range input.Entries {
			code := normalizeCode(e.Code)
			label := strings.TrimSpace(e.Label)
			groupID := strings.TrimSpace(e.GroupID)
			if code == "" || label == "" || groupID == "" {
				continue
			}

			var rawOptions []any
			if len(e.Options) > 0 {
				if err := json.Unmarshal(e.Options, &rawOptions); err != nil {
					return err
				}
			}
			optionsJSON, err := normalizeOptions(rawOptions)
			if err != nil {
				return err
			}

			var existing models.DictEntry
			if err := tx.Where("code = ?", code).First(&existing).Error; err == nil {
				if existing.IsSystem {
					continue
				}
				if err := tx.Model(&existing).Updates(map[string]any{
					"group_id":    groupID,
					"label":       label,
					"description": strings.TrimSpace(e.Description),
					"options":     optionsJSON,
					"sort_order":  e.SortOrder,
					"active":      e.Active,
				}).Error; err != nil {
					return err
				}
				continue
			}

			if err := tx.Create(&models.DictEntry{
				GroupID:     groupID,
				Label:       label,
				Code:        code,
				Description: strings.TrimSpace(e.Description),
				Options:     optionsJSON,
				SortOrder:   e.SortOrder,
				Active:      e.Active,
				IsSystem:    false,
			}).Error; err != nil {
				return err
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
