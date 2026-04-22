package services

import (
	"fmt"
	"net/http"
	"net/url"
	"strings"
	"time"
	"xdfc-server/models"
)

type LogisticsProviderVerificationResult struct {
	Status    string
	Message   string
	Action    string
	CheckedAt time.Time
}

type logisticsProviderVerificationProfile struct {
	Name                   string
	RequiresEndpoint       bool
	RequiresCredentials    bool
	ReachableAction        string
	MissingCredentialsHint string
	MissingEndpointHint    string
}

func getLogisticsProviderVerificationProfile(provider models.LogisticsAPIProvider) logisticsProviderVerificationProfile {
	code := strings.ToUpper(strings.TrimSpace(provider.Code))

	switch code {
	case "SF":
		return logisticsProviderVerificationProfile{
			Name:                   "顺丰速运",
			RequiresEndpoint:       true,
			RequiresCredentials:    true,
			ReachableAction:        "请继续用顺丰测试单执行真实鉴权/下单联调，当前结果只代表网关已可达。",
			MissingCredentialsHint: "请补齐顺丰 AppKey / AppSecret 后再测试。",
			MissingEndpointHint:    "请确认顺丰生产网关地址是否已填写。",
		}
	case "JD":
		return logisticsProviderVerificationProfile{
			Name:                   "京东物流",
			RequiresEndpoint:       true,
			RequiresCredentials:    true,
			ReachableAction:        "请继续用京东物流测试单执行真实业务鉴权，当前结果只代表网关已可达。",
			MissingCredentialsHint: "请补齐京东物流 AppKey / AppSecret 后再测试。",
			MissingEndpointHint:    "请确认京东物流生产网关地址是否已填写。",
		}
	case "17TRACK":
		return logisticsProviderVerificationProfile{
			Name:                   "17TRACK",
			RequiresEndpoint:       true,
			RequiresCredentials:    true,
			ReachableAction:        "请继续在 17TRACK 控制台使用实际 token 与示例请求联调，当前只完成网络探测。",
			MissingCredentialsHint: "请补齐 17TRACK 的 API Token/Secret 后再测试。",
			MissingEndpointHint:    "请先从 17TRACK 控制台复制实际 API endpoint。",
		}
	default:
		requiresCredentials := len(provider.Capabilities) > 0
		return logisticsProviderVerificationProfile{
			Name:                   code,
			RequiresEndpoint:       true,
			RequiresCredentials:    requiresCredentials,
			ReachableAction:        "当前仅完成网络探测；如需确认业务可用，请继续执行真实平台鉴权或沙箱请求。",
			MissingCredentialsHint: "请补齐接口凭证后再测试。",
			MissingEndpointHint:    "请补齐 endpoint 后再测试。",
		}
	}
}

func VerifyLogisticsProvider(provider models.LogisticsAPIProvider) LogisticsProviderVerificationResult {
	checkedAt := time.Now()
	profile := getLogisticsProviderVerificationProfile(provider)

	if strings.TrimSpace(provider.Status) == "Disabled" {
		return LogisticsProviderVerificationResult{
			Status:    "disabled",
			Message:   "provider is disabled",
			Action:    "如需重新测试，请先在平台页启用该物流服务商。",
			CheckedAt: checkedAt,
		}
	}

	if strings.TrimSpace(provider.Name) == "" || strings.TrimSpace(provider.Code) == "" {
		return LogisticsProviderVerificationResult{
			Status:    "invalid_config",
			Message:   "provider name/code is required",
			Action:    "请先补齐厂商名称和唯一编码。",
			CheckedAt: checkedAt,
		}
	}

	if profile.RequiresEndpoint && strings.TrimSpace(provider.Endpoint) == "" {
		return LogisticsProviderVerificationResult{
			Status:    "invalid_config",
			Message:   "endpoint is required",
			Action:    profile.MissingEndpointHint,
			CheckedAt: checkedAt,
		}
	}

	if profile.RequiresCredentials && (strings.TrimSpace(provider.AppKey) == "" || strings.TrimSpace(provider.AppSecret) == "") {
		return LogisticsProviderVerificationResult{
			Status:    "invalid_config",
			Message:   "credentials are incomplete",
			Action:    profile.MissingCredentialsHint,
			CheckedAt: checkedAt,
		}
	}

	parsedURL, err := url.ParseRequestURI(strings.TrimSpace(provider.Endpoint))
	if err != nil || parsedURL.Scheme == "" || parsedURL.Host == "" {
		return LogisticsProviderVerificationResult{
			Status:    "invalid_config",
			Message:   "endpoint is not a valid URL",
			Action:    "请确认 endpoint 是否为完整的 http/https 地址。",
			CheckedAt: checkedAt,
		}
	}

	client := &http.Client{Timeout: 5 * time.Second}
	req, err := http.NewRequest(http.MethodGet, parsedURL.String(), nil)
	if err != nil {
		return LogisticsProviderVerificationResult{
			Status:    "error",
			Message:   fmt.Sprintf("failed to build verification request: %v", err),
			Action:    "请检查 endpoint 格式与平台协议要求后重试。",
			CheckedAt: checkedAt,
		}
	}
	req.Header.Set("User-Agent", "XDFC-Logistics-Provider-Verify/1.0")

	resp, err := client.Do(req)
	if err != nil {
		return LogisticsProviderVerificationResult{
			Status:    "error",
			Message:   fmt.Sprintf("endpoint request failed: %v", err),
			Action:    "请检查网络连通性、DNS、防火墙或平台出口白名单。",
			CheckedAt: checkedAt,
		}
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 500 {
		return LogisticsProviderVerificationResult{
			Status:    "error",
			Message:   fmt.Sprintf("endpoint returned server error: HTTP %d", resp.StatusCode),
			Action:    "请稍后重试；若持续失败，请联系平台方确认网关状态。",
			CheckedAt: checkedAt,
		}
	}

	return LogisticsProviderVerificationResult{
		Status:    "reachable",
		Message:   fmt.Sprintf("endpoint reachable: HTTP %d", resp.StatusCode),
		Action:    profile.ReachableAction,
		CheckedAt: checkedAt,
	}
}
