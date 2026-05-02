package services

import (
	"log"
	"net/http"
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
	RequiresCredentials    bool
	ReachableAction        string
	MissingCredentialsHint string
	ManualReviewAction     string
}

var logisticsProviderVerificationHTTPClientFactory = func() *http.Client {
	return &http.Client{
		Timeout: 5 * time.Second,
		CheckRedirect: func(req *http.Request, via []*http.Request) error {
			return http.ErrUseLastResponse
		},
	}
}

func getLogisticsProviderVerificationProfile(provider models.LogisticsAPIProvider) logisticsProviderVerificationProfile {
	code := strings.ToUpper(strings.TrimSpace(provider.Code))

	switch code {
	case "SF":
		return logisticsProviderVerificationProfile{
			Name:                   "顺丰速运",
			RequiresCredentials:    true,
			ReachableAction:        "请继续用顺丰测试单执行真实鉴权/下单联调，当前结果只代表系统内置顺丰网关已可达。",
			MissingCredentialsHint: "请补齐顺丰 AppKey / AppSecret 后再测试。",
			ManualReviewAction:     "当前顺丰平台未启用自动验证，请联系平台管理员完成人工联调。",
		}
	case "JD":
		return logisticsProviderVerificationProfile{
			Name:                   "京东物流",
			RequiresCredentials:    true,
			ReachableAction:        "请继续用京东物流测试单执行真实业务鉴权，当前结果只代表系统内置京东网关已可达。",
			MissingCredentialsHint: "请补齐京东物流 AppKey / AppSecret 后再测试。",
			ManualReviewAction:     "当前京东物流平台未启用自动验证，请联系平台管理员完成人工联调。",
		}
	case "17TRACK":
		return logisticsProviderVerificationProfile{
			Name:                   "17TRACK",
			RequiresCredentials:    true,
			ReachableAction:        "请继续在 17TRACK 控制台使用实际 token 与示例请求联调。",
			MissingCredentialsHint: "请补齐 17TRACK 的 API Token/Secret 后再测试。",
			ManualReviewAction:     "17TRACK 当前未启用系统内置自动验证，请改用控制台样例或人工联调确认配置。",
		}
	default:
		requiresCredentials := len(provider.Capabilities) > 0
		return logisticsProviderVerificationProfile{
			Name:                   code,
			RequiresCredentials:    requiresCredentials,
			ReachableAction:        "当前仅确认系统内置可信网关可达；如需确认业务可用，请继续执行真实平台鉴权或沙箱请求。",
			MissingCredentialsHint: "请补齐接口凭证后再测试。",
			ManualReviewAction:     "当前厂商未启用系统内置自动验证，请改用人工联调或选择受支持模板。",
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

	if profile.RequiresCredentials && (strings.TrimSpace(provider.AppKey) == "" || strings.TrimSpace(provider.AppSecret) == "") {
		return LogisticsProviderVerificationResult{
			Status:    "invalid_config",
			Message:   "credentials are incomplete",
			Action:    profile.MissingCredentialsHint,
			CheckedAt: checkedAt,
		}
	}

	resolution := ResolveTrustedLogisticsProviderTarget(provider.Code, LogisticsProviderTargetPurposeVerify)
	trustedVerificationURL := strings.TrimSpace(resolution.TargetURL)
	if !resolution.Supported || trustedVerificationURL == "" {
		return LogisticsProviderVerificationResult{
			Status:    "manual_review",
			Message:   "automatic verification is not available for this provider",
			Action:    profile.ManualReviewAction,
			CheckedAt: checkedAt,
		}
	}

	client := logisticsProviderVerificationHTTPClientFactory()
	requestPlan, err := BuildTrustedLogisticsProviderRequest(provider, LogisticsProviderTargetPurposeVerify, http.MethodGet, nil)
	if err != nil {
		return LogisticsProviderVerificationResult{
			Status:    "error",
			Message:   "failed to build trusted verification request",
			Action:    "请联系系统管理员检查内置物流网关配置。",
			CheckedAt: checkedAt,
		}
	}
	req := requestPlan.Request
	req.Header.Set("User-Agent", "XDFC-Logistics-Provider-Verify/1.0")

	resp, err := client.Do(req)
	if err != nil {
		log.Printf("[LOGISTICS-VERIFY][WARN] Trusted verification request failed for provider=%s code=%s target=%s err=%v", strings.TrimSpace(provider.Name), strings.TrimSpace(provider.Code), trustedVerificationURL, err)
		return LogisticsProviderVerificationResult{
			Status:    "error",
			Message:   "trusted verification request failed",
			Action:    "请稍后重试；若持续失败，请联系平台方确认系统内置网关状态。",
			CheckedAt: checkedAt,
		}
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 500 {
		return LogisticsProviderVerificationResult{
			Status:    "error",
			Message:   "trusted verification endpoint unavailable",
			Action:    "请稍后重试；若持续失败，请联系平台方确认系统内置网关状态。",
			CheckedAt: checkedAt,
		}
	}

	return LogisticsProviderVerificationResult{
		Status:    "reachable",
		Message:   "trusted verification endpoint reachable",
		Action:    profile.ReachableAction,
		CheckedAt: checkedAt,
	}
}
