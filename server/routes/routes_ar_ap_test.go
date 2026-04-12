package routes

import (
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/require"
)

func TestRegisterArApRoutesRegistersExpectedPaths(t *testing.T) {
	gin.SetMode(gin.TestMode)

	r := gin.New()
	api := r.Group("/api/v1")
	authorized := api.Group("")

	registerArApRoutes(authorized)

	getPaths := make(map[string]struct{})
	postPaths := make(map[string]struct{})
	for _, route := range r.Routes() {
		if route.Method == "GET" {
			getPaths[route.Path] = struct{}{}
		}
		if route.Method == "POST" {
			postPaths[route.Path] = struct{}{}
		}
	}

	_, hasReceivables := getPaths["/api/v1/receivables"]
	_, hasReceivableSearch := getPaths["/api/v1/receivables/search"]
	_, hasReceivableDetail := getPaths["/api/v1/receivables/:id"]
	_, hasPayables := getPaths["/api/v1/payables"]
	_, hasPayableSearch := getPaths["/api/v1/payables/search"]
	_, hasPayableDetail := getPaths["/api/v1/payables/:id"]
	_, hasReceiptCreate := postPaths["/api/v1/receivables/:id/receipts"]
	_, hasPaymentCreate := postPaths["/api/v1/payables/:id/payments"]
	require.True(t, hasReceivables)
	require.True(t, hasReceivableSearch)
	require.True(t, hasReceivableDetail)
	require.True(t, hasPayables)
	require.True(t, hasPayableSearch)
	require.True(t, hasPayableDetail)
	require.True(t, hasReceiptCreate)
	require.True(t, hasPaymentCreate)
}
