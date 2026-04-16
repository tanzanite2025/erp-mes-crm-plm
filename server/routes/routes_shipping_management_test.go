package routes

import (
	"strings"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/require"
)

func TestSetupRoutesRegistersShippingVehicleMatchItemsEndpoint(t *testing.T) {
	gin.SetMode(gin.TestMode)

	r := gin.New()
	SetupRoutes(r)

	var hasRoute bool
	for _, route := range r.Routes() {
		if route.Method == "GET" && route.Path == "/api/v1/shipping-management/vehicle-match-items" {
			hasRoute = strings.Contains(route.Handler, "GetShippingVehicleMatchItemsHandler")
			break
		}
	}

	require.True(t, hasRoute, "expected GET /api/v1/shipping-management/vehicle-match-items to be registered with GetShippingVehicleMatchItemsHandler")
}
