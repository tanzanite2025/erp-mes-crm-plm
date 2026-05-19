package handlers

import (
	"net/http"
	"strconv"
	"strings"
	"time"
	"xdfc-server/db"
	"xdfc-server/middleware"
	"xdfc-server/repositories"
	"xdfc-server/services"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// GetMaintenanceRecordsHandler 获取维保记录列表
// 支持按 assetType + assetId 查询特定设备的记录
// 支持全局查询（不传 assetType/assetId）
// 支持分页、筛选、搜索
func GetMaintenanceRecordsHandler(c *gin.Context) {
	// 解析查询参数
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "100"))
	offset, _ := strconv.Atoi(c.DefaultQuery("offset", "0"))

	if limit < 1 {
		limit = 100
	}
	if limit > 1000 {
		limit = 1000
	}
	if offset < 0 {
		offset = 0
	}

	// 解析优先级（支持逗号分隔）
	var priorities []string
	if priority := c.Query("priority"); priority != "" {
		for _, p := range strings.Split(priority, ",") {
			priorities = append(priorities, strings.TrimSpace(p))
		}
	}

	params := repositories.ListParams{
		AssetType:  c.Query("assetType"),
		AssetID:    c.Query("assetId"),
		Status:     c.Query("status"),
		Priorities: priorities,
		Type:       c.Query("type"),
		DateFrom:   c.Query("dateFrom"),
		DateTo:     c.Query("dateTo"),
		Search:     c.Query("search"),
		Limit:      limit,
		Offset:     offset,
	}

	// 调用 service 层
	svc := services.NewMaintenanceRecordService(db.DB)
	result, err := svc.ListRecords(params)
	if err != nil {
		respondError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"records": result.Records,
		"total":   result.Total,
		"limit":   limit,
		"offset":  offset,
	})
}

// GetMaintenanceRecordStatsHandler 获取维保记录统计数据
// 返回按状态分组的计数
func GetMaintenanceRecordStatsHandler(c *gin.Context) {
	svc := services.NewMaintenanceRecordService(db.DB)
	stats, err := svc.GetStats()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] 获取统计数据失败: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"open":       stats.Open,
		"inProgress": stats.InProgress,
		"completed":  stats.Completed,
		"cancelled":  stats.Cancelled,
		"total":      stats.Total,
	})
}

// GetMaintenanceRecordHandler 获取单条维保记录
func GetMaintenanceRecordHandler(c *gin.Context) {
	id := c.Param("id")

	svc := services.NewMaintenanceRecordService(db.DB)
	record, err := svc.GetByID(id)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "[NOT_FOUND] 维保记录不存在"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] 获取维保记录失败: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, record)
}

// CreateMaintenanceRecordHandler 创建维保记录
func CreateMaintenanceRecordHandler(c *gin.Context) {
	var input struct {
		AssetType   string     `json:"assetType"`
		AssetID     string     `json:"assetId"`
		AssetSN     string     `json:"assetSn"`
		Type        string     `json:"type"`
		Title       string     `json:"title"`
		Description string     `json:"description"`
		Priority    string     `json:"priority"`
		StartedAt   *time.Time `json:"startedAt"`
		CompletedAt *time.Time `json:"completedAt"`
		Cost        float64    `json:"cost"`
		Remarks     string     `json:"remarks"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] 数据格式错误: " + err.Error()})
		return
	}

	// 构建 service 输入
	createInput := services.CreateInput{
		AssetType:   input.AssetType,
		AssetID:     input.AssetID,
		AssetSN:     input.AssetSN,
		Type:        input.Type,
		Title:       input.Title,
		Description: input.Description,
		Priority:    input.Priority,
		StartedAt:   input.StartedAt,
		CompletedAt: input.CompletedAt,
		Cost:        input.Cost,
		Remarks:     input.Remarks,
		Operator:    middleware.GetSafeUsername(c),
		UserID:      middleware.GetSafeUserID(c),
		ClientIP:    c.ClientIP(),
	}

	// 调用 service 层
	svc := services.NewMaintenanceRecordService(db.DB)
	record, err := svc.Create(createInput)
	if err != nil {
		respondError(c, err)
		return
	}

	c.JSON(http.StatusOK, record)
}

// PatchMaintenanceRecordHandler 更新维保记录（差分更新）
func PatchMaintenanceRecordHandler(c *gin.Context) {
	id := c.Param("id")

	var input services.SDRTSDeltaHandlerRequest
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] 无效的更新数据"})
		return
	}

	// 构建 service 输入
	patchInput := services.PatchInput{
		ID:       id,
		Delta:    input.Delta,
		Version:  int(input.Metadata.Version),
		Operator: middleware.GetSafeUsername(c),
		UserID:   middleware.GetSafeUserID(c),
		ClientIP: c.ClientIP(),
	}

	// 调用 service 层
	svc := services.NewMaintenanceRecordService(db.DB)
	record, err := svc.Patch(patchInput)
	if err != nil {
		// 检查是否是版本冲突
		if strings.Contains(err.Error(), "[CONFLICT]") {
			respondVersionConflict(c)
			return
		}
		// 检查是否是状态转换错误（422）
		if strings.Contains(err.Error(), "不允许") {
			c.JSON(http.StatusUnprocessableEntity, gin.H{"error": err.Error()})
			return
		}
		respondError(c, err)
		return
	}

	c.JSON(http.StatusOK, record)
}

// DeleteMaintenanceRecordHandler 软删除维保记录
func DeleteMaintenanceRecordHandler(c *gin.Context) {
	id := c.Param("id")

	svc := services.NewMaintenanceRecordService(db.DB)
	err := svc.Delete(
		id,
		middleware.GetSafeUsername(c),
		middleware.GetSafeUserID(c),
		c.ClientIP(),
	)

	if err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "[NOT_FOUND] 维保记录不存在"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] 删除维保记录失败: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"status": "success"})
}

// respondError 统一错误响应处理
func respondError(c *gin.Context, err error) {
	errMsg := err.Error()

	// 根据错误前缀判断 HTTP 状态码
	if strings.HasPrefix(errMsg, "[VALIDATION]") {
		c.JSON(http.StatusBadRequest, gin.H{"error": errMsg})
	} else if strings.HasPrefix(errMsg, "[NOT_FOUND]") {
		c.JSON(http.StatusNotFound, gin.H{"error": errMsg})
	} else if strings.HasPrefix(errMsg, "[SERVER]") {
		c.JSON(http.StatusInternalServerError, gin.H{"error": errMsg})
	} else {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] " + errMsg})
	}
}
