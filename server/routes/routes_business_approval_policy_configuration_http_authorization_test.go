package routes

import (
	"bytes"
	"net/http"
	"net/http/httptest"
	"testing"
	"xdfc-server/authz"
	"xdfc-server/db"

	"github.com/gin-gonic/gin"
	"github.com/glebarez/sqlite"
	"github.com/google/uuid"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

func TestBusinessApprovalPolicyConfigurationHTTPRoutesEnforceReadAndManagementPermissions(t *testing.T) {
	database, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{Logger: logger.Default.LogMode(logger.Silent)})
	require.NoError(t, err)
	connection, err := database.DB()
	require.NoError(t, err)
	connection.SetMaxOpenConns(1)
	t.Cleanup(func() { require.NoError(t, connection.Close()) })
	previousDatabase := db.DB
	db.DB = database
	t.Cleanup(func() { db.DB = previousDatabase })
	require.NoError(t, database.Exec(`CREATE TABLE business_approval_policy_configurations (id TEXT PRIMARY KEY, business_type TEXT UNIQUE, enabled BOOLEAN, approver1_id TEXT, approver2_id TEXT, version INTEGER, updated_by TEXT, created_at DATETIME, updated_at DATETIME, deleted_at DATETIME)`).Error)
	require.NoError(t, database.Exec(`CREATE TABLE users (id TEXT PRIMARY KEY, username TEXT, status TEXT, deleted_at DATETIME)`).Error)
	require.NoError(t, database.Exec(`CREATE TABLE audit_logs (id TEXT PRIMARY KEY, module TEXT, target_id TEXT, action TEXT, diff TEXT, operator TEXT, ip TEXT, created_at DATETIME)`).Error)
	actorID := uuid.NewString()
	for _, scenario := range []struct {
		name, method, body string
		permissions        []string
		wantStatus         int
	}{
		{"cannot read without approval access", http.MethodGet, "", nil, http.StatusForbidden},
		{"approval access can read unconfigured policy", http.MethodGet, "", []string{authz.MenuApproval}, http.StatusOK},
		{"approval access cannot configure approvers", http.MethodPut, `{}`, []string{authz.MenuApproval}, http.StatusForbidden},
		{"manager can create disabled configuration", http.MethodPut, `{"enabled":false,"version":0}`, []string{authz.PermissionManage}, http.StatusOK},
		{"stale management write conflicts", http.MethodPut, `{"enabled":false,"version":0}`, []string{authz.PermissionManage}, http.StatusConflict},
		{"missing required approver is rejected", http.MethodPut, `{"enabled":true,"version":1}`, []string{authz.PermissionManage}, http.StatusBadRequest},
	} {
		t.Run(scenario.name, func(t *testing.T) {
			router := gin.New()
			api := router.Group("/api/v1")
			api.Use(func(c *gin.Context) {
				c.Set("permissions", scenario.permissions)
				c.Set("userId", actorID)
				c.Set("username", "configuration-manager")
				c.Next()
			})
			registerApprovalRoutes(api)
			path := "/api/v1/approvals/policies"
			if scenario.method == http.MethodPut {
				path += "/QUALITY_STANDARD"
			}
			request := httptest.NewRequest(scenario.method, path, bytes.NewBufferString(scenario.body))
			request.Header.Set("Content-Type", "application/json")
			response := httptest.NewRecorder()
			router.ServeHTTP(response, request)
			require.Equal(t, scenario.wantStatus, response.Code, response.Body.String())
		})
	}
}
