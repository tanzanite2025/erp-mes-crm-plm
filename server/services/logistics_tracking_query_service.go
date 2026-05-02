package services

import (
	"bytes"
	"crypto/md5"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"net/http"
	"sort"
	"strings"
	"time"
	"xdfc-server/db"
	"xdfc-server/models"

	"gorm.io/gorm"
)

const (
	deliveryOrderStatusPending    = "Pending"
	deliveryOrderStatusCollected  = "Collected"
	deliveryOrderStatusInTransit  = "InTransit"
	deliveryOrderStatusDelivering = "Delivering"
	deliveryOrderStatusSigned     = "Signed"
	deliveryOrderStatusException  = "Exception"
	deliveryOrderStatusReturned   = "Returned"
)

var ErrDeliveryTrackingOrderNotFound = errors.New("delivery tracking order not found")

var logisticsTrackingHTTPClientFactory = func() *http.Client {
	return &http.Client{
		Timeout: 8 * time.Second,
		CheckRedirect: func(req *http.Request, via []*http.Request) error {
			return http.ErrUseLastResponse
		},
	}
}

type LogisticsTrackingRefreshResult struct {
	Status         string
	Message        string
	Action         string
	ProviderCode   string
	InsertedTraces int
	CheckedAt      time.Time
}

type logistics17TrackRequestItem struct {
	Number        string `json:"number"`
	Carrier       int    `json:"carrier,omitempty"`
	AutoDetection bool   `json:"auto_detection,omitempty"`
}

type logistics17TrackResponseEnvelope struct {
	Code int `json:"code"`
	Data struct {
		Accepted []logistics17TrackAcceptedItem `json:"accepted"`
		Rejected []logistics17TrackRejectedItem `json:"rejected"`
	} `json:"data"`
}

type logistics17TrackAcceptedItem struct {
	Origin  int                 `json:"origin"`
	Number  string              `json:"number"`
	Carrier int                 `json:"carrier"`
	Track   logistics17TrackDTO `json:"track"`
}

type logistics17TrackRejectedItem struct {
	Number string `json:"number"`
	Error  struct {
		Code    int    `json:"code"`
		Message string `json:"message"`
	} `json:"error"`
}

type logistics17TrackDTO struct {
	PackageState int                     `json:"e"`
	Current      *logistics17TrackEvent  `json:"z0"`
	Primary      []logistics17TrackEvent `json:"z1"`
	Secondary    []logistics17TrackEvent `json:"z2"`
	Additional   []logistics17TrackEvent `json:"z9"`
}

type logistics17TrackEvent struct {
	Time     string `json:"a"`
	Location string `json:"c"`
	Detail   string `json:"d"`
	Context  string `json:"z"`
}

type normalizedTrackingTrace struct {
	Time     time.Time
	Context  string
	Location string
}

func RefreshDeliveryTracking(trackingNo string) (LogisticsTrackingRefreshResult, error) {
	checkedAt := time.Now()
	result := LogisticsTrackingRefreshResult{
		CheckedAt: checkedAt,
	}

	normalizedTrackingNo := strings.TrimSpace(trackingNo)
	if normalizedTrackingNo == "" {
		return result, ErrDeliveryTrackingOrderNotFound
	}

	var order models.DeliveryOrder
	if err := db.DB.Where("tracking_no = ?", normalizedTrackingNo).First(&order).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return result, ErrDeliveryTrackingOrderNotFound
		}
		return result, err
	}

	var provider models.LogisticsAPIProvider
	if err := db.DB.Where("code = ? AND status = ?", order.CarrierCode, "Enabled").First(&provider).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			result.Status = "manual_review"
			result.Message = "enabled logistics provider is not available for this order"
			result.Action = "请先启用对应物流服务商后，再执行实时轨迹查询。"
			result.ProviderCode = strings.ToUpper(strings.TrimSpace(order.CarrierCode))
			return result, nil
		}
		return result, err
	}

	provider.Code = strings.ToUpper(strings.TrimSpace(provider.Code))
	result.ProviderCode = provider.Code

	resolution := ResolveTrustedLogisticsProviderTarget(provider.Code, LogisticsProviderTargetPurposeTracking)
	if !resolution.Supported || strings.TrimSpace(resolution.TargetURL) == "" {
		result.Status = "manual_review"
		result.Message = "automatic real-time tracking is not available for this provider"
		result.Action = resolution.ActionMessage
		if strings.TrimSpace(result.Action) == "" {
			result.Action = "当前厂商未启用系统内置 tracking 受控目标，请改用人工联调。"
		}
		return result, nil
	}

	switch provider.Code {
	case "17TRACK":
		return refresh17TrackDeliveryTracking(order, provider, checkedAt)
	default:
		result.Status = "manual_review"
		result.Message = "real-time tracking adapter is not available for this provider yet"
		result.Action = "当前厂商已纳入受控目标治理，但真实 tracking 适配尚未落地，请先使用人工联调或等待后续接入。"
		return result, nil
	}
}

func refresh17TrackDeliveryTracking(order models.DeliveryOrder, provider models.LogisticsAPIProvider, checkedAt time.Time) (LogisticsTrackingRefreshResult, error) {
	result := LogisticsTrackingRefreshResult{
		CheckedAt:    checkedAt,
		ProviderCode: provider.Code,
	}
	if strings.TrimSpace(provider.AppKey) == "" {
		result.Status = "invalid_config"
		result.Message = "17track access key is required"
		result.Action = "请在物流服务商配置的 AppKey 字段填写 17TRACK Access Key 后重试。"
		return result, nil
	}

	acceptedCarrier, registerErr := register17TrackTracking(order.TrackingNo, provider)
	if registerErr != nil {
		result.Status = "error"
		result.Message = "trusted tracking registration failed"
		result.Action = "请稍后重试；若持续失败，请核对 17TRACK Access Key 与单号格式。"
		return result, nil
	}

	trackInfo, queryErr := get17TrackInfo(order.TrackingNo, acceptedCarrier, provider)
	if queryErr != nil {
		result.Status = "error"
		result.Message = "trusted tracking query failed"
		result.Action = "请稍后重试；若持续失败，请在 17TRACK 控制台核对该单号的订阅与查询状态。"
		return result, nil
	}

	traces := normalize17TrackTraceItems(trackInfo)
	insertedTraces, persistErr := persistDeliveryTrackingRefresh(order, provider, traces, checkedAt)
	if persistErr != nil {
		return result, persistErr
	}

	result.Status = "refreshed"
	result.Message = "trusted tracking query completed"
	result.Action = "系统已通过受控 17TRACK 网关完成实时查询，并同步写回本地轨迹数据。"
	result.InsertedTraces = insertedTraces
	return result, nil
}

func register17TrackTracking(trackingNo string, provider models.LogisticsAPIProvider) (int, error) {
	requestPayload := []logistics17TrackRequestItem{{
		Number:        trackingNo,
		AutoDetection: true,
	}}
	var response logistics17TrackResponseEnvelope
	if err := execute17TrackRequest(provider, "register", requestPayload, &response); err != nil {
		log.Printf("[LOGISTICS-TRACKING][WARN] 17TRACK register failed: tracking=%s provider=%s err=%v", trackingNo, provider.Code, err)
		return 0, err
	}
	if len(response.Data.Rejected) > 0 {
		return 0, errors.New("17track register rejected tracking number")
	}
	if len(response.Data.Accepted) == 0 {
		return 0, errors.New("17track register returned no accepted tracking number")
	}
	return response.Data.Accepted[0].Carrier, nil
}

func get17TrackInfo(trackingNo string, carrier int, provider models.LogisticsAPIProvider) (logistics17TrackDTO, error) {
	requestItem := logistics17TrackRequestItem{Number: trackingNo}
	if carrier > 0 {
		requestItem.Carrier = carrier
	}
	requestPayload := []logistics17TrackRequestItem{requestItem}
	var response logistics17TrackResponseEnvelope
	if err := execute17TrackRequest(provider, "gettrackinfo", requestPayload, &response); err != nil {
		log.Printf("[LOGISTICS-TRACKING][WARN] 17TRACK gettrackinfo failed: tracking=%s provider=%s err=%v", trackingNo, provider.Code, err)
		return logistics17TrackDTO{}, err
	}
	if len(response.Data.Rejected) > 0 {
		return logistics17TrackDTO{}, errors.New("17track gettrackinfo rejected tracking number")
	}
	if len(response.Data.Accepted) == 0 {
		return logistics17TrackDTO{}, errors.New("17track gettrackinfo returned no accepted payload")
	}
	return response.Data.Accepted[0].Track, nil
}

func execute17TrackRequest(provider models.LogisticsAPIProvider, pathSuffix string, payload any, target any) error {
	bodyBytes, err := json.Marshal(payload)
	if err != nil {
		return err
	}
	requestPlan, err := BuildTrustedLogisticsProviderRequestForPath(provider, LogisticsProviderTargetPurposeTracking, http.MethodPost, pathSuffix, bytes.NewReader(bodyBytes))
	if err != nil {
		return err
	}
	requestPlan.Request.Header.Set("Content-Type", "application/json")
	requestPlan.Request.Header.Set("17token", strings.TrimSpace(provider.AppKey))
	requestPlan.Request.Header.Set("User-Agent", "XDFC-Logistics-Tracking/1.0")

	response, err := logisticsTrackingHTTPClientFactory().Do(requestPlan.Request)
	if err != nil {
		return err
	}
	defer response.Body.Close()
	if response.StatusCode < 200 || response.StatusCode >= 300 {
		return fmt.Errorf("17track request returned status %d", response.StatusCode)
	}
	if err := json.NewDecoder(response.Body).Decode(target); err != nil {
		return err
	}

	envelope, ok := target.(*logistics17TrackResponseEnvelope)
	if !ok {
		return errors.New("17track response envelope is invalid")
	}
	if envelope.Code != 0 {
		return fmt.Errorf("17track response code %d", envelope.Code)
	}
	return nil
}

func normalize17TrackTraceItems(track logistics17TrackDTO) []normalizedTrackingTrace {
	traceMap := make(map[string]normalizedTrackingTrace)
	appendEvent := func(event logistics17TrackEvent) {
		context := strings.TrimSpace(event.Context)
		if context == "" {
			return
		}
		eventTime, ok := parse17TrackEventTime(event.Time)
		if !ok {
			return
		}
		location := strings.TrimSpace(event.Location)
		if location == "" {
			location = strings.TrimSpace(event.Detail)
		}
		key := fmt.Sprintf("%s|%s|%s", eventTime.UTC().Format(time.RFC3339), context, location)
		traceMap[key] = normalizedTrackingTrace{
			Time:     eventTime,
			Context:  context,
			Location: location,
		}
	}
	if track.Current != nil {
		appendEvent(*track.Current)
	}
	for _, event := range track.Primary {
		appendEvent(event)
	}
	for _, event := range track.Secondary {
		appendEvent(event)
	}
	for _, event := range track.Additional {
		appendEvent(event)
	}

	traces := make([]normalizedTrackingTrace, 0, len(traceMap))
	for _, trace := range traceMap {
		traces = append(traces, trace)
	}
	sort.Slice(traces, func(i, j int) bool {
		if traces[i].Time.Equal(traces[j].Time) {
			if traces[i].Context == traces[j].Context {
				return traces[i].Location < traces[j].Location
			}
			return traces[i].Context < traces[j].Context
		}
		return traces[i].Time.Before(traces[j].Time)
	})
	return traces
}

func parse17TrackEventTime(value string) (time.Time, bool) {
	normalized := strings.TrimSpace(value)
	if normalized == "" {
		return time.Time{}, false
	}
	for _, layout := range []string{
		"2006-01-02 15:04:05",
		"2006-01-02 15:04",
		"2006-01-02",
		time.RFC3339,
	} {
		if parsed, err := time.ParseInLocation(layout, normalized, time.Local); err == nil {
			return parsed, true
		}
	}
	return time.Time{}, false
}

func persistDeliveryTrackingRefresh(order models.DeliveryOrder, provider models.LogisticsAPIProvider, traces []normalizedTrackingTrace, checkedAt time.Time) (int, error) {
	insertedTraces := 0
	err := db.DB.Transaction(func(tx *gorm.DB) error {
		for _, trace := range traces {
			hashKey := generateDeliveryTrackingHash(order.TrackingNo, trace.Time, trace.Context)
			detail := models.DeliveryTrackingDetail{
				DeliveryOrderID: order.ID,
				Time:            trace.Time,
				Context:         trace.Context,
				Location:        trace.Location,
				HashKey:         hashKey,
			}
			result := tx.Where("hash_key = ?", hashKey).FirstOrCreate(&detail)
			if result.Error != nil {
				return result.Error
			}
			if result.RowsAffected > 0 {
				insertedTraces++
			}
		}

		updates := map[string]any{
			"last_push_at": checkedAt,
		}
		if len(traces) > 0 {
			latest := traces[len(traces)-1]
			status := deriveDeliveryTrackingStatus(order.Status, latest.Context)
			updates["status"] = status
			updates["last_event"] = latest.Context
			updates["last_location"] = latest.Location
			if status == deliveryOrderStatusSigned {
				updates["signed_at"] = checkedAt
			}
		}
		if err := tx.Model(&models.DeliveryOrder{}).Where("id = ?", order.ID).Updates(updates).Error; err != nil {
			return err
		}
		if err := tx.Model(&models.LogisticsAPIProvider{}).Where("id = ?", provider.ID).Update("quota_used", gorm.Expr("quota_used + 1")).Error; err != nil {
			return err
		}
		return nil
	})
	return insertedTraces, err
}

func generateDeliveryTrackingHash(trackingNo string, eventTime time.Time, context string) string {
	raw := fmt.Sprintf("%s|%s|%s", trackingNo, eventTime.Format(time.RFC3339), context)
	return fmt.Sprintf("%x", md5.Sum([]byte(raw)))
}

func deriveDeliveryTrackingStatus(currentStatus string, latestContext string) string {
	normalizedCurrent := strings.TrimSpace(currentStatus)
	normalizedLatest := strings.ToLower(strings.TrimSpace(latestContext))
	if normalizedLatest == "" {
		if normalizedCurrent == "" {
			return deliveryOrderStatusPending
		}
		return normalizedCurrent
	}
	if strings.Contains(normalizedLatest, "签收") || strings.Contains(normalizedLatest, "delivered") || strings.Contains(normalizedLatest, "received") {
		return deliveryOrderStatusSigned
	}
	if strings.Contains(normalizedLatest, "退回") || strings.Contains(normalizedLatest, "退件") || strings.Contains(normalizedLatest, "returned") {
		return deliveryOrderStatusReturned
	}
	if strings.Contains(normalizedLatest, "异常") || strings.Contains(normalizedLatest, "失败") || strings.Contains(normalizedLatest, "undelivered") || strings.Contains(normalizedLatest, "alert") || strings.Contains(normalizedLatest, "exception") {
		return deliveryOrderStatusException
	}
	if strings.Contains(normalizedLatest, "派送") || strings.Contains(normalizedLatest, "out for delivery") || strings.Contains(normalizedLatest, "delivery") {
		return deliveryOrderStatusDelivering
	}
	if strings.Contains(normalizedLatest, "揽收") || strings.Contains(normalizedLatest, "收件") || strings.Contains(normalizedLatest, "pickup") || strings.Contains(normalizedLatest, "collected") {
		return deliveryOrderStatusCollected
	}
	return deliveryOrderStatusInTransit
}
