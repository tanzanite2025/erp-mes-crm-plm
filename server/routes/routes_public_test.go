package routes

import (
	"strings"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/require"
)

func TestRegisterPublicRoutesRegistersPackagingAssemblySubmitEndpoint(t *testing.T) {
	gin.SetMode(gin.TestMode)

	r := gin.New()
	api := r.Group("/api/v1")

	registerPublicRoutes(api)

	var hasPackagingAssemblySubmit bool
	for _, route := range r.Routes() {
		if route.Method == "POST" && route.Path == "/api/v1/warehouse/packaging-assemblies/capture-sessions/:sessionId/submit" {
			hasPackagingAssemblySubmit = strings.Contains(route.Handler, "SubmitPackagingAssemblyCaptureSessionHandler")
		}
	}

	require.True(t, hasPackagingAssemblySubmit, "expected public packaging assembly capture submit endpoint to be registered")
}
