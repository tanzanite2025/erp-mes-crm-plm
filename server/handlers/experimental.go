package handlers

import (
	"encoding/json"
	"log"
	"net/http"
	"strconv"
	"time"
	"xdfc-server/db"
	"xdfc-server/models"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// --- 实验分类管理 (Category Management) ---

// GetExpCategoriesHandler 获取所有分类 (展平列表)
func GetExpCategoriesHandler(c *gin.Context) {
	var categories []models.ExpCategory
	if err := db.DB.Order("\"order\" asc").Find(&categories).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] 获取实验分类失败"})
		return
	}
	c.JSON(http.StatusOK, categories)
}

func buildExpCategoryUpdates(payload map[string]json.RawMessage) (map[string]interface{}, error) {
	updates := make(map[string]interface{})
	for key, raw := range payload {
		switch key {
		case "name":
			var value string
			if err := json.Unmarshal(raw, &value); err != nil {
				return nil, err
			}
			updates[key] = value
		case "parentId":
			if string(raw) == "null" {
				updates["parent_id"] = nil
				continue
			}
			var value string
			if err := json.Unmarshal(raw, &value); err != nil {
				return nil, err
			}
			updates["parent_id"] = value
		case "order":
			var value int
			if err := json.Unmarshal(raw, &value); err != nil {
				return nil, err
			}
			updates["\"order\""] = value
		case "id", "createdAt", "updatedAt":
			// Skip metadata
		default:
			// IGNORED
		}
	}
	return updates, nil
}

func patchExpCategoryRecord(id string, updates map[string]interface{}) error {
	var existing models.ExpCategory
	if err := db.DB.First(&existing, "id = ?", id).Error; err != nil {
		return err
	}
	return db.DB.Model(&existing).Updates(updates).Error
}

// SaveExpCategoryHandler 保存或更新分类
func SaveExpCategoryHandler(c *gin.Context) {
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
		updates, err := buildExpCategoryUpdates(payload)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		if err := patchExpCategoryRecord(id, updates); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] 差分保存分类失败: " + err.Error()})
			return
		}
		var category models.ExpCategory
		db.DB.First(&category, "id = ?", id)
		c.JSON(http.StatusOK, category)
		return
	}

	var category models.ExpCategory
	if err := json.Unmarshal(body, &category); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] 实验分类格式无效"})
		return
	}

	if err := db.DB.Create(&category).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] 创建分类失败: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, category)
}

func DeleteExpCategoryHandler(c *gin.Context) {
	id := c.Param("id")

	err := db.DB.Transaction(func(tx *gorm.DB) error {
		// 递归删除逻辑：查找所有子 ID
		var categories []models.ExpCategory
		tx.Find(&categories)

		var getAllChildrenIds func(string) []string
		getAllChildrenIds = func(parentId string) []string {
			var ids []string
			for _, cat := range categories {
				if cat.ParentID != nil && *cat.ParentID == parentId {
					ids = append(ids, cat.ID)
					ids = append(ids, getAllChildrenIds(cat.ID)...)
				}
			}
			return ids
		}

		idsToDelete := append([]string{id}, getAllChildrenIds(id)...)
		if err := tx.Where("id IN ?", idsToDelete).Delete(&models.ExpCategory{}).Error; err != nil {
			return err
		}
		return nil
	})

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] 递归删除分类失败: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "分类及其子项已移除"})
}

// --- 实验设备管理 (Asset Management) ---

// GetExpEquipmentHandler 获取设备列表
func GetExpEquipmentHandler(c *gin.Context) {
	categoryId := c.Query("categoryId")
	var equipment []models.ExpEquipment
	query := db.DB.Preload("Category")
	if categoryId != "" {
		query = query.Where("category_id = ?", categoryId)
	}

	if err := query.Order("created_at desc").Find(&equipment).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] 获取实验资产失败"})
		return
	}
	c.JSON(http.StatusOK, equipment)
}

func buildExpEquipmentUpdates(payload map[string]json.RawMessage) (map[string]interface{}, error) {
	updates := make(map[string]interface{})
	for key, raw := range payload {
		switch key {
		case "categoryId", "name", "model", "status":
			var value string
			if err := json.Unmarshal(raw, &value); err != nil {
				return nil, err
			}
			updates[key] = value
		case "calibratedAt":
			if string(raw) == "null" {
				updates["calibrated_at"] = nil
				continue
			}
			var value time.Time
			if err := json.Unmarshal(raw, &value); err != nil {
				return nil, err
			}
			updates["calibrated_at"] = value
		case "cycleDays":
			var value int
			if err := json.Unmarshal(raw, &value); err != nil {
				return nil, err
			}
			updates["cycle_days"] = value
		case "id", "createdAt", "updatedAt":
			// Skip metadata
		default:
			// IGNORED
		}
	}
	return updates, nil
}

func patchExpEquipmentRecord(id string, updates map[string]interface{}) error {
	var existing models.ExpEquipment
	if err := db.DB.First(&existing, "id = ?", id).Error; err != nil {
		return err
	}
	return db.DB.Model(&existing).Updates(updates).Error
}

// SaveExpEquipmentHandler 提交设备档案
func SaveExpEquipmentHandler(c *gin.Context) {
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
		updates, err := buildExpEquipmentUpdates(payload)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		if err := patchExpEquipmentRecord(id, updates); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] 差分保存实验资产失败: " + err.Error()})
			return
		}
		var equipment models.ExpEquipment
		db.DB.First(&equipment, "id = ?", id)
		c.JSON(http.StatusOK, equipment)
		return
	}

	var equipment models.ExpEquipment
	if err := json.Unmarshal(body, &equipment); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] 实验资产格式无效"})
		return
	}

	if err := db.DB.Create(&equipment).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] 创建实验资产失败: " + err.Error()})
		return
	}
	c.JSON(http.StatusOK, equipment)
}

// --- 实验项目与清单 (Task Management) ---

// GetExpTasksHandler 获取项目排期
func GetExpTasksHandler(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("pageSize", "50"))
	typeFilter := c.Query("type")

	query := db.DB.Model(&models.ExpTask{})
	if typeFilter != "" && typeFilter != "ALL" {
		query = query.Where("type = ?", typeFilter)
	}

	var total int64
	query.Count(&total)

	var tasks []models.ExpTask
	if err := query.Order("scheduled_at desc").Limit(pageSize).Offset((page - 1) * pageSize).Find(&tasks).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] 获取实验排期失败"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"items":    tasks,
		"total":    total,
		"page":     page,
		"pageSize": pageSize,
	})
}

func buildExpTaskUpdates(payload map[string]json.RawMessage) (map[string]interface{}, error) {
	updates := make(map[string]interface{})
	for key, raw := range payload {
		switch key {
		case "code", "name", "type", "sampleId", "status", "executor", "projectId":
			var value string
			if err := json.Unmarshal(raw, &value); err != nil {
				return nil, err
			}
			updates[key] = value
		case "scheduledAt":
			if string(raw) == "null" {
				updates["scheduled_at"] = nil
				continue
			}
			var value time.Time
			if err := json.Unmarshal(raw, &value); err != nil {
				return nil, err
			}
			updates["scheduled_at"] = value
		case "id", "createdAt", "updatedAt":
			// Skip metadata
		default:
			// IGNORED
		}
	}
	return updates, nil
}

func patchExpTaskRecord(id string, updates map[string]interface{}) error {
	var existing models.ExpTask
	if err := db.DB.First(&existing, "id = ?", id).Error; err != nil {
		return err
	}
	return db.DB.Model(&existing).Updates(updates).Error
}

// SaveExpTaskHandler 创建/更新实验任务
func SaveExpTaskHandler(c *gin.Context) {
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
		updates, err := buildExpTaskUpdates(payload)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		if err := patchExpTaskRecord(id, updates); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] 差分更新实验任务失败: " + err.Error()})
			return
		}
		var task models.ExpTask
		db.DB.First(&task, "id = ?", id)
		c.JSON(http.StatusOK, task)
		return
	}

	var task models.ExpTask
	if err := json.Unmarshal(body, &task); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] 实验任务格式无效"})
		return
	}

	err = db.DB.Transaction(func(tx *gorm.DB) error {
		if task.ID == "" {
			task.Code = "EXP-" + time.Now().Format("20060102150405")
		}
		if err := tx.Create(&task).Error; err != nil {
			return err
		}
		return nil
	})

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] 创建实验任务失败: " + err.Error()})
		return
	}
	c.JSON(http.StatusOK, task)
}

// --- 实验报告归档 (Report Management) ---

// GetExpReportsHandler 获取实验结论库
func GetExpReportsHandler(c *gin.Context) {
	var reports []models.ExpReport
	if err := db.DB.Preload("Task").Order("created_at desc").Find(&reports).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] 获取实验报告失败"})
		return
	}
	c.JSON(http.StatusOK, reports)
}

func buildExpReportUpdates(payload map[string]json.RawMessage) (map[string]interface{}, error) {
	updates := make(map[string]interface{})
	for key, raw := range payload {
		switch key {
		case "taskId", "parameters", "conclusion", "result", "approvedBy", "attachments":
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

func patchExpReportRecord(tx *gorm.DB, id string, updates map[string]interface{}) error {
	var existing models.ExpReport
	if err := tx.First(&existing, "id = ?", id).Error; err != nil {
		return err
	}
	return tx.Model(&existing).Updates(updates).Error
}

// SaveExpReportHandler 提交并归档报告
func SaveExpReportHandler(c *gin.Context) {
	payload, body, err := decodeJSONBodyMap(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] 无效的 JSON 映射"})
		return
	}

	var finalReport models.ExpReport
	err = db.DB.Transaction(func(tx *gorm.DB) error {
		if rawID, ok := payload["id"]; ok && string(rawID) != "null" && string(rawID) != `""` {
			var id string
			if err := json.Unmarshal(rawID, &id); err != nil {
				return err
			}
			updates, err := buildExpReportUpdates(payload)
			if err != nil {
				return err
			}
			if err := patchExpReportRecord(tx, id, updates); err != nil {
				return err
			}
			tx.First(&finalReport, "id = ?", id)
		} else {
			if err := json.Unmarshal(body, &finalReport); err != nil {
				return err
			}
			if err := tx.Create(&finalReport).Error; err != nil {
				return err
			}
		}

		// 状态自动同步：归档关联的实验任务
		if err := tx.Model(&models.ExpTask{}).Where("id = ?", finalReport.TaskID).Update("status", "ARCHIVED").Error; err != nil {
			log.Printf("[WARN] Failed to auto-archive Task %s: %v", finalReport.TaskID, err)
		}

		return nil
	})

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] 归档报告失败: " + err.Error()})
		return
	}
	c.JSON(http.StatusOK, finalReport)
}
