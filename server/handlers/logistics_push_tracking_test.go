package handlers

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"
	"xdfc-server/db"
	"xdfc-server/models"
	"xdfc-server/services"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/require"
)

func setupLogisticsTrackingHandlerTestDB(t *testing.T) {
	t.Helper()
	gin.SetMode(gin.TestMode)
	setupHandlerSQLiteTestDB(t, &models.LogisticsAPIProvider{}, &models.DeliveryOrder{}, &models.DeliveryTrackingDetail{})
}

func TestGetDeliveryTrackingHandlerRefreshesWhenRequested(t *testing.T) {
	setupLogisticsTrackingHandlerTestDB(t)

	provider := models.LogisticsAPIProvider{
		Name:   "17TRACK",
		Code:   "17TRACK",
		Status: "Enabled",
		AppKey: "access-key-17track",
	}
	require.NoError(t, db.DB.Create(&provider).Error)

	order := models.DeliveryOrder{
		BizOrderNo:  "SO-17TRACK-002",
		BizType:     "Sales",
		CarrierCode: "17TRACK",
		CarrierName: "17TRACK",
		TrackingNo:  "RR123456789CN",
		Status:      DOStatusPending,
		Version:     1,
	}
	require.NoError(t, db.DB.Create(&order).Error)

	previousRefresh := refreshDeliveryTracking
	defer func() {
		refreshDeliveryTracking = previousRefresh
	}()

	called := 0
	refreshDeliveryTracking = func(trackingNo string) (services.LogisticsTrackingRefreshResult, error) {
		called++
		now := time.Now().UTC()
		require.Equal(t, "RR123456789CN", trackingNo)
		require.NoError(t, db.DB.Model(&models.DeliveryOrder{}).Where("id = ?", order.ID).Updates(map[string]any{
			"status":        DOStatusSigned,
			"last_push_at":  now,
			"last_event":    "已签收",
			"last_location": "上海",
			"signed_at":     now,
		}).Error)
		require.NoError(t, db.DB.Create(&models.DeliveryTrackingDetail{
			DeliveryOrderID: order.ID,
			Time:            now,
			Context:         "已签收",
			Location:        "上海",
			HashKey:         "hash-1",
		}).Error)
		return services.LogisticsTrackingRefreshResult{
			Status:         "refreshed",
			Message:        "trusted tracking query completed",
			Action:         "ok",
			ProviderCode:   "17TRACK",
			InsertedTraces: 1,
			CheckedAt:      now,
		}, nil
	}

	recorder := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(recorder)
	ctx.Params = []gin.Param{{Key: "trackingNo", Value: "RR123456789CN"}}
	ctx.Request = httptest.NewRequest(http.MethodGet, "/api/v1/logistics-push/tracking/RR123456789CN?refresh=1", nil)

	GetDeliveryTrackingHandler(ctx)
	require.Equal(t, http.StatusOK, recorder.Code, recorder.Body.String())
	require.Equal(t, 1, called)

	var payload struct {
		Order   models.DeliveryOrder                    `json:"order"`
		Traces  []models.DeliveryTrackingDetail         `json:"traces"`
		Refresh services.LogisticsTrackingRefreshResult `json:"refresh"`
	}
	require.NoError(t, json.Unmarshal(recorder.Body.Bytes(), &payload))
	require.Equal(t, DOStatusSigned, payload.Order.Status)
	require.Len(t, payload.Traces, 1)
	require.Equal(t, "已签收", payload.Traces[0].Context)
	require.Equal(t, "refreshed", payload.Refresh.Status)
	require.Equal(t, 1, payload.Refresh.InsertedTraces)
}

func TestGetDeliveryTrackingHandlerSkipsRefreshWithoutFlag(t *testing.T) {
	setupLogisticsTrackingHandlerTestDB(t)

	order := models.DeliveryOrder{
		BizOrderNo:  "SO-LOCAL-001",
		BizType:     "Sales",
		CarrierCode: "SF",
		CarrierName: "顺丰速运",
		TrackingNo:  "SF1234567890123",
		Status:      DOStatusPending,
		Version:     1,
	}
	require.NoError(t, db.DB.Create(&order).Error)

	previousRefresh := refreshDeliveryTracking
	defer func() {
		refreshDeliveryTracking = previousRefresh
	}()
	called := 0
	refreshDeliveryTracking = func(trackingNo string) (services.LogisticsTrackingRefreshResult, error) {
		called++
		return services.LogisticsTrackingRefreshResult{}, nil
	}

	recorder := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(recorder)
	ctx.Params = []gin.Param{{Key: "trackingNo", Value: "SF1234567890123"}}
	ctx.Request = httptest.NewRequest(http.MethodGet, "/api/v1/logistics-push/tracking/SF1234567890123", nil)

	GetDeliveryTrackingHandler(ctx)
	require.Equal(t, http.StatusOK, recorder.Code, recorder.Body.String())
	require.Equal(t, 0, called)
}
