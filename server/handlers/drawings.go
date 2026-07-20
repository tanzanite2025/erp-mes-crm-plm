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

func GetDrawingsHandler(c *gin.Context) {
	var drawings []models.MoldDrawing
	if err := db.DB.Order("created_at desc").Find(&drawings).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] 鑾峰彇鍥剧焊妗ｆ澶辫触: " + err.Error()})
		return
	}
	c.JSON(http.StatusOK, mapMoldDrawingResponses(drawings))
}

func GetDrawingLogsHandler(c *gin.Context) {
	drawingID := c.Param("id")
	var logs []models.MoldDrawingLog
	if err := db.DB.Where("drawing_id = ?", drawingID).Order("timestamp desc").Find(&logs).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] 鑾峰彇鍥剧焊鏃ュ織澶辫触"})
		return
	}
	c.JSON(http.StatusOK, mapMoldDrawingLogResponses(logs))
}

func GetDrawingsByMoldHandler(c *gin.Context) {
	moldSn := c.Param("moldSn")
	var drawings []models.MoldDrawing
	if err := db.DB.Where("mold_sn = ?", moldSn).Find(&drawings).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] 鏌ヨ鍏宠仈鍥剧焊澶辫触"})
		return
	}
	c.JSON(http.StatusOK, mapMoldDrawingResponses(drawings))
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

func SaveDrawingHandler(c *gin.Context) {
	var input services.SaveMoldDrawingRequest
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] 鍥剧焊鍏冩暟鎹棤鏁�"})
		return
	}

	uploadedAt := time.Now()
	if input.UploadedAt != "" {
		parsed, err := time.Parse(time.RFC3339, input.UploadedAt)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] uploadedAt 鏍煎紡閿欒"})
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
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] 淇濆瓨鍥剧焊妗ｆ澶辫触: " + err.Error()})
		return
	}

	_ = db.DB.Create(&models.MoldDrawingLog{
		DrawingID: drawing.ID,
		Action:    "CREATED",
		Details:   "鍥剧焊妗ｆ琚垱寤� / 鍏ㄩ噺淇濆瓨",
		Operator:  "绯荤粺绠＄悊鍛�",
		Timestamp: time.Now(),
	}).Error

	if err := db.DB.First(&drawing, "id = ?", drawing.ID).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] 鑾峰彇淇濆瓨鍚庣殑鍥剧焊澶辫触: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, mapMoldDrawingResponse(drawing))
}

func PatchDrawingHandler(c *gin.Context) {
	id := c.Param("id")
	var input services.SDRTSDeltaHandlerRequest
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] 鏃犳晥鐨勬洿鏂版暟鎹�"})
		return
	}

	updates, err := buildDrawingPatchUpdates(input.Delta)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] 鏃犳晥鐨勫浘绾稿樊閲忔暟鎹�"})
		return
	}

	if err := patchDrawingRecord(id, updates); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] 宸垎淇濆瓨鍥剧焊澶辫触: " + err.Error()})
		return
	}

	var drawing models.MoldDrawing
	if err := db.DB.First(&drawing, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] 鑾峰彇鏇存柊鍚庣殑鍥剧焊澶辫触: " + err.Error()})
		return
	}

	_ = db.DB.Create(&models.MoldDrawingLog{
		DrawingID: drawing.ID,
		Action:    "VERSION_UPDATE",
		Details:   "鍥剧焊妗ｆ琚儴鍒嗘洿鏂�",
		Operator:  "绯荤粺绠＄悊鍛�",
		Timestamp: time.Now(),
	}).Error

	c.JSON(http.StatusOK, mapMoldDrawingResponse(drawing))
}

func DeleteDrawingHandler(c *gin.Context) {
	id := c.Param("id")
	if err := db.DB.Delete(&models.MoldDrawing{}, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] 鍒犻櫎鍥剧焊澶辫触"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"status": "success"})
}
