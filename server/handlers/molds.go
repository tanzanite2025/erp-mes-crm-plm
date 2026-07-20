package handlers

import (
	"net/http"
	"strconv"
	"strings"
	"xdfc-server/db"
	"xdfc-server/models"
	"xdfc-server/services"

	"github.com/gin-gonic/gin"
)

type moldGroupNameRow struct {
	GroupName string `gorm:"column:group_name"`
}

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
			"items":    mapMoldResponses(molds),
			"total":    len(molds),
			"page":     1,
			"pageSize": len(molds),
			"version":  moldListVersion(molds),
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
		"items":    mapMoldResponses(items),
		"total":    total,
		"page":     page,
		"pageSize": pageSize,
		"version":  moldListVersion(items),
	})
}

func GetMoldGroupNamesHandler(c *gin.Context) {
	var rows []moldGroupNameRow
	err := db.DB.Model(&models.Mold{}).
		Select("DISTINCT TRIM(group_name) AS group_name").
		Where("group_name IS NOT NULL").
		Where("TRIM(group_name) <> ''").
		Order("TRIM(group_name) ASC").
		Scan(&rows).Error
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] 获取模具组名失败: " + err.Error()})
		return
	}

	groupNames := make([]string, 0, len(rows))
	for _, row := range rows {
		groupNames = append(groupNames, row.GroupName)
	}

	c.JSON(http.StatusOK, groupNames)
}

// GetMoldHandler 获取单个模具
func GetMoldHandler(c *gin.Context) {
	id := c.Param("id")
	var mold models.Mold
	if err := db.DB.First(&mold, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "[SERVER] 模具不存在"})
		return
	}
	c.JSON(http.StatusOK, mapMoldResponse(mold))
}

func CheckMoldDuplicateSNHandler(c *gin.Context) {
	sn := strings.TrimSpace(c.Query("sn"))
	excludeID := strings.TrimSpace(c.Query("excludeId"))
	if sn == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] sn is required"})
		return
	}

	query := db.DB.Model(&models.Mold{}).Where("sn = ?", sn)
	if excludeID != "" {
		query = query.Where("id <> ?", excludeID)
	}

	var count int64
	if err := query.Count(&count).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] failed to check duplicate mold sn: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"duplicate": count > 0})
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

// SaveMoldHandler 保存/创建模具
func SaveMoldHandler(c *gin.Context) {
	var input services.SaveMoldRequest
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] 模具格式错误"})
		return
	}

	mold, err := services.NewEquipmentAssetService(db.DB).SaveMold(auditContextFromGin(c), input)
	if err != nil {
		respondDomainError(c, err, "[SERVER] 保存模具资产失败: ")
		return
	}
	c.JSON(http.StatusOK, mapMoldResponse(mold))
}

// PatchMoldHandler 差分更新 (解决全量保存开销风险)
func PatchMoldHandler(c *gin.Context) {
	id := c.Param("id")
	var input services.SDRTSDeltaHandlerRequest
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] 无效的更新数据"})
		return
	}

	mold, err := services.NewEquipmentAssetService(db.DB).PatchMold(auditContextFromGin(c), id, input.Delta)
	if err != nil {
		respondDomainError(c, err, "[SERVER] 更新模具属性失败: ")
		return
	}
	c.JSON(http.StatusOK, mapMoldResponse(mold))
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

	if err := services.NewEquipmentAssetService(db.DB).UpdateMoldTelemetry(auditContextFromGin(c), id, input.Cycles); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] 更新遥测失败"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"status": "success"})
}

// BulkSyncMoldsHandler 批量同步模具 (数据抢救)
func BulkSyncMoldsHandler(c *gin.Context) {
	if !enforceBulkSyncPermissions(c) {
		return
	}

	var molds []models.Mold
	if err := c.ShouldBindJSON(&molds); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] 批量同步数据错误: " + err.Error()})
		return
	}

	if err := services.NewEquipmentAssetService(db.DB).BulkSyncMolds(auditContextFromGin(c), molds); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] 批量同步失败: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"status": "success", "count": len(molds)})
}
