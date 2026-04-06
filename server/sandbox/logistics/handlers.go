package logistics

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"time"

	"gorm.io/gorm"
)

// =========================================================================
// 物流 API 隔离砂箱 · Webhook 处理器
// 订阅推送制 (Push-Native) 回调逻辑
// =========================================================================

// SandboxHandler 砂箱物流处理器
type SandboxHandler struct {
	DB *gorm.DB
}

// NewSandboxHandler 初始化砂箱处理器
func NewSandboxHandler(db *gorm.DB) *SandboxHandler {
	return &SandboxHandler{DB: db}
}

// -------------------------------------------------------------------------
// CallbackPayload 第三方推送的标准化回调结构
// 兼容快递鸟/快递100 的通用字段抽象
// -------------------------------------------------------------------------
type CallbackPayload struct {
	TrackingNo  string         `json:"trackingNo"`
	CarrierCode string         `json:"carrierCode"`
	Status      string         `json:"status"`      // 映射到 DeliveryOrderStatus
	Traces      []TraceItem    `json:"traces"`
	Signature   string         `json:"signature"`   // 签名校验值
	Timestamp   string         `json:"timestamp"`   // 请求时间戳
}

// TraceItem 单条轨迹数据
type TraceItem struct {
	Time     string `json:"time"`     // 路由发生时间 (ISO 8601)
	Context  string `json:"context"`  // 路由描述
	Location string `json:"location"` // 城市/位置
}

// -------------------------------------------------------------------------
// HandleWebhookCallback 处理回调推送 (核心入口)
// POST /api/v1/sandbox/callback/logistics
// -------------------------------------------------------------------------
func (h *SandboxHandler) HandleWebhookCallback(w http.ResponseWriter, r *http.Request) {
	// 1. 读取请求体
	body, err := io.ReadAll(r.Body)
	if err != nil {
		log.Printf("[LOGISTICS-SANDBOX] Failed to read callback body: %v", err)
		http.Error(w, "Bad Request", http.StatusBadRequest)
		return
	}
	defer r.Body.Close()

	// 2. 解析回调结构
	var payload CallbackPayload
	if err := json.Unmarshal(body, &payload); err != nil {
		log.Printf("[LOGISTICS-SANDBOX] Failed to parse callback JSON: %v", err)
		http.Error(w, "Invalid JSON", http.StatusBadRequest)
		return
	}

	// 3. 签名校验 (安全准入)
	if !h.verifySignature(payload, body) {
		log.Printf("[LOGISTICS-SANDBOX][SECURITY] Signature verification FAILED for tracking: %s", payload.TrackingNo)
		http.Error(w, "Signature Mismatch", http.StatusForbidden)
		return
	}

	// 4. 查找对应的物流主单
	var order DeliveryOrder
	result := h.DB.Where("tracking_no = ?", payload.TrackingNo).First(&order)
	if result.Error != nil {
		log.Printf("[LOGISTICS-SANDBOX][CRITICAL] DeliveryOrder not found for tracking: %s", payload.TrackingNo)
		http.Error(w, "Order Not Found", http.StatusNotFound)
		return
	}

	// 5. 写入轨迹明细 (含幂等性校验)
	insertedCount := 0
	for _, trace := range payload.Traces {
		eventTime, parseErr := time.Parse("2006-01-02 15:04:05", trace.Time)
		if parseErr != nil {
			log.Printf("[LOGISTICS-SANDBOX] Skipping trace with invalid time format: %s", trace.Time)
			continue
		}

		hashKey := GenerateHashKey(payload.TrackingNo, eventTime, trace.Context)

		detail := DeliveryTrackingDetail{
			DeliveryOrderID: order.ID,
			Time:            eventTime,
			Context:         trace.Context,
			Location:        trace.Location,
			HashKey:         hashKey,
		}

		// 幂等性写入：如果 HashKey 已存在则跳过 (UPSERT 语义)
		insertResult := h.DB.Where("hash_key = ?", hashKey).FirstOrCreate(&detail)
		if insertResult.RowsAffected > 0 {
			insertedCount++
		}
	}

	// 6. 更新主表状态
	now := time.Now()
	updates := map[string]interface{}{
		"status":      mapStatus(payload.Status),
		"last_push_at": now,
	}

	if len(payload.Traces) > 0 {
		lastTrace := payload.Traces[len(payload.Traces)-1]
		updates["last_event"] = lastTrace.Context
		updates["last_location"] = lastTrace.Location
	}

	if mapStatus(payload.Status) == StatusSigned {
		updates["signed_at"] = now
	}

	h.DB.Model(&order).Updates(updates)

	log.Printf("[LOGISTICS-SANDBOX] Callback processed: tracking=%s, new_traces=%d, status=%s",
		payload.TrackingNo, insertedCount, payload.Status)

	// 7. 返回 200 确认接收
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	fmt.Fprintf(w, `{"result":"success","insertedTraces":%d}`, insertedCount)
}

// -------------------------------------------------------------------------
// 签名校验：HMAC-SHA256
// -------------------------------------------------------------------------
func (h *SandboxHandler) verifySignature(payload CallbackPayload, rawBody []byte) bool {
	// 从数据库加载对应承运商的 AppSecret
	var provider LogisticsProvider
	result := h.DB.Where("code = ? AND status = 'Enabled'", payload.CarrierCode).First(&provider)
	if result.Error != nil {
		log.Printf("[LOGISTICS-SANDBOX] Provider not found for code: %s", payload.CarrierCode)
		return false
	}

	// 使用 HMAC-SHA256 校验
	mac := hmac.New(sha256.New, []byte(provider.AppSecret))
	mac.Write([]byte(payload.Timestamp + string(rawBody)))
	expectedSig := hex.EncodeToString(mac.Sum(nil))

	return hmac.Equal([]byte(payload.Signature), []byte(expectedSig))
}

// -------------------------------------------------------------------------
// mapStatus 将第三方状态码映射为内部状态机
// -------------------------------------------------------------------------
func mapStatus(externalStatus string) DeliveryOrderStatus {
	switch externalStatus {
	case "0", "Pending":
		return StatusPending
	case "1", "Collected":
		return StatusCollected
	case "2", "InTransit":
		return StatusInTransit
	case "3", "Delivering":
		return StatusDelivering
	case "4", "Signed":
		return StatusSigned
	case "5", "Exception":
		return StatusException
	case "6", "Returned":
		return StatusReturned
	default:
		return StatusInTransit
	}
}
