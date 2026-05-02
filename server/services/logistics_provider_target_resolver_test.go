package services

import (
	"net/http"
	"testing"
	"xdfc-server/models"

	"github.com/stretchr/testify/require"
)

func TestResolveTrustedLogisticsProviderTargetReturnsVerifyTargetForSupportedProvider(t *testing.T) {
	resolution := ResolveTrustedLogisticsProviderTarget("SF", LogisticsProviderTargetPurposeVerify)

	require.True(t, resolution.Supported)
	require.False(t, resolution.ManualReview)
	require.Equal(t, "https://bspgw.sf-express.com/std/service", resolution.TargetURL)
	require.Equal(t, "trusted target resolved", resolution.SummaryMessage)
}

func TestResolveTrustedLogisticsProviderTargetReturnsTrackingTargetForSupportedProvider(t *testing.T) {
	resolution := ResolveTrustedLogisticsProviderTarget("JD", LogisticsProviderTargetPurposeTracking)

	require.True(t, resolution.Supported)
	require.False(t, resolution.ManualReview)
	require.Equal(t, "https://api.jd.com/routerjson", resolution.TargetURL)
}

func TestResolveTrustedLogisticsProviderTargetReturnsOrderCreateTargetForSupportedProvider(t *testing.T) {
	resolution := ResolveTrustedLogisticsProviderTarget("SF", LogisticsProviderTargetPurposeOrderCreate)

	require.True(t, resolution.Supported)
	require.False(t, resolution.ManualReview)
	require.Equal(t, "https://bspgw.sf-express.com/std/service", resolution.TargetURL)
}

func TestResolveTrustedLogisticsProviderTargetReturnsLabelTargetForSupportedProvider(t *testing.T) {
	resolution := ResolveTrustedLogisticsProviderTarget("ZTO", LogisticsProviderTargetPurposeLabel)

	require.True(t, resolution.Supported)
	require.False(t, resolution.ManualReview)
	require.Equal(t, "https://japi.zto.com", resolution.TargetURL)
}

func TestResolveTrustedLogisticsProviderTargetFailsClosedForUnsupportedProviderPurpose(t *testing.T) {
	resolution := ResolveTrustedLogisticsProviderTarget("ZTO", LogisticsProviderTargetPurposeOrderCreate)

	require.False(t, resolution.Supported)
	require.True(t, resolution.ManualReview)
	require.Equal(t, "", resolution.TargetURL)
	require.Contains(t, resolution.SummaryMessage, "not available")
}

func TestResolveTrustedLogisticsProviderTargetReturnsManualReviewForUnsupportedProvider(t *testing.T) {
	resolution := ResolveTrustedLogisticsProviderTarget("CUSTOM", LogisticsProviderTargetPurposeTracking)

	require.False(t, resolution.Supported)
	require.True(t, resolution.ManualReview)
	require.Equal(t, "", resolution.TargetURL)
	require.Contains(t, resolution.ActionMessage, "人工联调")
}

func TestBuildTrustedLogisticsProviderRequestBuildsResolvedRequest(t *testing.T) {
	plan, err := BuildTrustedLogisticsProviderRequest(models.LogisticsAPIProvider{Code: "JD"}, LogisticsProviderTargetPurposeOrderCreate, http.MethodPost, nil)

	require.NoError(t, err)
	require.Equal(t, http.MethodPost, plan.Method)
	require.NotNil(t, plan.Request)
	require.Equal(t, "https://api.jd.com/routerjson", plan.Request.URL.String())
	require.Equal(t, "XDFC-Logistics-Gateway/1.0", plan.Request.Header.Get("User-Agent"))
	require.True(t, plan.Resolution.Supported)
}

func TestBuildTrustedLogisticsProviderRequestFailsClosedForUnsupportedPurpose(t *testing.T) {
	plan, err := BuildTrustedLogisticsProviderRequest(models.LogisticsAPIProvider{Code: "CUSTOM"}, LogisticsProviderTargetPurposeLabel, http.MethodPost, nil)

	require.Error(t, err)
	require.Nil(t, plan.Request)
	require.False(t, plan.Resolution.Supported)
	require.True(t, plan.Resolution.ManualReview)
}
