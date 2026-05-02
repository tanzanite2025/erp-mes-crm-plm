package services

import (
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"xdfc-server/models"
)

type TrustedLogisticsProviderRequestPlan struct {
	ProviderCode string
	Purpose      LogisticsProviderTargetPurpose
	Method       string
	Request      *http.Request
	Resolution   LogisticsProviderTargetResolution
}

func BuildTrustedLogisticsProviderRequest(provider models.LogisticsAPIProvider, purpose LogisticsProviderTargetPurpose, method string, body io.Reader) (TrustedLogisticsProviderRequestPlan, error) {
	resolution := ResolveTrustedLogisticsProviderTarget(provider.Code, purpose)
	plan := TrustedLogisticsProviderRequestPlan{
		ProviderCode: strings.ToUpper(strings.TrimSpace(provider.Code)),
		Purpose:      purpose,
		Resolution:   resolution,
	}
	if !resolution.Supported || strings.TrimSpace(resolution.TargetURL) == "" {
		return plan, fmt.Errorf("trusted logistics target unavailable: %s", resolution.SummaryMessage)
	}

	normalizedMethod := strings.ToUpper(strings.TrimSpace(method))
	if normalizedMethod == "" {
		normalizedMethod = http.MethodGet
	}

	req, err := http.NewRequest(normalizedMethod, resolution.TargetURL, body)
	if err != nil {
		return plan, err
	}
	req.Header.Set("User-Agent", "XDFC-Logistics-Gateway/1.0")

	plan.Method = normalizedMethod
	plan.Request = req
	return plan, nil
}

func BuildTrustedLogisticsProviderRequestForPath(provider models.LogisticsAPIProvider, purpose LogisticsProviderTargetPurpose, method string, pathSuffix string, body io.Reader) (TrustedLogisticsProviderRequestPlan, error) {
	plan, err := BuildTrustedLogisticsProviderRequest(provider, purpose, method, body)
	if err != nil {
		return plan, err
	}

	normalizedPathSuffix := strings.TrimSpace(pathSuffix)
	if normalizedPathSuffix == "" {
		return plan, nil
	}

	resolvedURL, err := url.JoinPath(plan.Request.URL.String(), normalizedPathSuffix)
	if err != nil {
		return plan, err
	}

	requestURL, err := url.Parse(resolvedURL)
	if err != nil {
		return plan, err
	}

	plan.Request.URL = requestURL
	return plan, nil
}
