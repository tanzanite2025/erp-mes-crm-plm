package handlers

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/require"
)

func TestProductionScanHTTPCommandRejectsMissingBlankAndOversizedRequestKeysBeforeDatabaseAccess(t *testing.T) {
	gin.SetMode(gin.TestMode)
	for _, requestBody := range []string{
		`{"productBarcode":"REPLAY","action":"COMPLETE"}`,
		`{"idempotencyKey":"   ","productBarcode":"REPLAY","action":"COMPLETE"}`,
		`{"idempotencyKey":"` + strings.Repeat("k", 129) + `","productBarcode":"REPLAY","action":"COMPLETE"}`,
	} {
		t.Run(requestBody, func(t *testing.T) {
			router := gin.New()
			router.POST("/command", ExecuteProductionScanCommandHandler)
			request := httptest.NewRequest(http.MethodPost, "/command", strings.NewReader(requestBody))
			request.Header.Set("Content-Type", "application/json")
			recorder := httptest.NewRecorder()
			router.ServeHTTP(recorder, request)
			require.Equal(t, http.StatusBadRequest, recorder.Code)
			require.Contains(t, recorder.Body.String(), "idempotencyKey")
		})
	}
}
