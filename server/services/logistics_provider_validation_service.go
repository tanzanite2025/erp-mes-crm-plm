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
	CheckedAt time.Time
}

func VerifyLogisticsProvider(provider models.LogisticsAPIProvider) LogisticsProviderVerificationResult {
	checkedAt := time.Now()

	if strings.TrimSpace(provider.Status) == "Disabled" {
		return LogisticsProviderVerificationResult{
			Status:    "disabled",
			Message:   "provider is disabled",
			CheckedAt: checkedAt,
		}
	}

	if strings.TrimSpace(provider.Name) == "" || strings.TrimSpace(provider.Code) == "" {
		return LogisticsProviderVerificationResult{
			Status:    "invalid_config",
			Message:   "provider name/code is required",
			CheckedAt: checkedAt,
		}
	}

	if strings.TrimSpace(provider.Endpoint) == "" {
		return LogisticsProviderVerificationResult{
			Status:    "invalid_config",
			Message:   "endpoint is required",
			CheckedAt: checkedAt,
		}
	}

	if strings.TrimSpace(provider.AppKey) == "" || strings.TrimSpace(provider.AppSecret) == "" {
		return LogisticsProviderVerificationResult{
			Status:    "invalid_config",
			Message:   "credentials are incomplete",
			CheckedAt: checkedAt,
		}
	}

	parsedURL, err := url.ParseRequestURI(strings.TrimSpace(provider.Endpoint))
	if err != nil || parsedURL.Scheme == "" || parsedURL.Host == "" {
		return LogisticsProviderVerificationResult{
			Status:    "invalid_config",
			Message:   "endpoint is not a valid URL",
			CheckedAt: checkedAt,
		}
	}

	client := &http.Client{Timeout: 5 * time.Second}
	req, err := http.NewRequest(http.MethodGet, parsedURL.String(), nil)
	if err != nil {
		return LogisticsProviderVerificationResult{
			Status:    "error",
			Message:   fmt.Sprintf("failed to build verification request: %v", err),
			CheckedAt: checkedAt,
		}
	}
	req.Header.Set("User-Agent", "XDFC-Logistics-Provider-Verify/1.0")

	resp, err := client.Do(req)
	if err != nil {
		return LogisticsProviderVerificationResult{
			Status:    "error",
			Message:   fmt.Sprintf("endpoint request failed: %v", err),
			CheckedAt: checkedAt,
		}
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 500 {
		return LogisticsProviderVerificationResult{
			Status:    "error",
			Message:   fmt.Sprintf("endpoint returned server error: HTTP %d", resp.StatusCode),
			CheckedAt: checkedAt,
		}
	}

	return LogisticsProviderVerificationResult{
		Status:    "healthy",
		Message:   fmt.Sprintf("endpoint reachable: HTTP %d", resp.StatusCode),
		CheckedAt: checkedAt,
	}
}
