package handlers

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/require"
)

func TestGetBusinessEventPhaseCatalogHandlerReturnsAuthoritativeCatalog(t *testing.T) {
	gin.SetMode(gin.TestMode)
	recorder := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(recorder)
	ctx.Request = httptest.NewRequest(http.MethodGet, "/system/routing/event-source-phase-catalog", nil)

	GetBusinessEventPhaseCatalogHandler(ctx)

	require.Equal(t, http.StatusOK, recorder.Code)

	var payload []map[string]any
	require.NoError(t, json.Unmarshal(recorder.Body.Bytes(), &payload))
	require.NotEmpty(t, payload)
	require.Equal(t, "draft", payload[0]["code"])
	require.Equal(t, "draft", payload[0]["semantic"])
	require.Equal(t, "scheduling", payload[2]["code"])
	require.Equal(t, "pending", payload[2]["semantic"])
}
