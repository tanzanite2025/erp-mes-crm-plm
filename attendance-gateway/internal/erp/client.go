package erp

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"xdfc-attendance-gateway/internal/config"
	"xdfc-attendance-gateway/internal/model"
)

type Client struct {
	baseURL    string
	eventsPath string
	statusPath string
	httpClient *http.Client
}

func NewClient(cfg config.Config) *Client {
	return &Client{
		baseURL:    cfg.ERPBaseURL,
		eventsPath: cfg.ERPEventsPath,
		statusPath: cfg.ERPStatusPath,
		httpClient: &http.Client{
			Timeout: time.Duration(cfg.ERPTimeoutSeconds) * time.Second,
		},
	}
}

func (c *Client) SendEvents(ctx context.Context, device config.DeviceConfig, batch model.EventBatch) error {
	return c.post(ctx, c.eventsPath, device.ERPIngressToken, batch)
}

func (c *Client) SendStatus(ctx context.Context, device config.DeviceConfig, status model.StatusReport) error {
	return c.post(ctx, c.statusPath, device.ERPIngressToken, status)
}

func (c *Client) post(ctx context.Context, path, ingressToken string, payload interface{}) error {
	body, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("编码 ERP 请求失败: %w", err)
	}
	request, err := http.NewRequestWithContext(
		ctx,
		http.MethodPost,
		c.baseURL+path,
		bytes.NewReader(body),
	)
	if err != nil {
		return fmt.Errorf("创建 ERP 请求失败: %w", err)
	}
	request.Header.Set("Content-Type", "application/json")
	request.Header.Set("Accept", "application/json")
	request.Header.Set("X-Attendance-Ingress-Token", ingressToken)

	response, err := c.httpClient.Do(request)
	if err != nil {
		return fmt.Errorf("ERP 请求失败: %w", err)
	}
	defer response.Body.Close()
	if response.StatusCode < http.StatusOK || response.StatusCode >= http.StatusMultipleChoices {
		responseBody, _ := io.ReadAll(io.LimitReader(response.Body, 4096))
		return fmt.Errorf(
			"ERP 返回 HTTP %d: %s",
			response.StatusCode,
			strings.TrimSpace(string(responseBody)),
		)
	}
	return nil
}
