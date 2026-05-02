package routes

import (
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/require"
)

func TestSetupRoutesDoesNotRegisterPrintBatchNextSequenceEndpoint(t *testing.T) {
	gin.SetMode(gin.TestMode)

	r := gin.New()
	SetupRoutes(r)

	for _, route := range r.Routes() {
		if route.Method == "GET" && route.Path == "/api/v1/print-batches/next-sequence" {
			t.Fatalf("expected GET /api/v1/print-batches/next-sequence to be removed, but found handler %s", route.Handler)
		}
	}

	require.True(t, true)
}
