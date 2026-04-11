package routes

import (
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/require"
)

func TestSetupRoutesRegistersDashboardStatsPath(t *testing.T) {
	gin.SetMode(gin.TestMode)

	r := gin.New()
	SetupRoutes(r)

	var hasDashboardStats bool
	for _, route := range r.Routes() {
		if route.Method == "GET" && route.Path == "/api/v1/dashboard/stats" {
			hasDashboardStats = true
			break
		}
	}

	require.True(t, hasDashboardStats)
}
