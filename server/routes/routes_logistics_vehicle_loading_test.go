package routes

import (
	"strings"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/require"
)

func TestSetupRoutesRegistersVehicleLoadingRecommendationsEndpoint(t *testing.T) {
	gin.SetMode(gin.TestMode)

	r := gin.New()
	SetupRoutes(r)

	var hasRecommendations bool
	for _, route := range r.Routes() {
		if route.Method == "POST" && route.Path == "/api/v1/logistics/vehicle-loading/recommendations" {
			hasRecommendations = strings.Contains(route.Handler, "GetVehicleLoadingRecommendationsHandler")
			break
		}
	}

	require.True(t, hasRecommendations, "expected POST /api/v1/logistics/vehicle-loading/recommendations to be registered with GetVehicleLoadingRecommendationsHandler")
}
