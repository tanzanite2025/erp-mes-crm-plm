package handlers

import (
	"encoding/json"
	"net/http"
	"time"
	"xdfc-server/db"
	"xdfc-server/models"
	"xdfc-server/services"

	"github.com/gin-gonic/gin"
)

// GetDrawingsHandler 获取所有图纸
func GetDrawingsHandler(c *gin.Context) {
	var drawings []models.MoldDrawing
	if err := db.DB.Order("created_at desc").Find(&drawings).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] 获取图纸档案失败: " + err.Error()})
		return
	}
	c.JSON(http.StatusOK, drawings)
}

// GetDrawingLogsHandler 获取特定图纸的操作日志
func GetDrawingLogsHandler(c *gin.Context) {
	drawingID := c.Param("id")
	var logs []models.MoldDrawingLog
	if err := db.DB.Where("drawing_id = ?", drawingID).Order("timestamp desc").Find(&logs).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] 获取图纸日志失败"})
		return
	}
	c.JSON(http.StatusOK, logs)
}

// GetDrawingsByMoldHandler 按模具编号获取图纸
func GetDrawingsByMoldHandler(c *gin.Context) {
	moldSn := c.Param("moldSn")
	var drawings []models.MoldDrawing
	if err := db.DB.Where("mold_sn = ?", moldSn).Find(&drawings).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] 查询关联图纸失败"})
		return
	}
	c.JSON(http.StatusOK, drawings)
}

func buildDrawingUpdates(payload map[string]json.RawMessage) (map[string]interface{}, error) {
	updates := make(map[string]interface{})
	for key, raw := range payload {
		switch key {
		case "moldId", "moldSn", "name", "type", "fileUrl", "version", "status", "remarks":
			var value string
			if err := json.Unmarshal(raw, &value); err != nil {
				return nil, err
			}
			updates[key] = value
		case "uploadedAt":
			if string(raw) == "null" {
				updates["uploaded_at"] = nil
				continue
			}
			var value time.Time
			if err := json.Unmarshal(raw, &value); err != nil {
				return nil, err
			}
			updates["uploaded_at"] = value
		case "id", "createdAt", "updatedAt":
			// Skip metadata
		default:
			// IGNORED
		}
	}
	return updates, nil
}

func saveDrawingRecord(drawing *models.MoldDrawing) error {
	if drawing.ID == "" {
		return db.DB.Create(drawing).Error
	}

	var existing models.MoldDrawing
	if err := db.DB.First(&existing, "id = ?", drawing.ID).Error; err != nil {
		return err
	}

	updates := map[string]interface{}{
		"mold_id":     drawing.MoldID,
		"mold_sn":     drawing.MoldSN,
		"name":        drawing.Name,
		"type":        drawing.Type,
		"file_url":    drawing.FileURL,
		"version":     drawing.Version,
		"status":      drawing.Status,
		"uploaded_at": drawing.UploadedAt,
		"remarks":     drawing.Remarks,
		"updated_at":  time.Now(),
	}

	return db.DB.Model(&existing).Updates(updates).Error
}

func patchDrawingRecord(id string, updates map[string]interface{}) error {
	var existing models.MoldDrawing
	if err := db.DB.First(&existing, "id = ?", id).Error; err != nil {
		return err
	}
	updates["updated_at"] = time.Now()
	return db.DB.Model(&existing).Updates(updates).Error
}

func buildDrawingPatchUpdates(delta map[string]json.RawMessage) (map[string]interface{}, error) {
	updates := make(map[string]interface{})
	for key, raw := range delta {
		valueRaw, err := extractDeltaNewValue(raw)
		if err != nil {
			return nil, err
		}
		switch key {
		case "moldId", "moldSn", "name", "type", "fileUrl", "version", "status", "remarks":
			var value string
			if err := json.Unmarshal(valueRaw, &value); err != nil {
				return nil, err
			}
			updates[key] = value
		case "uploadedAt":
			value, err := parseOptionalTimeValue(valueRaw)
			if err != nil {
				return nil, err
			}
			updates["uploaded_at"] = value
		}
	}
	return updates, nil
}

// SaveDrawingHandler 保存（创建或更新）图纸信息
func SaveDrawingHandler(c *gin.Context) {
	var input services.SaveMoldDrawingRequest
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] 图纸元数据无效"})
		return
	}

	uploadedAt := time.Now()
	if input.UploadedAt != "" {
		parsed, err := time.Parse(time.RFC3339, input.UploadedAt)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] uploadedAt 格式错误"})
			return
		}
		uploadedAt = parsed
	}

	drawing := models.MoldDrawing{
		ID:         input.ID,
		MoldID:     input.MoldID,
		MoldSN:     input.MoldSN,
		Name:       input.Name,
		Type:       input.Type,
		FileURL:    input.FileURL,
		Version:    input.Version,
		Status:     input.Status,
		UploadedAt: uploadedAt,
		Remarks:    input.Remarks,
	}

	if drawing.ID == "" {
		drawing.CreatedAt = time.Now()
		if input.UploadedAt == "" {
			drawing.UploadedAt = time.Now()
		}
	}

	if err := saveDrawingRecord(&drawing); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] 保存图纸档案失败: " + err.Error()})
		return
	}

	// 记录日志
	db.DB.Create(&models.MoldDrawingLog{
		DrawingID: drawing.ID,
		Action:    "CREATED",
		Details:   "图纸档案被创建/全量保存",
		Operator:  "系统管理员",
		Timestamp: time.Now(),
	})

	c.JSON(http.StatusOK, drawing)
}

// PatchDrawingHandler 差分更新图纸
func PatchDrawingHandler(c *gin.Context) {
	id := c.Param("id")
	var input services.SDRTSDeltaHandlerRequest
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] 无效的更新数据"})
		return
	}

	updates, err := buildDrawingPatchUpdates(input.Delta)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] 无效的图纸差量数据"})
		return
	}

	if err := patchDrawingRecord(id, updates); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] 差分保存图纸失败: " + err.Error()})
		return
	}

	var drawing models.MoldDrawing
	if err := db.DB.First(&drawing, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] 获取更新后的图纸失败: " + err.Error()})
		return
	}

	db.DB.Create(&models.MoldDrawingLog{
		DrawingID: drawing.ID,
		Action:    "VERSION_UPDATE",
		Details:   "图纸档案被部分更新",
		Operator:  "系统管理员",
		Timestamp: time.Now(),
	})

	c.JSON(http.StatusOK, drawing)
}

// DeleteDrawingHandler 删除图纸
func DeleteDrawingHandler(c *gin.Context) {
	id := c.Param("id")
	if err := db.DB.Delete(&models.MoldDrawing{}, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] 删除图纸失败"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"status": "success"})
}
