package handlers

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"xdfc-server/authz"
	"xdfc-server/models"
	"xdfc-server/services"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/require"
)

func TestDeliveryTrackingCallbackPostgresRejectsInvalidFactsAndReportsPersistenceFailure(t *testing.T) {
	database := createIsolatedQualityStandardPatchPostgresDatabase(t)
	require.NoError(t, database.AutoMigrate(&models.DeliveryOrder{}, &models.DeliveryTrackingDetail{}, &models.LogisticsAPIProvider{}))
	provider := models.LogisticsAPIProvider{Code: "TEST", Name: "Isolated callback carrier", AppSecret: "test-only-secret", Status: "Enabled"}
	require.NoError(t, database.Create(&provider).Error)
	order := models.DeliveryOrder{TrackingNo: "isolated-callback", CarrierCode: provider.Code, BizType: "Sales", Status: "Pending", Version: 1}
	require.NoError(t, database.Create(&order).Error)
	router := gin.New()
	router.POST("/callback", HandlePushCallbackHandler)
	request := func(payload webhookPayload, validSignature bool) *httptest.ResponseRecorder {
		body, err := json.Marshal(payload)
		require.NoError(t, err)
		req := httptest.NewRequest(http.MethodPost, "/callback", bytes.NewReader(body))
		req.Header.Set("Content-Type", "application/json")
		if validSignature {
			req.Header.Set("X-XDFC-Logistics-Signature", hmacSHA256Hex(provider.AppSecret, body))
		}
		response := httptest.NewRecorder()
		router.ServeHTTP(response, req)
		return response
	}
	payload := webhookPayload{TrackingNo: order.TrackingNo, CarrierCode: provider.Code, Status: "Signed", Traces: []traceItem{{Time: "2026-10-20T10:00:00+08:00", Context: "已签收"}}}
	require.Equal(t, http.StatusUnauthorized, request(payload, false).Code)
	payload.Status = "unrecognized"
	require.Equal(t, http.StatusBadRequest, request(payload, true).Code)
	payload.Status = "Signed"
	payload.Traces[0].Time = "invalid-time"
	require.Equal(t, http.StatusBadRequest, request(payload, true).Code)
	payload.Traces = nil
	require.Equal(t, http.StatusBadRequest, request(payload, true).Code)
	payload.Traces = []traceItem{{Time: "2026-10-20T10:00:00+08:00", Context: "已签收"}}
	payload.TrackingNo = "unknown-order"
	require.Equal(t, http.StatusNotFound, request(payload, true).Code)
	payload.TrackingNo = order.TrackingNo
	require.NoError(t, database.Exec(`CREATE FUNCTION reject_callback_projection() RETURNS trigger AS $$ BEGIN RAISE EXCEPTION 'forced callback failure'; END; $$ LANGUAGE plpgsql`).Error)
	require.NoError(t, database.Exec(`CREATE TRIGGER reject_callback_projection BEFORE UPDATE ON delivery_orders FOR EACH ROW EXECUTE FUNCTION reject_callback_projection()`).Error)
	response := request(payload, true)
	require.Equal(t, http.StatusInternalServerError, response.Code, response.Body.String())
	var count int64
	require.NoError(t, database.Model(&models.DeliveryTrackingDetail{}).Count(&count).Error)
	require.Zero(t, count)
	require.NoError(t, database.Exec(`DROP TRIGGER reject_callback_projection ON delivery_orders`).Error)
	response = request(payload, true)
	require.Equal(t, http.StatusOK, response.Code, response.Body.String())
	require.Contains(t, response.Body.String(), `"insertedTraces":1`)
	response = request(payload, true)
	require.Equal(t, http.StatusOK, response.Code, response.Body.String())
	require.Contains(t, response.Body.String(), `"insertedTraces":0`)
	require.NoError(t, database.First(&order, order.ID).Error)
	require.Equal(t, "Signed", order.Status)
	require.Equal(t, 2, order.Version)
	expectedTime, valid := services.ParseDeliveryTrackingEventTime("2026-10-20T10:00:00+08:00")
	require.True(t, valid)
	require.True(t, order.SignedAt.Equal(expectedTime))
}

func TestDeliveryTrackingPostgresListAndDetailEnforceTheSameStoredBusinessPermissions(t *testing.T) {
	database := createIsolatedQualityStandardPatchPostgresDatabase(t)
	require.NoError(t, database.AutoMigrate(&models.DeliveryOrder{}, &models.DeliveryTrackingDetail{}))
	for _, businessType := range []string{"Sales", "Purchase", "Other"} {
		require.NoError(t, database.Create(&models.DeliveryOrder{TrackingNo: "isolated-" + businessType, CarrierCode: "TEST", BizType: businessType}).Error)
	}
	permissions := []string{authz.MenuTrading}
	router := gin.New()
	router.Use(func(c *gin.Context) { c.Set("permissions", permissions); c.Next() })
	router.GET("/orders", GetDeliveryOrdersHandler)
	router.GET("/tracking/:trackingNo", GetDeliveryTrackingHandler)
	request := func(path string) *httptest.ResponseRecorder {
		response := httptest.NewRecorder()
		router.ServeHTTP(response, httptest.NewRequest(http.MethodGet, path, nil))
		return response
	}
	previousRefresh := refreshDeliveryTracking
	refreshCalls := 0
	refreshDeliveryTracking = func(string) (services.LogisticsTrackingRefreshResult, error) {
		refreshCalls++
		return services.LogisticsTrackingRefreshResult{Status: "refreshed"}, nil
	}
	t.Cleanup(func() { refreshDeliveryTracking = previousRefresh })
	for _, test := range []struct {
		permissions []string
		allowed     []string
	}{
		{[]string{authz.MenuTrading}, []string{"Sales"}},
		{[]string{authz.MenuPurchase}, []string{"Purchase"}},
		{[]string{authz.MenuTrading, authz.MenuPurchase}, []string{"Sales", "Purchase"}},
	} {
		permissions = test.permissions
		response := request("/orders")
		require.Equal(t, http.StatusOK, response.Code, response.Body.String())
		var orders []models.DeliveryOrder
		require.NoError(t, json.Unmarshal(response.Body.Bytes(), &orders))
		actualTypes := make([]string, 0, len(orders))
		for _, order := range orders {
			actualTypes = append(actualTypes, order.BizType)
		}
		require.ElementsMatch(t, test.allowed, actualTypes)
		for _, businessType := range []string{"Sales", "Purchase", "Other"} {
			allowed := false
			for _, allowedType := range test.allowed {
				allowed = allowed || businessType == allowedType
			}
			beforeRefresh := refreshCalls
			response = request("/tracking/isolated-" + businessType + "?refresh=1")
			if allowed {
				require.Equal(t, http.StatusOK, response.Code, response.Body.String())
				require.Equal(t, beforeRefresh+1, refreshCalls)
			} else {
				require.Equal(t, http.StatusForbidden, response.Code, response.Body.String())
				require.Equal(t, beforeRefresh, refreshCalls, "forbidden queries must not invoke the carrier")
			}
		}
	}
	permissions = nil
	require.Equal(t, http.StatusForbidden, request("/orders").Code)
	permissions = []string{authz.MenuTrading}
	require.NoError(t, database.Migrator().DropTable(&models.DeliveryTrackingDetail{}))
	require.Equal(t, http.StatusInternalServerError, request("/tracking/isolated-Sales").Code)
}
