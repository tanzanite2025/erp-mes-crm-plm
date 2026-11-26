package handlers

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"xdfc-server/db"
	"xdfc-server/models"
	"xdfc-server/services"

	"github.com/gin-gonic/gin"
	"github.com/glebarez/sqlite"
	"github.com/google/uuid"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

func newProductBarcodeStateInitializationHTTPRouter(t *testing.T) (*gorm.DB, *gin.Engine) {
	t.Helper()

	database, err := gorm.Open(sqlite.Open("file:"+uuid.NewString()+"?mode=memory&cache=shared"), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Silent),
	})
	require.NoError(t, err)
	connection, err := database.DB()
	require.NoError(t, err)
	t.Cleanup(func() { require.NoError(t, connection.Close()) })
	require.NoError(t, database.Exec(`
		CREATE TABLE product_barcode_states (
			id TEXT PRIMARY KEY,
			created_at DATETIME,
			updated_at DATETIME,
			deleted_at DATETIME,
			product_barcode TEXT NOT NULL UNIQUE,
			product_id TEXT,
			product_name TEXT,
			route_id TEXT,
			route_step_id TEXT,
			current_process_step_id TEXT,
			status TEXT,
			last_event_id TEXT,
			started_at DATETIME,
			completed_at DATETIME
		)
	`).Error)
	require.NoError(t, database.Exec(`
		CREATE TABLE product_barcode_state_events (
			id TEXT PRIMARY KEY,
			created_at DATETIME,
			updated_at DATETIME,
			deleted_at DATETIME,
			state_id TEXT NOT NULL,
			operation_id TEXT,
			product_barcode TEXT NOT NULL,
			event_type TEXT NOT NULL,
			from_process_step_id TEXT,
			to_process_step_id TEXT,
			route_id TEXT,
			route_step_id TEXT,
			operator TEXT,
			payload_snapshot TEXT,
			occurred_at DATETIME
		)
	`).Error)

	previousDatabase := db.DB
	db.DB = database
	t.Cleanup(func() { db.DB = previousDatabase })

	previousGinMode := gin.Mode()
	gin.SetMode(gin.TestMode)
	t.Cleanup(func() { gin.SetMode(previousGinMode) })
	router := gin.New()
	router.Use(func(c *gin.Context) {
		c.Set("username", "product-barcode-state-http-test")
		c.Next()
	})
	router.POST("/production/product-barcode-states", InitializeProductBarcodeStateHandler)
	return database, router
}

func sendProductBarcodeStateInitializationHTTPRequest(router *gin.Engine, body string) *httptest.ResponseRecorder {
	request := httptest.NewRequest(http.MethodPost, "/production/product-barcode-states", bytes.NewBufferString(body))
	request.Header.Set("Content-Type", "application/json")
	response := httptest.NewRecorder()
	router.ServeHTTP(response, request)
	return response
}

func TestProductBarcodeStateInitializationHTTPRejectsStatusMutationAndDuplicateCreation(t *testing.T) {
	database, router := newProductBarcodeStateInitializationHTTPRouter(t)

	response := sendProductBarcodeStateInitializationHTTPRequest(router, `{"productBarcode":"HTTP-001","status":"COMPLETED"}`)
	require.Equal(t, http.StatusBadRequest, response.Code, response.Body.String())

	response = sendProductBarcodeStateInitializationHTTPRequest(router, `{"productBarcode":"HTTP-001","productId":"product-1","productName":"原始产品"}`)
	require.Equal(t, http.StatusOK, response.Code, response.Body.String())
	var created services.ProductBarcodeStateResponse
	require.NoError(t, json.Unmarshal(response.Body.Bytes(), &created))
	require.Equal(t, services.ProductBarcodeStateStatusNotStarted, created.Status)
	require.Len(t, created.Events, 1)
	require.Equal(t, services.ProductBarcodeStateEventInitialized, created.Events[0].EventType)

	response = sendProductBarcodeStateInitializationHTTPRequest(router, `{"productBarcode":"HTTP-001","productId":"product-2","productName":"覆盖尝试"}`)
	require.Equal(t, http.StatusConflict, response.Code, response.Body.String())

	var savedState models.ProductBarcodeState
	require.NoError(t, database.Where("product_barcode = ?", "HTTP-001").First(&savedState).Error)
	require.Equal(t, "product-1", savedState.ProductID)
	require.Equal(t, "原始产品", savedState.ProductName)
	require.Equal(t, services.ProductBarcodeStateStatusNotStarted, savedState.Status)
	var eventCount int64
	require.NoError(t, database.Model(&models.ProductBarcodeStateEvent{}).Where("product_barcode = ?", "HTTP-001").Count(&eventCount).Error)
	require.EqualValues(t, 1, eventCount)
}

func TestProductBarcodeStateInitializationHTTPIgnoresClientRouteIdentity(t *testing.T) {
	database, router := newProductBarcodeStateInitializationHTTPRouter(t)
	response := sendProductBarcodeStateInitializationHTTPRequest(router, `{"productBarcode":"HTTP-ROUTE-IGNORED","productId":"product-1","routeId":"client-route","routeStepId":"client-route-step","processStepId":"client-operation"}`)
	require.Equal(t, http.StatusOK, response.Code, response.Body.String())

	var savedState models.ProductBarcodeState
	require.NoError(t, database.Where("product_barcode = ?", "HTTP-ROUTE-IGNORED").First(&savedState).Error)
	require.Empty(t, savedState.RouteID)
	require.Empty(t, savedState.RouteStepID)
	require.Empty(t, savedState.CurrentProcessStepID)
}
