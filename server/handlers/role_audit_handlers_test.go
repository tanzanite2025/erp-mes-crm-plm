package handlers

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"
	"xdfc-server/db"
	"xdfc-server/models"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/require"
)

func setupRoleAuditHandlerTestDB(t *testing.T) {
	t.Helper()
	gin.SetMode(gin.TestMode)
	setupHandlerSQLiteTestDB(t)

	statements := []string{
		`CREATE TABLE roles (
			id TEXT PRIMARY KEY,
			role_id TEXT NOT NULL UNIQUE,
			label TEXT,
			color TEXT,
			permissions TEXT,
			created_at DATETIME,
			updated_at DATETIME,
			deleted_at DATETIME
		)`,
		`CREATE TABLE users (
			id TEXT PRIMARY KEY,
			username TEXT NOT NULL UNIQUE,
			password TEXT NOT NULL,
			email TEXT,
			phone_number TEXT,
			first_name TEXT,
			last_name TEXT,
			status TEXT,
			role TEXT,
			employee_id TEXT,
			created_at DATETIME,
			updated_at DATETIME,
			deleted_at DATETIME
		)`,
		`CREATE TABLE audit_logs (
			id TEXT PRIMARY KEY NOT NULL,
			module TEXT,
			target_id TEXT,
			action TEXT,
			diff TEXT,
			operator TEXT,
			ip TEXT,
			created_at DATETIME
		)`,
	}
	for _, statement := range statements {
		require.NoError(t, db.DB.Exec(statement).Error)
	}
}

func newRoleAuditContext(method string, target string, body string) (*gin.Context, *httptest.ResponseRecorder) {
	recorder := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(recorder)
	request := httptest.NewRequest(method, target, strings.NewReader(body))
	request.Header.Set("Content-Type", "application/json")
	request.RemoteAddr = "198.51.100.99:4567"
	ctx.Request = request
	ctx.Set("userId", "role-handler-user-id")
	ctx.Set("username", "role-handler-auditor")
	return ctx, recorder
}

func TestUpsertRoleHandlerWritesCreateAuditWithActorAndIP(t *testing.T) {
	setupRoleAuditHandlerTestDB(t)

	ctx, recorder := newRoleAuditContext(http.MethodPost, "/api/v1/roles", `{"id":"Finance-Manager","label":"财务经理","color":"bg-blue-500/10 text-blue-600 border-blue-200","permissions":["menu_trading","action_trading_sales_order_manage"]}`)

	UpsertRoleHandler(ctx)

	require.Equal(t, http.StatusOK, recorder.Code, recorder.Body.String())
	var logs []models.AuditLog
	require.NoError(t, db.DB.Find(&logs).Error)
	require.Len(t, logs, 1)
	require.Equal(t, "CREATE", logs[0].Action)
	require.Equal(t, "Role", logs[0].Module)
	require.Equal(t, "role-handler-auditor", logs[0].Operator)
	require.Equal(t, "198.51.100.99", logs[0].IP)
}

func TestUpsertRoleHandlerWritesUpdateAuditWithPermissionDelta(t *testing.T) {
	setupRoleAuditHandlerTestDB(t)
	now := time.Now().UTC()
	require.NoError(t, db.DB.Exec(`
		INSERT INTO roles (id, role_id, label, color, permissions, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, ?, ?)
	`, "role-h-1", "finance-manager", "旧标签", "old-color", `["menu_org"]`, now, now).Error)

	ctx, recorder := newRoleAuditContext(http.MethodPost, "/api/v1/roles", `{"id":"finance-manager","label":"财务经理","color":"bg-emerald-500/10 text-emerald-600 border-emerald-200","permissions":["menu_trading"]}`)

	UpsertRoleHandler(ctx)

	require.Equal(t, http.StatusOK, recorder.Code, recorder.Body.String())
	var logs []models.AuditLog
	require.NoError(t, db.DB.Find(&logs).Error)
	require.Len(t, logs, 1)
	require.Equal(t, "UPSERT", logs[0].Action)
	require.Equal(t, "role-handler-auditor", logs[0].Operator)
	require.Equal(t, "198.51.100.99", logs[0].IP)
	require.Contains(t, string(logs[0].Diff), "addedPermissions")
}

func TestDeleteRoleHandlerWritesAuditWithUnbindSummary(t *testing.T) {
	setupRoleAuditHandlerTestDB(t)
	now := time.Now().UTC()
	require.NoError(t, db.DB.Exec(`
		INSERT INTO roles (id, role_id, label, color, permissions, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, ?, ?)
	`, "role-h-2", "finance-manager", "财务经理", "role-color", `["menu_trading"]`, now, now).Error)
	require.NoError(t, db.DB.Exec(`
		INSERT INTO users (id, username, password, status, role, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, ?, ?)
	`, "role-user-1", "finance-user", "$2a$11$abcdefghijklmnopqrstuv0123456789abcdefghi", "active", "finance-manager", now, now).Error)

	ctx, recorder := newRoleAuditContext(http.MethodDelete, "/api/v1/roles/finance-manager", "")
	ctx.Params = gin.Params{{Key: "id", Value: "finance-manager"}}

	DeleteRoleHandler(ctx)

	require.Equal(t, http.StatusOK, recorder.Code, recorder.Body.String())
	var logs []models.AuditLog
	require.NoError(t, db.DB.Find(&logs).Error)
	require.Len(t, logs, 1)
	require.Equal(t, "DELETE", logs[0].Action)
	require.Equal(t, "role-handler-auditor", logs[0].Operator)
	require.Equal(t, "198.51.100.99", logs[0].IP)
	require.Contains(t, string(logs[0].Diff), "unboundUserCount")
}
