package gateway

import (
	"context"
	"encoding/json"
	"io"
	"log"
	"net/http"
	"net/http/httptest"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"xdfc-attendance-gateway/internal/config"
	"xdfc-attendance-gateway/internal/model"
)

func TestGatewayForwardsEventsAndStatusToERP(t *testing.T) {
	type requestRecord struct {
		Path  string
		Token string
		Body  map[string]interface{}
	}
	records := make(chan requestRecord, 2)
	erpServer := httptest.NewServer(http.HandlerFunc(func(writer http.ResponseWriter, request *http.Request) {
		var body map[string]interface{}
		if err := json.NewDecoder(request.Body).Decode(&body); err != nil {
			t.Errorf("decode ERP request: %v", err)
		}
		records <- requestRecord{
			Path:  request.URL.Path,
			Token: request.Header.Get("X-Attendance-Ingress-Token"),
			Body:  body,
		}
		writer.WriteHeader(http.StatusOK)
	}))
	defer erpServer.Close()

	cfg := testConfig(t, erpServer.URL)
	service, err := New(cfg, log.Default())
	if err != nil {
		t.Fatalf("create gateway: %v", err)
	}

	eventTime := time.Date(2026, time.August, 13, 8, 30, 0, 0, time.FixedZone("CST", 8*60*60))
	if err := service.HandleEvents(context.Background(), model.EventBatch{
		DeviceCode: "att_hik_01",
		Events: []model.Event{{
			DeviceEmployeeKey: "1001",
			OccurredAt:        eventTime,
			Direction:         "in",
		}},
	}); err != nil {
		t.Fatalf("forward event: %v", err)
	}
	if err := service.HandleStatus(context.Background(), model.StatusReport{
		DeviceCode: "ATT-HIK-01",
		Status:     "heartbeat",
	}); err != nil {
		t.Fatalf("forward status: %v", err)
	}

	for index := 0; index < 2; index++ {
		select {
		case record := <-records:
			if record.Token != "erp-ingress-token-with-enough-length" {
				t.Fatalf("unexpected ERP ingress token: %s", record.Token)
			}
			if record.Path != "/api/v1/attendance-events/ingest" &&
				record.Path != "/api/v1/attendance-events/device-status" {
				t.Fatalf("unexpected ERP path: %s", record.Path)
			}
		case <-time.After(time.Second):
			t.Fatal("timed out waiting for ERP request")
		}
	}
}

func TestGatewayQueuesEventsWhenERPIsUnavailable(t *testing.T) {
	cfg := testConfig(t, "http://127.0.0.1:1")
	service, err := New(cfg, log.Default())
	if err != nil {
		t.Fatalf("create gateway: %v", err)
	}

	err = service.HandleEvents(context.Background(), model.EventBatch{
		DeviceCode: "ATT-HIK-01",
		Events: []model.Event{{
			DeviceEmployeeKey: "1001",
			OccurredAt:        time.Now().UTC(),
		}},
	})
	if err != nil {
		t.Fatalf("queue event: %v", err)
	}
	count, err := service.queue.Count()
	if err != nil {
		t.Fatalf("count queue: %v", err)
	}
	if count != 1 {
		t.Fatalf("expected one queued event, got %d", count)
	}
}

func TestGatewayRejectsBridgeWithWrongToken(t *testing.T) {
	cfg := testConfig(t, "http://127.0.0.1:1")
	service, err := New(cfg, log.Default())
	if err != nil {
		t.Fatalf("create gateway: %v", err)
	}
	server := httptest.NewServer(service.routes())
	defer server.Close()

	request, err := http.NewRequest(http.MethodGet, server.URL+"/v1/bridge/devices", nil)
	if err != nil {
		t.Fatalf("create request: %v", err)
	}
	request.Header.Set(bridgeTokenHeader, "wrong-token")
	response, err := http.DefaultClient.Do(request)
	if err != nil {
		t.Fatalf("call bridge endpoint: %v", err)
	}
	defer response.Body.Close()
	if response.StatusCode != http.StatusUnauthorized {
		t.Fatalf("expected 401, got %d", response.StatusCode)
	}
}

func TestGatewayBridgeDevicesDoesNotExposeISUPKey(t *testing.T) {
	cfg := testConfig(t, "http://127.0.0.1:1")
	service, err := New(cfg, log.Default())
	if err != nil {
		t.Fatalf("create gateway: %v", err)
	}
	server := httptest.NewServer(service.routes())
	defer server.Close()

	request, err := http.NewRequest(http.MethodGet, server.URL+"/v1/bridge/devices", nil)
	if err != nil {
		t.Fatalf("create request: %v", err)
	}
	request.Header.Set(bridgeTokenHeader, cfg.BridgeToken)
	response, err := http.DefaultClient.Do(request)
	if err != nil {
		t.Fatalf("call bridge endpoint: %v", err)
	}
	defer response.Body.Close()
	if response.StatusCode != http.StatusOK {
		t.Fatalf("expected 200, got %d", response.StatusCode)
	}

	body, err := io.ReadAll(response.Body)
	if err != nil {
		t.Fatalf("read bridge response: %v", err)
	}
	if strings.Contains(string(body), "isupKey") ||
		strings.Contains(string(body), "isup-key") {
		t.Fatalf("bridge device response leaked an ISUP credential: %s", body)
	}
}

func testConfig(t *testing.T, erpBaseURL string) config.Config {
	t.Helper()
	root := t.TempDir()
	return config.Config{
		ListenAddr:          "127.0.0.1:0",
		ERPBaseURL:          erpBaseURL,
		BridgeToken:         "bridge-token-with-enough-length",
		QueueDir:            filepath.Join(root, "queue"),
		DeadLetterDir:       filepath.Join(root, "dead-letter"),
		MaxQueueItems:       100,
		RetryIntervalSecond: 1,
		MaxRetryAttempts:    3,
		Devices: []config.DeviceConfig{{
			DeviceCode:      "ATT-HIK-01",
			RegistrationID:  "ATT-HIK-01",
			ISUPKey:         "isup-key",
			ERPIngressToken: "erp-ingress-token-with-enough-length",
			Enabled:         true,
		}},
	}
}
