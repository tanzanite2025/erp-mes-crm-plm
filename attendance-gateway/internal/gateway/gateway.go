package gateway

import (
	"context"
	"crypto/subtle"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"net/http"
	"strings"
	"sync/atomic"
	"time"

	"xdfc-attendance-gateway/internal/bridge"
	"xdfc-attendance-gateway/internal/config"
	"xdfc-attendance-gateway/internal/erp"
	"xdfc-attendance-gateway/internal/model"
	"xdfc-attendance-gateway/internal/queue"
)

const (
	bridgeTokenHeader = "X-ISUP-Gateway-Token"
	sourceName        = "hikvision-isup-ehome"
)

type Gateway struct {
	cfg          config.Config
	erp          *erp.Client
	queue        *queue.Store
	logger       *log.Logger
	server       *http.Server
	bridge       *bridge.Process
	received     atomic.Uint64
	forwarded    atomic.Uint64
	queued       atomic.Uint64
	failed       atomic.Uint64
	retried      atomic.Uint64
	shuttingDown atomic.Bool
}

func New(cfg config.Config, logger *log.Logger) (*Gateway, error) {
	if err := cfg.NormalizeAndValidate(); err != nil {
		return nil, err
	}
	store, err := queue.New(
		cfg.QueueDir,
		cfg.DeadLetterDir,
		cfg.MaxQueueItems,
		cfg.MaxRetryAttempts,
	)
	if err != nil {
		return nil, err
	}
	gateway := &Gateway{
		cfg:    cfg,
		erp:    erp.NewClient(cfg),
		queue:  store,
		logger: logger,
	}
	gateway.server = &http.Server{
		Addr:              cfg.ListenAddr,
		Handler:           gateway.routes(),
		ReadHeaderTimeout: 5 * time.Second,
		ReadTimeout:       15 * time.Second,
		WriteTimeout:      20 * time.Second,
		IdleTimeout:       60 * time.Second,
	}
	gateway.bridge = bridge.NewProcess(cfg, logger, gateway)
	return gateway, nil
}

func (g *Gateway) Run(ctx context.Context) error {
	go g.retryLoop(ctx)
	go g.bridge.Run(ctx)

	g.logger.Printf(
		"ISUP Gateway 启动: listen=%s erp=%s devices=%d",
		g.cfg.ListenAddr,
		g.cfg.ERPBaseURL,
		len(g.cfg.Devices),
	)
	errCh := make(chan error, 1)
	go func() {
		errCh <- g.server.ListenAndServe()
	}()

	select {
	case <-ctx.Done():
		return ctx.Err()
	case err := <-errCh:
		if errors.Is(err, http.ErrServerClosed) {
			return nil
		}
		return err
	}
}

func (g *Gateway) Shutdown(ctx context.Context) error {
	if g.shuttingDown.Swap(true) {
		return nil
	}
	return g.server.Shutdown(ctx)
}

func (g *Gateway) HandleBridgeMessage(ctx context.Context, message model.BridgeMessage) error {
	switch strings.ToLower(strings.TrimSpace(message.Type)) {
	case "event":
		if message.Event == nil {
			return errors.New("SDK Bridge event 消息缺少 event")
		}
		if message.Event.DeviceCode == "" {
			message.Event.DeviceCode = message.DeviceCode
		}
		return g.HandleEvents(ctx, model.EventBatch{
			DeviceCode: message.Event.DeviceCode,
			Events:     []model.Event{*message.Event},
		})
	case "events":
		return g.HandleEvents(ctx, model.EventBatch{
			DeviceCode: message.DeviceCode,
			Events:     message.Events,
		})
	case "status", "heartbeat":
		if message.Status == nil {
			message.Status = &model.StatusReport{
				DeviceCode: message.DeviceCode,
				Status:     message.Type,
				Message:    message.Message,
			}
		} else if message.Status.DeviceCode == "" {
			message.Status.DeviceCode = message.DeviceCode
		}
		return g.HandleStatus(ctx, *message.Status)
	default:
		return fmt.Errorf("SDK Bridge 消息类型不支持: %s", message.Type)
	}
}

func (g *Gateway) HandleEvents(ctx context.Context, batch model.EventBatch) error {
	deviceCode := normalizeDeviceCode(batch.DeviceCode)
	device, ok := g.cfg.FindDevice(deviceCode)
	if !ok || !device.Enabled {
		return fmt.Errorf("未配置或已禁用设备: %s", deviceCode)
	}
	if len(batch.Events) == 0 || len(batch.Events) > 1000 {
		return errors.New("考勤事件数量必须在 1 到 1000 之间")
	}

	for index := range batch.Events {
		event := &batch.Events[index]
		event.DeviceCode = device.DeviceCode
		if event.Source == "" {
			event.Source = sourceName
		}
		if event.DeviceEmployeeKey == "" {
			event.DeviceEmployeeKey = rawEmployeeKey(event.RawPayload)
		}
		if event.OccurredAt.IsZero() || event.DeviceEmployeeKey == "" {
			return fmt.Errorf("第 %d 条考勤事件缺少 occurredAt 或 deviceEmployeeKey", index+1)
		}
	}
	batch.DeviceCode = device.DeviceCode
	g.received.Add(uint64(len(batch.Events)))

	if err := g.erp.SendEvents(ctx, device, batch); err != nil {
		if _, queueErr := g.queue.Enqueue("events", device.DeviceCode, batch); queueErr != nil {
			g.failed.Add(uint64(len(batch.Events)))
			return fmt.Errorf("ERP 转发失败且离线队列写入失败: %w", queueErr)
		}
		g.queued.Add(uint64(len(batch.Events)))
		g.logger.Printf("ERP 暂不可达，已将 %d 条考勤事件写入离线队列: %v", len(batch.Events), err)
		return nil
	}
	g.forwarded.Add(uint64(len(batch.Events)))
	return nil
}

func (g *Gateway) HandleStatus(ctx context.Context, status model.StatusReport) error {
	deviceCode := normalizeDeviceCode(status.DeviceCode)
	device, ok := g.cfg.FindDevice(deviceCode)
	if !ok || !device.Enabled {
		return fmt.Errorf("未配置或已禁用设备: %s", deviceCode)
	}
	status.DeviceCode = device.DeviceCode
	if strings.TrimSpace(status.Status) == "" {
		status.Status = "heartbeat"
	}
	if err := g.erp.SendStatus(ctx, device, status); err != nil {
		if _, queueErr := g.queue.Enqueue("status", device.DeviceCode, status); queueErr != nil {
			g.failed.Add(1)
			return fmt.Errorf("ERP 状态转发失败且离线队列写入失败: %w", queueErr)
		}
		g.queued.Add(1)
		g.logger.Printf("ERP 暂不可达，已将设备 %s 状态写入离线队列: %v", device.DeviceCode, err)
		return nil
	}
	g.forwarded.Add(1)
	return nil
}

func (g *Gateway) routes() http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("/healthz", g.handleHealth)
	mux.HandleFunc("/readyz", g.handleReady)
	mux.HandleFunc("/metrics", g.handleMetrics)
	mux.HandleFunc("/v1/bridge/devices", g.withBridgeToken(g.handleBridgeDevices))
	mux.HandleFunc("/v1/bridge/events", g.withBridgeToken(g.handleBridgeEvents))
	mux.HandleFunc("/v1/bridge/status", g.withBridgeToken(g.handleBridgeStatus))
	return requestLogger(mux, g.logger)
}

func (g *Gateway) withBridgeToken(next http.HandlerFunc) http.HandlerFunc {
	return func(writer http.ResponseWriter, request *http.Request) {
		token := request.Header.Get(bridgeTokenHeader)
		if subtle.ConstantTimeCompare([]byte(token), []byte(g.cfg.BridgeToken)) != 1 {
			http.Error(writer, "网关 Bridge 令牌无效", http.StatusUnauthorized)
			return
		}
		next(writer, request)
	}
}

func (g *Gateway) handleBridgeDevices(writer http.ResponseWriter, request *http.Request) {
	if request.Method != http.MethodGet {
		writer.WriteHeader(http.StatusMethodNotAllowed)
		return
	}
	writeJSON(writer, http.StatusOK, g.cfg.BridgeDevices())
}

func (g *Gateway) handleBridgeEvents(writer http.ResponseWriter, request *http.Request) {
	if request.Method != http.MethodPost {
		writer.WriteHeader(http.StatusMethodNotAllowed)
		return
	}
	var batch model.EventBatch
	if err := decodeJSON(writer, request, &batch); err != nil {
		writeJSON(writer, http.StatusBadRequest, map[string]string{"error": err.Error()})
		return
	}
	if err := g.HandleEvents(request.Context(), batch); err != nil {
		writeJSON(writer, statusForGatewayError(err), map[string]string{"error": err.Error()})
		return
	}
	writeJSON(writer, http.StatusAccepted, map[string]interface{}{
		"status": "accepted",
		"queued": g.queued.Load(),
	})
}

func (g *Gateway) handleBridgeStatus(writer http.ResponseWriter, request *http.Request) {
	if request.Method != http.MethodPost {
		writer.WriteHeader(http.StatusMethodNotAllowed)
		return
	}
	var status model.StatusReport
	if err := decodeJSON(writer, request, &status); err != nil {
		writeJSON(writer, http.StatusBadRequest, map[string]string{"error": err.Error()})
		return
	}
	if err := g.HandleStatus(request.Context(), status); err != nil {
		writeJSON(writer, statusForGatewayError(err), map[string]string{"error": err.Error()})
		return
	}
	writeJSON(writer, http.StatusAccepted, map[string]string{"status": "accepted"})
}

func (g *Gateway) handleHealth(writer http.ResponseWriter, request *http.Request) {
	pending, err := g.queue.Count()
	if err != nil {
		writeJSON(writer, http.StatusServiceUnavailable, map[string]interface{}{
			"status": "error",
			"error":  err.Error(),
		})
		return
	}
	writeJSON(writer, http.StatusOK, map[string]interface{}{
		"status":       "ok",
		"service":      "xdfc-isup-gateway",
		"pendingQueue": pending,
		"devices":      len(g.cfg.Devices),
		"sdkBridge":    g.cfg.SDKBridgeCommand != "",
	})
}

func (g *Gateway) handleReady(writer http.ResponseWriter, request *http.Request) {
	pending, err := g.queue.Count()
	if err != nil {
		writeJSON(writer, http.StatusServiceUnavailable, map[string]string{"status": "not-ready", "error": err.Error()})
		return
	}
	writeJSON(writer, http.StatusOK, map[string]interface{}{
		"status":       "ready",
		"pendingQueue": pending,
		"erpBaseUrl":   g.cfg.ERPBaseURL,
		"devices":      len(g.cfg.Devices),
	})
}

func (g *Gateway) handleMetrics(writer http.ResponseWriter, request *http.Request) {
	pending, _ := g.queue.Count()
	writer.Header().Set("Content-Type", "text/plain; version=0.0.4")
	fmt.Fprintf(writer, "# TYPE xdfc_isup_gateway_received_events_total counter\n")
	fmt.Fprintf(writer, "xdfc_isup_gateway_received_events_total %d\n", g.received.Load())
	fmt.Fprintf(writer, "# TYPE xdfc_isup_gateway_forwarded_items_total counter\n")
	fmt.Fprintf(writer, "xdfc_isup_gateway_forwarded_items_total %d\n", g.forwarded.Load())
	fmt.Fprintf(writer, "# TYPE xdfc_isup_gateway_queued_items_total counter\n")
	fmt.Fprintf(writer, "xdfc_isup_gateway_queued_items_total %d\n", g.queued.Load())
	fmt.Fprintf(writer, "# TYPE xdfc_isup_gateway_failed_items_total counter\n")
	fmt.Fprintf(writer, "xdfc_isup_gateway_failed_items_total %d\n", g.failed.Load())
	fmt.Fprintf(writer, "# TYPE xdfc_isup_gateway_retried_items_total counter\n")
	fmt.Fprintf(writer, "xdfc_isup_gateway_retried_items_total %d\n", g.retried.Load())
	fmt.Fprintf(writer, "# TYPE xdfc_isup_gateway_pending_queue gauge\n")
	fmt.Fprintf(writer, "xdfc_isup_gateway_pending_queue %d\n", pending)
}

func (g *Gateway) retryLoop(ctx context.Context) {
	ticker := time.NewTicker(time.Duration(g.cfg.RetryIntervalSecond) * time.Second)
	defer ticker.Stop()
	for {
		g.retryPending(ctx)
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
		}
	}
}

func (g *Gateway) retryPending(ctx context.Context) {
	items, err := g.queue.List()
	if err != nil {
		g.logger.Printf("读取离线队列失败: %v", err)
		return
	}
	for _, item := range items {
		if ctx.Err() != nil {
			return
		}
		device, ok := g.cfg.FindDevice(item.DeviceCode)
		if !ok || !device.Enabled {
			message := fmt.Sprintf("离线队列消息对应设备不存在或已禁用: %s", item.DeviceCode)
			if deadErr := g.queue.MoveToDead(item, message); deadErr != nil {
				g.logger.Printf("转移设备 %s 的离线队列消息到死信失败: %v", item.DeviceCode, deadErr)
				continue
			}
			g.logger.Print(message)
			continue
		}
		var sendErr error
		switch item.Kind {
		case "events":
			var batch model.EventBatch
			sendErr = json.Unmarshal(item.Payload, &batch)
			if sendErr == nil {
				sendErr = g.erp.SendEvents(ctx, device, batch)
			}
		case "status":
			var status model.StatusReport
			sendErr = json.Unmarshal(item.Payload, &status)
			if sendErr == nil {
				sendErr = g.erp.SendStatus(ctx, device, status)
			}
		default:
			sendErr = fmt.Errorf("未知离线队列消息类型: %s", item.Kind)
		}
		if sendErr != nil {
			_ = g.queue.RecordFailure(item, sendErr.Error())
			continue
		}
		if err := g.queue.Remove(item); err != nil {
			g.logger.Printf("删除已重试队列消息失败 %s: %v", item.ID, err)
			continue
		}
		g.retried.Add(1)
		g.forwarded.Add(1)
	}
}

func rawEmployeeKey(payload map[string]interface{}) string {
	for _, key := range []string{"employeeNo", "employeeNoString", "pin", "employeeCode", "userId"} {
		if value, ok := payload[key]; ok {
			if text, ok := value.(string); ok && strings.TrimSpace(text) != "" {
				return strings.TrimSpace(text)
			}
			if number, ok := value.(float64); ok {
				return fmt.Sprintf("%.0f", number)
			}
		}
	}
	return ""
}

func normalizeDeviceCode(value string) string {
	value = strings.ToUpper(strings.TrimSpace(value))
	value = strings.NewReplacer("_", "-", " ", "-", ".", "-").Replace(value)
	return strings.Trim(value, "-")
}

func statusForGatewayError(err error) int {
	if strings.Contains(err.Error(), "未配置") || strings.Contains(err.Error(), "已禁用") {
		return http.StatusNotFound
	}
	if strings.Contains(err.Error(), "缺少") || strings.Contains(err.Error(), "数量") {
		return http.StatusBadRequest
	}
	return http.StatusBadGateway
}

func decodeJSON(writer http.ResponseWriter, request *http.Request, target interface{}) error {
	decoder := json.NewDecoder(http.MaxBytesReader(writer, request.Body, 4<<20))
	if err := decoder.Decode(target); err != nil {
		return fmt.Errorf("JSON 请求格式错误: %w", err)
	}
	return nil
}

func writeJSON(writer http.ResponseWriter, status int, value interface{}) {
	writer.Header().Set("Content-Type", "application/json; charset=utf-8")
	writer.WriteHeader(status)
	_ = json.NewEncoder(writer).Encode(value)
}

func requestLogger(next http.Handler, logger *log.Logger) http.Handler {
	return http.HandlerFunc(func(writer http.ResponseWriter, request *http.Request) {
		started := time.Now()
		next.ServeHTTP(writer, request)
		logger.Printf("http method=%s path=%s duration=%s", request.Method, request.URL.Path, time.Since(started))
	})
}
