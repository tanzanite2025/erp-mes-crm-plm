package routes

import (
	"strings"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/require"
)

func TestRegisterInventoryRoutesRegistersSummaryEndpoints(t *testing.T) {
	gin.SetMode(gin.TestMode)

	r := gin.New()
	api := r.Group("/api/v1")
	authorized := api.Group("")

	registerInventoryRoutes(authorized)

	var hasValuation bool
	var hasAlertSummary bool

	for _, route := range r.Routes() {
		if route.Method == "GET" && route.Path == "/api/v1/inventory/valuation" {
			hasValuation = strings.Contains(route.Handler, "GetInventoryValuationHandler")
		}
		if route.Method == "GET" && route.Path == "/api/v1/inventory/alerts/summary" {
			hasAlertSummary = strings.Contains(route.Handler, "GetInventoryAlertSummaryHandler")
		}
	}

	require.True(t, hasValuation, "expected GET /api/v1/inventory/valuation to be registered with GetInventoryValuationHandler")
	require.True(t, hasAlertSummary, "expected GET /api/v1/inventory/alerts/summary to be registered with GetInventoryAlertSummaryHandler")
}
