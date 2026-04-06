package handlers

import (
	"crypto/md5"
	"fmt"
	"log"
	"net/http"
	"time"
	"xdfc-server/db"
	"xdfc-server/models"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// =========================================================================
// 物流 API 推送制 · Gin 原生适配层 (Hot-Pluggable)
// 该文件与旧 logistics.go 完全独立，可安全删除
// =========================================================================

// --- 状态常量 ---

const (
	DOStatusPending    = "Pending"
	DOStatusCollected  = "Collected"
	DOStatusInTransit  = "InTransit"
	DOStatusDelivering = "Delivering"
	DOStatusSigned     = "Signed"
	DOStatusException  = "Exception"
	DOStatusReturned   = "Returned"
)

// --- 幂等性哈希工具 ---

func generateTrackingHash(trackingNo string, eventTime time.Time, context string) string {
	raw := fmt.Sprintf("%s|%s|%s", trackingNo, eventTime.Format(time.RFC3339), context)
	hash := md5.Sum([]byte(raw))
	return fmt.Sprintf("%x", hash)
}

// =========================================================================
// Handler 层：物流服务商管理
// =========================================================================

// GetLogisticsProvidersHandler 获取所有物流服务商配置
func GetLogisticsProvidersHandler(c *gin.Context) {
	var providers []models.LogisticsAPIProvider
	if err := db.DB.Order("created_at desc").Find(&providers).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[LOGISTICS-PUSH] 获取服务商列表失败: " + err.Error()})
		return
	}
	c.JSON(http.StatusOK, providers)
}

// SaveLogisticsProviderHandler 保存/更新物流服务商
func SaveLogisticsProviderHandler(c *gin.Context) {
	var input models.LogisticsAPIProvider
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] 数据格式错误"})
		return
	}

	if input.ID != 0 {
		if err := db.DB.Model(&input).Updates(input).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "更新失败"})
			return
		}
	} else {
		if err := db.DB.Create(&input).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "创建失败"})
			return
		}
	}
	c.JSON(http.StatusOK, input)
}

// DeleteLogisticsProviderHandler 删除服务商
func DeleteLogisticsProviderHandler(c *gin.Context) {
	id := c.Param("id")
	if err := db.DB.Delete(&models.LogisticsAPIProvider{}, id).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "删除失败"})
		return
	}
	c.Status(http.StatusNoContent)
}

// =========================================================================
// Handler 层：物流订单与轨迹
// =========================================================================

// GetDeliveryOrdersHandler 获取推送制物流订单列表
func GetDeliveryOrdersHandler(c *gin.Context) {
	var orders []models.DeliveryOrder
	query := db.DB.Order("updated_at desc")

	if bizNo := c.Query("bizOrderNo"); bizNo != "" {
		query = query.Where("biz_order_no = ?", bizNo)
	}
	if status := c.Query("status"); status != "" {
		query = query.Where("status = ?", status)
	}

	if err := query.Find(&orders).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "[LOGISTICS-PUSH] 查询失败"})
		return
	}
	c.JSON(http.StatusOK, orders)
}

// GetDeliveryTrackingHandler 获取单票轨迹明细
func GetDeliveryTrackingHandler(c *gin.Context) {
	trackingNo := c.Param("trackingNo")

	var order models.DeliveryOrder
	if err := db.DB.Where("tracking_no = ?", trackingNo).First(&order).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "[LOGISTICS-PUSH] 单号不存在"})
		return
	}

	var details []models.DeliveryTrackingDetail
	db.DB.Where("delivery_order_id = ?", order.ID).Order("time desc").Find(&details)

	c.JSON(http.StatusOK, gin.H{
		"order":   order,
		"traces":  details,
	})
}

// =========================================================================
// Handler 层：Webhook 回调接收 (公网入口)
// =========================================================================

type webhookPayload struct {
	TrackingNo  string       `json:"trackingNo"`
	CarrierCode string       `json:"carrierCode"`
	Status      string       `json:"status"`
	Traces      []traceItem  `json:"traces"`
}

type traceItem struct {
	Time     string `json:"time"`
	Context  string `json:"context"`
	Location string `json:"location"`
}

// HandlePushCallbackHandler 接收物流平台推送回调
func HandlePushCallbackHandler(c *gin.Context) {
	var payload webhookPayload
	if err := c.ShouldBindJSON(&payload); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid callback payload"})
		return
	}

	// 查找主单
	var order models.DeliveryOrder
	if err := db.DB.Where("tracking_no = ?", payload.TrackingNo).First(&order).Error; err != nil {
		log.Printf("[LOGISTICS-PUSH][WARN] Callback for unknown tracking: %s", payload.TrackingNo)
		c.JSON(http.StatusNotFound, gin.H{"error": "Order not found"})
		return
	}

	// 幂等写入轨迹
	inserted := 0
	for _, t := range payload.Traces {
		eventTime, parseErr := time.Parse("2006-01-02 15:04:05", t.Time)
		if parseErr != nil {
			continue
		}

		hashKey := generateTrackingHash(payload.TrackingNo, eventTime, t.Context)
		detail := models.DeliveryTrackingDetail{
			DeliveryOrderID: order.ID,
			Time:            eventTime,
			Context:         t.Context,
			Location:        t.Location,
			HashKey:         hashKey,
		}

		res := db.DB.Where("hash_key = ?", hashKey).FirstOrCreate(&detail)
		if res.RowsAffected > 0 {
			inserted++
		}
	}

	// 更新主表状态
	now := time.Now()
	updates := map[string]interface{}{
		"status":       mapPushStatus(payload.Status),
		"last_push_at": now,
	}
	if len(payload.Traces) > 0 {
		last := payload.Traces[len(payload.Traces)-1]
		updates["last_event"] = last.Context
		updates["last_location"] = last.Location
	}
	if mapPushStatus(payload.Status) == DOStatusSigned {
		updates["signed_at"] = now
	}

	db.DB.Model(&order).Updates(updates)

	c.JSON(http.StatusOK, gin.H{"result": "success", "insertedTraces": inserted})
}

func mapPushStatus(s string) string {
	switch s {
	case "0", "Pending":
		return DOStatusPending
	case "1", "Collected":
		return DOStatusCollected
	case "2", "InTransit":
		return DOStatusInTransit
	case "3", "Delivering":
		return DOStatusDelivering
	case "4", "Signed":
		return DOStatusSigned
	case "5", "Exception":
		return DOStatusException
	case "6", "Returned":
		return DOStatusReturned
	default:
		return DOStatusInTransit
	}
}

// =========================================================================
// 补偿任务：漏抓取自动对冲 (由 main.go Cron 调用)
// =========================================================================

// RunLogisticsCompensation 扫描失联订单并主动查询补偿
func RunLogisticsCompensation() {
	log.Println("[LOGISTICS-JANITOR] Starting compensation scan...")

	threshold := time.Now().Add(-12 * time.Hour)
	var staleOrders []models.DeliveryOrder
	result := db.DB.Where(
		"status NOT IN (?, ?, ?) AND (last_push_at IS NULL OR last_push_at < ?)",
		DOStatusSigned, DOStatusException, DOStatusReturned,
		threshold,
	).Limit(100).Find(&staleOrders)

	if result.Error != nil {
		log.Printf("[LOGISTICS-JANITOR][CRITICAL] Query failed: %v", result.Error)
		return
	}

	if len(staleOrders) == 0 {
		log.Println("[LOGISTICS-JANITOR] No stale orders. System healthy.")
		return
	}

	log.Printf("[LOGISTICS-JANITOR] Found %d stale order(s). Initiating polling...", len(staleOrders))

	for _, order := range staleOrders {
		var provider models.LogisticsAPIProvider
		if err := db.DB.Where("code = ? AND status = 'Enabled'", order.CarrierCode).First(&provider).Error; err != nil {
			log.Printf("[LOGISTICS-JANITOR] Provider %s not found, skipping %s", order.CarrierCode, order.TrackingNo)
			continue
		}

		// 砂箱占位：正式并网时替换为真实 HTTP 调用
		log.Printf("[LOGISTICS-JANITOR][STUB] Would poll %s for %s", provider.Name, order.TrackingNo)

		// 记录额度消耗
		db.DB.Model(&provider).Update("quota_used", gorm.Expr("quota_used + 1"))

		// 额度告警
		remaining := provider.QuotaTotal - provider.QuotaUsed
		if remaining <= provider.QuotaAlertAt && provider.QuotaTotal > 0 {
			log.Printf("[LOGISTICS-JANITOR][WARNING] API quota LOW for %s: remaining=%d", provider.Name, remaining)
		}
	}

	log.Println("[LOGISTICS-JANITOR] Compensation scan complete.")
}
