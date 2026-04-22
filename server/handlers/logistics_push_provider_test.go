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

func setupLogisticsProviderHandlerTestDB(t *testing.T) {
	t.Helper()
	gin.SetMode(gin.TestMode)
	setupHandlerSQLiteTestDB(t, &models.LogisticsAPIProvider{}, &models.DeliveryOrder{})
}

func TestSaveLogisticsProviderHandlerPreservesOmittedFieldsOnUpdate(t *testing.T) {
	setupLogisticsProviderHandlerTestDB(t)

	now := time.Now().UTC()
	existing := models.LogisticsAPIProvider{
		ID:             1,
		CreatedAt:      now,
		UpdatedAt:      now,
		Name:           "顺丰速运",
		Code:           "SF",
		Category:       "domestic",
		Website:        "https://sf.example.com",
		Contact:        "旧联系人",
		Phone:          "95338",
		Note:           "旧备注",
		AppKey:         "key-1",
		AppSecret:      "secret-1",
		CustomerID:     "customer-1",
		CheckWord:      "check-1",
		Endpoint:       "https://old.example.com",
		Status:         "Enabled",
		Capabilities:   models.StringList{"tracking", "callback"},
		QuotaTotal:     1000,
		QuotaUsed:      120,
		QuotaAlertAt:   80,
	}
	require.NoError(t, db.DB.Create(&existing).Error)

	body := `{"id":1,"name":"顺丰速运-更新","endpoint":"https://new.example.com"}`
	recorder := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(recorder)
	request := httptest.NewRequest(http.MethodPost, "/api/v1/logistics-push/providers", strings.NewReader(body))
	request.Header.Set("Content-Type", "application/json")
	ctx.Request = request

	SaveLogisticsProviderHandler(ctx)
	require.Equal(t, http.StatusOK, recorder.Code, recorder.Body.String())

	var saved models.LogisticsAPIProvider
	require.NoError(t, db.DB.First(&saved, 1).Error)
	require.Equal(t, "顺丰速运-更新", saved.Name)
	require.Equal(t, "SF", saved.Code)
	require.Equal(t, "https://new.example.com", saved.Endpoint)
	require.Equal(t, "key-1", saved.AppKey)
	require.Equal(t, "secret-1", saved.AppSecret)
	require.Equal(t, "customer-1", saved.CustomerID)
	require.Equal(t, "check-1", saved.CheckWord)
	require.Equal(t, 1000, saved.QuotaTotal)
	require.Equal(t, 120, saved.QuotaUsed)
	require.Equal(t, 80, saved.QuotaAlertAt)
}

func TestSaveLogisticsProviderHandlerAllowsExplicitFieldClearingOnUpdate(t *testing.T) {
	setupLogisticsProviderHandlerTestDB(t)

	now := time.Now().UTC()
	existing := models.LogisticsAPIProvider{
		ID:           2,
		CreatedAt:    now,
		UpdatedAt:    now,
		Name:         "京东物流",
		Code:         "JD",
		Category:     "domestic",
		AppKey:       "key-2",
		AppSecret:    "secret-2",
		CustomerID:   "customer-2",
		CheckWord:    "check-2",
		Endpoint:     "https://jd.example.com",
		Status:       "Enabled",
		Capabilities: models.StringList{"tracking"},
	}
	require.NoError(t, db.DB.Create(&existing).Error)

	body := `{"id":2,"appSecret":"","customerId":""}`
	recorder := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(recorder)
	request := httptest.NewRequest(http.MethodPost, "/api/v1/logistics-push/providers", strings.NewReader(body))
	request.Header.Set("Content-Type", "application/json")
	ctx.Request = request

	SaveLogisticsProviderHandler(ctx)
	require.Equal(t, http.StatusOK, recorder.Code, recorder.Body.String())

	var saved models.LogisticsAPIProvider
	require.NoError(t, db.DB.First(&saved, 2).Error)
	require.Equal(t, "", saved.AppSecret)
	require.Equal(t, "", saved.CustomerID)
	require.Equal(t, "key-2", saved.AppKey)
	require.Equal(t, "check-2", saved.CheckWord)
}
