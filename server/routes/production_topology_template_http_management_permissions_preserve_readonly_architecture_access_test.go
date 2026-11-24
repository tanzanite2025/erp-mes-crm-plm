package routes

import (
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/require"
	"xdfc-server/authz"
)

func TestProductionTopologyTemplateHTTPRequiresManagementForCaptureEditApplyAndDelete(t *testing.T) {
	for _, endpoint := range []struct{ method, path string }{
		{"POST", "/topology-templates/from-line"}, {"PATCH", "/topology-templates/invalid"},
		{"POST", "/topology-templates/invalid/apply"}, {"DELETE", "/topology-templates/invalid"},
	} {
		for _, canManage := range []bool{false, true} {
			t.Run(endpoint.method+endpoint.path+map[bool]string{false: " readonly", true: " manager"}[canManage], func(t *testing.T) {
				router := gin.New()
				group := router.Group("/api/v1")
				group.Use(func(context *gin.Context) {
					permissions := []string{authz.MenuProdConfig}
					if canManage {
						permissions = append(permissions, authz.PermissionManage)
					}
					context.Set("permissions", permissions)
					context.Set("userID", "test-operator")
					context.Next()
				})
				registerProductionRoutes(group)
				request := httptest.NewRequest(endpoint.method, "/api/v1/production"+endpoint.path, strings.NewReader("{}"))
				request.Header.Set("Content-Type", "application/json")
				response := httptest.NewRecorder()
				router.ServeHTTP(response, request)
				if canManage {
					require.Equal(t, 400, response.Code, response.Body.String())
				} else {
					require.Equal(t, 403, response.Code, response.Body.String())
				}
			})
		}
	}
}
