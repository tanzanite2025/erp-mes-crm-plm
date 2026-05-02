package services

import (
	"fmt"
	"io"
	"net/http"
	"strings"
	"testing"
	"xdfc-server/db"
	"xdfc-server/models"

	"github.com/glebarez/sqlite"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
)

func setupLogisticsTrackingQueryServiceTestDB(t *testing.T) *gorm.DB {
	t.Helper()

	testDB, err := gorm.Open(sqlite.Open(fmt.Sprintf("file:%s?mode=memory&cache=shared", t.Name())), &gorm.Config{})
	require.NoError(t, err)
	require.NoError(t, testDB.AutoMigrate(&models.LogisticsAPIProvider{}, &models.DeliveryOrder{}, &models.DeliveryTrackingDetail{}))
	return testDB
}

func TestRefreshDeliveryTrackingUsesTrusted17TrackGatewayAndPersistsResults(t *testing.T) {
	originalDB := db.DB
	testDB := setupLogisticsTrackingQueryServiceTestDB(t)
	db.DB = testDB
	t.Cleanup(func() {
		db.DB = originalDB
		sqlDB, err := testDB.DB()
		if err == nil {
			_ = sqlDB.Close()
		}
	})

	provider := models.LogisticsAPIProvider{
		Name:       "17TRACK",
		Code:       "17TRACK",
		Status:     "Enabled",
		AppKey:     "access-key-17track",
		QuotaUsed:  2,
		QuotaTotal: 100,
		Capabilities: models.StringList{
			"tracking",
		},
	}
	require.NoError(t, db.DB.Create(&provider).Error)

	order := models.DeliveryOrder{
		BizOrderNo:  "SO-17TRACK-001",
		BizType:     "Sales",
		CarrierCode: "17TRACK",
		CarrierName: "17TRACK",
		TrackingNo:  "RR123456789CN",
		Status:      deliveryOrderStatusPending,
		Version:     1,
	}
	require.NoError(t, db.DB.Create(&order).Error)

	previousFactory := logisticsTrackingHTTPClientFactory
	defer func() {
		logisticsTrackingHTTPClientFactory = previousFactory
	}()

	requestIndex := 0
	var requestedURLs []string
	var requestTokens []string
	var requestBodies []string
	logisticsTrackingHTTPClientFactory = func() *http.Client {
		return &http.Client{
			Transport: roundTripFunc(func(req *http.Request) (*http.Response, error) {
				requestIndex++
				requestedURLs = append(requestedURLs, req.URL.String())
				requestTokens = append(requestTokens, req.Header.Get("17token"))
				bodyBytes, err := io.ReadAll(req.Body)
				require.NoError(t, err)
				requestBodies = append(requestBodies, string(bodyBytes))

				switch requestIndex {
				case 1:
					return &http.Response{
						StatusCode: http.StatusOK,
						Header:     make(http.Header),
						Body:       io.NopCloser(strings.NewReader(`{"code":0,"data":{"accepted":[{"origin":1,"number":"RR123456789CN","carrier":3011}],"rejected":[]}}`)),
					}, nil
				case 2:
					return &http.Response{
						StatusCode: http.StatusOK,
						Header:     make(http.Header),
						Body:       io.NopCloser(strings.NewReader(`{"code":0,"data":{"accepted":[{"number":"RR123456789CN","track":{"e":40,"z0":{"a":"2026-05-03 09:30","c":"上海","d":"","z":"已签收"},"z1":[{"a":"2026-05-03 08:00","c":"上海转运中心","d":"","z":"包裹已揽收"}],"z2":[],"z9":[]}}],"rejected":[]}}`)),
					}, nil
				default:
					return nil, fmt.Errorf("unexpected outbound request %d", requestIndex)
				}
			}),
		}
	}

	result, err := RefreshDeliveryTracking("RR123456789CN")
	require.NoError(t, err)
	require.Equal(t, "refreshed", result.Status)
	require.Equal(t, "trusted tracking query completed", result.Message)
	require.Equal(t, 2, result.InsertedTraces)
	require.Equal(t, "17TRACK", result.ProviderCode)

	require.Equal(t, []string{
		"https://api.17track.net/track/v1/register",
		"https://api.17track.net/track/v1/gettrackinfo",
	}, requestedURLs)
	require.Equal(t, []string{"access-key-17track", "access-key-17track"}, requestTokens)
	require.Contains(t, requestBodies[0], `"number":"RR123456789CN"`)
	require.Contains(t, requestBodies[0], `"auto_detection":true`)
	require.Contains(t, requestBodies[1], `"carrier":3011`)

	var persistedOrder models.DeliveryOrder
	require.NoError(t, db.DB.First(&persistedOrder, order.ID).Error)
	require.Equal(t, deliveryOrderStatusSigned, persistedOrder.Status)
	require.Equal(t, "已签收", persistedOrder.LastEvent)
	require.Equal(t, "上海", persistedOrder.LastLocation)
	require.NotNil(t, persistedOrder.LastPushAt)
	require.NotNil(t, persistedOrder.SignedAt)

	var details []models.DeliveryTrackingDetail
	require.NoError(t, db.DB.Where("delivery_order_id = ?", order.ID).Order("time asc").Find(&details).Error)
	require.Len(t, details, 2)
	require.Equal(t, "包裹已揽收", details[0].Context)
	require.Equal(t, "已签收", details[1].Context)

	var refreshedProvider models.LogisticsAPIProvider
	require.NoError(t, db.DB.First(&refreshedProvider, provider.ID).Error)
	require.Equal(t, 3, refreshedProvider.QuotaUsed)
}

func TestRefreshDeliveryTrackingFailsClosedForUnsupportedProviderWithoutOutboundRequest(t *testing.T) {
	originalDB := db.DB
	testDB := setupLogisticsTrackingQueryServiceTestDB(t)
	db.DB = testDB
	t.Cleanup(func() {
		db.DB = originalDB
		sqlDB, err := testDB.DB()
		if err == nil {
			_ = sqlDB.Close()
		}
	})

	provider := models.LogisticsAPIProvider{
		Name:   "顺丰速运",
		Code:   "SF",
		Status: "Enabled",
		AppKey: "sf-key",
		Capabilities: models.StringList{
			"tracking",
		},
	}
	require.NoError(t, db.DB.Create(&provider).Error)
	require.NoError(t, db.DB.Create(&models.DeliveryOrder{
		BizOrderNo:  "SO-SF-001",
		BizType:     "Sales",
		CarrierCode: "SF",
		CarrierName: "顺丰速运",
		TrackingNo:  "SF1234567890123",
		Status:      deliveryOrderStatusPending,
		Version:     1,
	}).Error)

	previousFactory := logisticsTrackingHTTPClientFactory
	defer func() {
		logisticsTrackingHTTPClientFactory = previousFactory
	}()
	requestCount := 0
	logisticsTrackingHTTPClientFactory = func() *http.Client {
		return &http.Client{
			Transport: roundTripFunc(func(req *http.Request) (*http.Response, error) {
				requestCount++
				return nil, fmt.Errorf("unexpected outbound request")
			}),
		}
	}

	result, err := RefreshDeliveryTracking("SF1234567890123")
	require.NoError(t, err)
	require.Equal(t, 0, requestCount)
	require.Equal(t, "manual_review", result.Status)
	require.Equal(t, "real-time tracking adapter is not available for this provider yet", result.Message)
}
