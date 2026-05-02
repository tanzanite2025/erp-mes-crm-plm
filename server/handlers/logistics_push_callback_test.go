package handlers

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"
	"xdfc-server/db"
	"xdfc-server/models"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/require"
)

func setupLogisticsCallbackHandlerTestDB(t *testing.T) {
	t.Helper()
	gin.SetMode(gin.TestMode)
	setupHandlerSQLiteTestDB(t, &models.LogisticsAPIProvider{}, &models.DeliveryOrder{}, &models.DeliveryTrackingDetail{})
}

func createLogisticsCallbackFixtures(t *testing.T) models.DeliveryOrder {
	t.Helper()
	now := time.Now().UTC()
	provider := models.LogisticsAPIProvider{
		Name:      "顺丰速运",
		Code:      "SF",
		Status:    "Enabled",
		AppKey:    "sf-key",
		AppSecret: "sf-secret",
		CheckWord: "sf-check",
	}
	require.NoError(t, db.DB.Create(&provider).Error)

	order := models.DeliveryOrder{
		CreatedAt:   now,
		UpdatedAt:   now,
		BizOrderNo:  "SO-001",
		BizType:     "Sales",
		CarrierCode: "SF",
		CarrierName: "顺丰速运",
		TrackingNo:  "SF1234567890123",
		Status:      DOStatusPending,
		Version:     1,
	}
	require.NoError(t, db.DB.Create(&order).Error)
	return order
}

func performLogisticsCallback(body string, signature string) *httptest.ResponseRecorder {
	recorder := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(recorder)
	request := httptest.NewRequest(http.MethodPost, "/api/v1/logistics-push/callback", strings.NewReader(body))
	request.Header.Set("Content-Type", "application/json")
	if signature != "" {
		request.Header.Set("X-XDFC-Logistics-Signature", signature)
	}
	ctx.Request = request
	HandlePushCallbackHandler(ctx)
	return recorder
}

func TestHandlePushCallbackHandlerRejectsMissingSignature(t *testing.T) {
	setupLogisticsCallbackHandlerTestDB(t)
	order := createLogisticsCallbackFixtures(t)

	body := `{"trackingNo":"SF1234567890123","carrierCode":"SF","status":"Signed","traces":[{"time":"2026-05-02 12:00:00","context":"本人已签收","location":"上海"}]}`
	recorder := performLogisticsCallback(body, "")

	require.Equal(t, http.StatusUnauthorized, recorder.Code, recorder.Body.String())

	var persisted models.DeliveryOrder
	require.NoError(t, db.DB.First(&persisted, order.ID).Error)
	require.Equal(t, DOStatusPending, persisted.Status)
	require.Nil(t, persisted.SignedAt)
}

func TestHandlePushCallbackHandlerRejectsInvalidSignature(t *testing.T) {
	setupLogisticsCallbackHandlerTestDB(t)
	createLogisticsCallbackFixtures(t)

	body := `{"trackingNo":"SF1234567890123","carrierCode":"SF","status":"Signed","traces":[{"time":"2026-05-02 12:00:00","context":"本人已签收","location":"上海"}]}`
	recorder := performLogisticsCallback(body, "bad-signature")

	require.Equal(t, http.StatusUnauthorized, recorder.Code, recorder.Body.String())

	var count int64
	require.NoError(t, db.DB.Model(&models.DeliveryTrackingDetail{}).Count(&count).Error)
	require.Equal(t, int64(0), count)
}

func TestHandlePushCallbackHandlerAcceptsSignedCallback(t *testing.T) {
	setupLogisticsCallbackHandlerTestDB(t)
	order := createLogisticsCallbackFixtures(t)

	body := `{"trackingNo":"SF1234567890123","carrierCode":"SF","status":"Signed","traces":[{"time":"2026-05-02 12:00:00","context":"本人已签收","location":"上海"}]}`
	signature := hmacSHA256Hex("sf-secret", []byte(body))
	recorder := performLogisticsCallback(body, signature)

	require.Equal(t, http.StatusOK, recorder.Code, recorder.Body.String())

	var persisted models.DeliveryOrder
	require.NoError(t, db.DB.First(&persisted, order.ID).Error)
	require.Equal(t, DOStatusSigned, persisted.Status)
	require.Equal(t, "本人已签收", persisted.LastEvent)
	require.Equal(t, "上海", persisted.LastLocation)
	require.NotNil(t, persisted.SignedAt)

	var count int64
	require.NoError(t, db.DB.Model(&models.DeliveryTrackingDetail{}).Where("delivery_order_id = ?", order.ID).Count(&count).Error)
	require.Equal(t, int64(1), count)
}

func TestHandlePushCallbackHandlerRequiresMatchingCarrierCode(t *testing.T) {
	setupLogisticsCallbackHandlerTestDB(t)
	order := createLogisticsCallbackFixtures(t)
	require.NoError(t, db.DB.Create(&models.LogisticsAPIProvider{
		Name:      "京东物流",
		Code:      "JD",
		Status:    "Enabled",
		AppSecret: "jd-secret",
	}).Error)

	body := `{"trackingNo":"SF1234567890123","carrierCode":"JD","status":"Signed","traces":[{"time":"2026-05-02 12:00:00","context":"本人已签收","location":"上海"}]}`
	signature := hmacSHA256Hex("jd-secret", []byte(body))
	recorder := performLogisticsCallback(body, signature)

	require.Equal(t, http.StatusNotFound, recorder.Code, recorder.Body.String())

	var persisted models.DeliveryOrder
	require.NoError(t, db.DB.First(&persisted, order.ID).Error)
	require.Equal(t, DOStatusPending, persisted.Status)
	require.Nil(t, persisted.SignedAt)
}
