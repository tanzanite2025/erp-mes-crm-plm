package handlers

import (
	"bytes"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
	"net/http"
	"net/http/httptest"
	"testing"
	"xdfc-server/authz"
	"xdfc-server/models"
	"xdfc-server/services"
)

func TestSystemNotificationInboxHandlersPostgresOnlyExposeCurrentAccountAndValidateExactStateUpdates(t *testing.T) {
	database := createIsolatedQualityStandardPatchPostgresDatabase(t)
	require.NoError(t, database.AutoMigrate(&models.User{}, &models.SystemNotificationInboxEntry{}, &models.WorkflowNotificationOutboxEntry{}))
	accountID, foreignID := uuid.NewString(), uuid.NewString()
	for _, id := range []string{accountID, foreignID} {
		require.NoError(t, database.Create(&models.User{ID: id, Username: id, Password: "isolated-test", Status: "active"}).Error)
	}
	var own, foreign models.SystemNotificationInboxEntry
	require.NoError(t, database.Transaction(func(tx *gorm.DB) error {
		var err error
		own, err = services.CreateSystemNotificationInboxEntryWithinTransaction(tx, services.SystemNotificationInboxCreationInput{RecipientUserID: accountID, EventKey: "own", PurposeKey: "test", SourceCode: "QUALITY_STANDARD", Title: "Own receipt"})
		if err != nil {
			return err
		}
		foreign, err = services.CreateSystemNotificationInboxEntryWithinTransaction(tx, services.SystemNotificationInboxCreationInput{RecipientUserID: foreignID, EventKey: "foreign", PurposeKey: "test", SourceCode: "QUALITY_STANDARD", Title: "Foreign receipt"})
		return err
	}))
	router := gin.New()
	router.Use(func(c *gin.Context) {
		c.Set("userId", accountID)
		c.Set("permissions", []string{authz.MenuQuality})
		c.Next()
	})
	router.GET("/inbox", ListCurrentAccountSystemNotificationInboxHandler)
	router.POST("/inbox/state", UpdateCurrentAccountSystemNotificationInboxStateHandler)
	request := func(method, path, body string) *httptest.ResponseRecorder {
		response := httptest.NewRecorder()
		req := httptest.NewRequest(method, path, bytes.NewBufferString(body))
		req.Header.Set("Content-Type", "application/json")
		router.ServeHTTP(response, req)
		return response
	}
	response := request(http.MethodGet, "/inbox?recipientUserId="+foreignID, "")
	require.Equal(t, http.StatusOK, response.Code, response.Body.String())
	require.Contains(t, response.Body.String(), own.ID)
	require.NotContains(t, response.Body.String(), foreign.ID)
	require.Equal(t, http.StatusBadRequest, request(http.MethodGet, "/inbox?cursor=invalid", "").Code)
	require.Equal(t, http.StatusBadRequest, request(http.MethodGet, "/inbox?limit=101", "").Code)
	response = request(http.MethodPost, "/inbox/state", `{"ids":["`+own.ID+`","`+foreign.ID+`"],"action":"read"}`)
	require.Equal(t, http.StatusNotFound, response.Code, response.Body.String())
	require.NoError(t, database.First(&own, "id = ?", own.ID).Error)
	require.Nil(t, own.ReadAt)
	response = request(http.MethodPost, "/inbox/state", `{"ids":["`+own.ID+`"],"action":"read","recipientUserId":"`+foreignID+`"}`)
	require.Equal(t, http.StatusNoContent, response.Code, response.Body.String())
	require.NoError(t, database.First(&own, "id = ?", own.ID).Error)
	require.NotNil(t, own.ReadAt)
	require.Equal(t, http.StatusBadRequest, request(http.MethodPost, "/inbox/state", `{"ids":["bad-id"],"action":"archive"}`).Code)
}
