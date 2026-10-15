package handlers

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/require"
)

func TestProductionExecutionHTTPCommandsRejectMissingBlankAndOversizedRequestKeysBeforeDatabaseAccess(t *testing.T) {
	gin.SetMode(gin.TestMode)
	for _, handler := range []struct {
		name string
		fn   gin.HandlerFunc
	}{{"operation execution", RecordProductionOperationExecutionHandler}, {"scan command", ExecuteProductionScanCommandHandler}} {
		for _, requestBody := range []string{
			`{"productBarcode":"REPLAY","processStepId":"process-1","action":"COMPLETE"}`,
			`{"idempotencyKey":"   ","productBarcode":"REPLAY","processStepId":"process-1","action":"COMPLETE"}`,
			`{"idempotencyKey":"` + strings.Repeat("k", 129) + `","productBarcode":"REPLAY","processStepId":"process-1","action":"COMPLETE"}`,
		} {
			t.Run(handler.name+requestBody, func(t *testing.T) {
				router := gin.New()
				router.POST("/command", handler.fn)
				request := httptest.NewRequest(http.MethodPost, "/command", strings.NewReader(requestBody))
				request.Header.Set("Content-Type", "application/json")
				recorder := httptest.NewRecorder()
				router.ServeHTTP(recorder, request)
				require.Equal(t, http.StatusBadRequest, recorder.Code)
				require.Contains(t, recorder.Body.String(), "idempotencyKey")
			})
		}
	}
}
