package handlers

import (
	"net/http"
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

func SaveDrawingHandler(c *gin.Context) {
	var input services.SaveMoldDrawingRequest
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] 鍥剧焊鍏冩暟鎹棤鏁�"})
		return
	}

	drawing, err := services.NewEquipmentAssetService(db.DB).SaveMoldDrawing(auditContextFromGin(c), input)
	if err != nil {
		respondDomainError(c, err, "[SERVER] 保存图纸档案失败: ")
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

	drawing, err := services.NewEquipmentAssetService(db.DB).PatchMoldDrawing(auditContextFromGin(c), id, input.Delta)
	if err != nil {
		respondDomainError(c, err, "[SERVER] 差分保存图纸失败: ")
		return
	}

	c.JSON(http.StatusOK, mapMoldDrawingResponse(drawing))
}

func DeleteDrawingHandler(c *gin.Context) {
	id := c.Param("id")
	if err := services.NewEquipmentAssetService(db.DB).DeleteMoldDrawing(auditContextFromGin(c), id); err != nil {
		respondDomainError(c, err, "[SERVER] 删除图纸失败: ")
		return
	}
	c.JSON(http.StatusOK, gin.H{"status": "success"})
}
