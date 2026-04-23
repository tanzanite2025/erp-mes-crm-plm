package routes

import (
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/require"
)

func TestRegisterApsSchedulingRoutesDoesNotRegisterDateRulesPath(t *testing.T) {
	gin.SetMode(gin.TestMode)

	r := gin.New()
	api := r.Group("/api/v1")
	authorized := api.Group("")

	registerApsSchedulingRoutes(authorized)

	var hasDateRules bool
	for _, route := range r.Routes() {
		if route.Method == "GET" && route.Path == "/api/v1/aps-scheduling/engine-config/date-rules" {
			hasDateRules = true
			break
		}
	}

	require.False(t, hasDateRules)
}

func TestRegisterApsSchedulingRoutesRegistersPlanAndEventPaths(t *testing.T) {
	gin.SetMode(gin.TestMode)

	r := gin.New()
	api := r.Group("/api/v1")
	authorized := api.Group("")

	registerApsSchedulingRoutes(authorized)

	var hasCreatePlan bool
	var hasRecalculate bool
	var hasEventIngest bool
	for _, route := range r.Routes() {
		if route.Method == "POST" && route.Path == "/api/v1/aps-scheduling/plans" {
			hasCreatePlan = true
		}
		if route.Method == "POST" && route.Path == "/api/v1/aps-scheduling/plans/:id/recalculate" {
			hasRecalculate = true
		}
		if route.Method == "POST" && route.Path == "/api/v1/aps-scheduling/events" {
			hasEventIngest = true
		}
	}

	require.True(t, hasCreatePlan)
	require.True(t, hasRecalculate)
	require.True(t, hasEventIngest)
}
