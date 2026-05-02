package services

import (
	"errors"
	"io"
	"net/http"
	"strings"
	"testing"
	"xdfc-server/models"

	"github.com/stretchr/testify/require"
)

type roundTripFunc func(*http.Request) (*http.Response, error)

func (f roundTripFunc) RoundTrip(req *http.Request) (*http.Response, error) {
	return f(req)
}

func TestVerifyLogisticsProviderUsesTrustedTargetInsteadOfStoredEndpoint(t *testing.T) {
	previousFactory := logisticsProviderVerificationHTTPClientFactory
	defer func() {
		logisticsProviderVerificationHTTPClientFactory = previousFactory
	}()

	var requestedURL string
	var requestCount int
	logisticsProviderVerificationHTTPClientFactory = func() *http.Client {
		return &http.Client{
			Transport: roundTripFunc(func(req *http.Request) (*http.Response, error) {
				requestCount++
				requestedURL = req.URL.String()
				return &http.Response{
					StatusCode: http.StatusOK,
					Body:       io.NopCloser(strings.NewReader("ok")),
					Header:     make(http.Header),
				}, nil
			}),
		}
	}

	result := VerifyLogisticsProvider(models.LogisticsAPIProvider{
		Name:      "顺丰速运",
		Code:      "SF",
		Status:    "Enabled",
		Endpoint:  "http://127.0.0.1:5432/internal-only",
		AppKey:    "sf-key",
		AppSecret: "sf-secret",
	})

	resolution := ResolveTrustedLogisticsProviderTarget("SF", LogisticsProviderTargetPurposeVerify)
	require.Equal(t, 1, requestCount)
	require.Equal(t, resolution.TargetURL, requestedURL)
	require.Equal(t, "reachable", result.Status)
	require.Equal(t, "trusted verification endpoint reachable", result.Message)
	require.Contains(t, result.Action, "系统内置顺丰网关")
}

func TestVerifyLogisticsProviderReturnsManualReviewWithoutOutboundRequestForUnsupportedProvider(t *testing.T) {
	previousFactory := logisticsProviderVerificationHTTPClientFactory
	defer func() {
		logisticsProviderVerificationHTTPClientFactory = previousFactory
	}()

	requestCount := 0
	logisticsProviderVerificationHTTPClientFactory = func() *http.Client {
		return &http.Client{
			Transport: roundTripFunc(func(req *http.Request) (*http.Response, error) {
				requestCount++
				return nil, errors.New("unexpected outbound request")
			}),
		}
	}

	result := VerifyLogisticsProvider(models.LogisticsAPIProvider{
		Name:         "自定义物流",
		Code:         "CUSTOM",
		Status:       "Enabled",
		Endpoint:     "http://169.254.169.254/latest/meta-data/",
		Capabilities: models.StringList{"tracking"},
		AppKey:       "custom-key",
		AppSecret:    "custom-secret",
	})

	require.Equal(t, 0, requestCount)
	require.Equal(t, "manual_review", result.Status)
	require.Equal(t, "automatic verification is not available for this provider", result.Message)
	require.Contains(t, result.Action, "人工联调")
}

func TestVerifyLogisticsProviderReturnsManualReviewFor17TrackWithoutOutboundRequest(t *testing.T) {
	previousFactory := logisticsProviderVerificationHTTPClientFactory
	defer func() {
		logisticsProviderVerificationHTTPClientFactory = previousFactory
	}()

	requestCount := 0
	logisticsProviderVerificationHTTPClientFactory = func() *http.Client {
		return &http.Client{
			Transport: roundTripFunc(func(req *http.Request) (*http.Response, error) {
				requestCount++
				return nil, errors.New("unexpected outbound request")
			}),
		}
	}

	result := VerifyLogisticsProvider(models.LogisticsAPIProvider{
		Name:      "17TRACK",
		Code:      "17TRACK",
		Status:    "Enabled",
		Endpoint:  "http://127.0.0.1:8080/ssrf",
		AppKey:    "track-key",
		AppSecret: "track-secret",
	})

	require.Equal(t, 0, requestCount)
	require.Equal(t, "manual_review", result.Status)
	require.Equal(t, "automatic verification is not available for this provider", result.Message)
	require.Contains(t, result.Action, "17TRACK")
}

func TestVerifyLogisticsProviderSanitizesTrustedTargetTransportErrors(t *testing.T) {
	previousFactory := logisticsProviderVerificationHTTPClientFactory
	defer func() {
		logisticsProviderVerificationHTTPClientFactory = previousFactory
	}()

	logisticsProviderVerificationHTTPClientFactory = func() *http.Client {
		return &http.Client{
			Transport: roundTripFunc(func(req *http.Request) (*http.Response, error) {
				return nil, errors.New("dial tcp 127.0.0.1:5432: connect: connection refused")
			}),
		}
	}

	result := VerifyLogisticsProvider(models.LogisticsAPIProvider{
		Name:      "京东物流",
		Code:      "JD",
		Status:    "Enabled",
		Endpoint:  "http://127.0.0.1:5432/internal-only",
		AppKey:    "jd-key",
		AppSecret: "jd-secret",
	})

	require.Equal(t, "error", result.Status)
	require.Equal(t, "trusted verification request failed", result.Message)
	require.NotContains(t, result.Message, "127.0.0.1")
	require.NotContains(t, result.Message, "connection refused")
}
