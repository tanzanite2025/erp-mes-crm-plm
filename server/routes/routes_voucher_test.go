package routes

import (
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/require"
)

func TestRegisterVoucherRoutesRegistersExpectedPaths(t *testing.T) {
	gin.SetMode(gin.TestMode)

	r := gin.New()
	api := r.Group("/api/v1")
	authorized := api.Group("")

	registerVoucherRoutes(authorized)

	getPaths := make(map[string]struct{})
	for _, route := range r.Routes() {
		if route.Method == "GET" {
			getPaths[route.Path] = struct{}{}
		}
	}

	_, hasList := getPaths["/api/v1/vouchers"]
	_, hasDetail := getPaths["/api/v1/vouchers/:id"]
	require.True(t, hasList)
	require.True(t, hasDetail)
}
