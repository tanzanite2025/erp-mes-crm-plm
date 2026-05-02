package handlers

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"
	"xdfc-server/authz"
	"xdfc-server/db"
	"xdfc-server/models"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/require"
)

func setupUsersAuditHandlerTestDB(t *testing.T) {
	t.Helper()
	gin.SetMode(gin.TestMode)
	setupHandlerSQLiteTestDB(t)

	statements := []string{
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
		`CREATE TABLE user_permissions (
			id TEXT PRIMARY KEY,
			user_id TEXT NOT NULL,
			permission_id TEXT NOT NULL,
			source TEXT,
			granted_by TEXT,
			reason TEXT,
			batch_id TEXT,
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

func newUsersAuditContext(method string, target string, body string) (*gin.Context, *httptest.ResponseRecorder) {
	recorder := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(recorder)
	request := httptest.NewRequest(method, target, strings.NewReader(body))
	request.Header.Set("Content-Type", "application/json")
	request.RemoteAddr = "198.51.100.88:3456"
	ctx.Request = request
	ctx.Set("userId", "audit-handler-user-id")
	ctx.Set("username", "audit-handler-user")
	ctx.Set("permissions", []string{authz.PermissionManage, authz.PermissionUserCreate, authz.PermissionUserEdit, authz.PermissionUserDelete})
	return ctx, recorder
}

func TestCreateUserHandlerWritesAuditWithActorAndIP(t *testing.T) {
	setupUsersAuditHandlerTestDB(t)

	ctx, recorder := newUsersAuditContext(http.MethodPost, "/api/v1/users", `{"username":"audit-created-user","password":"Secure123","email":"audit-created@example.com","status":"active","role":"system-admin"}`)

	CreateUserHandler(ctx)

	require.Equal(t, http.StatusCreated, recorder.Code, recorder.Body.String())
	var logs []models.AuditLog
	require.NoError(t, db.DB.Find(&logs).Error)
	require.Len(t, logs, 1)
	require.Equal(t, "CREATE", logs[0].Action)
	require.Equal(t, "audit-handler-user", logs[0].Operator)
	require.Equal(t, "198.51.100.88", logs[0].IP)
}

func TestPatchUserHandlerWritesAuditWithActorAndIP(t *testing.T) {
	setupUsersAuditHandlerTestDB(t)
	now := time.Now().UTC()
	require.NoError(t, db.DB.Exec(`
		INSERT INTO users (id, username, password, status, role, employee_id, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?)
	`, "audit-patch-user", "patch-target", "$2a$11$oldhasholdhasholdhasholdhasholdhasholdhasholdhash", "active", "staff", "EMP-10", now, now).Error)

	ctx, recorder := newUsersAuditContext(http.MethodPatch, "/api/v1/users/audit-patch-user", `{"password":"Reset123456","role":"system-admin","status":"inactive"}`)
	ctx.Params = gin.Params{{Key: "id", Value: "audit-patch-user"}}

	PatchUserHandler(ctx)

	require.Equal(t, http.StatusOK, recorder.Code, recorder.Body.String())
	var logs []models.AuditLog
	require.NoError(t, db.DB.Find(&logs).Error)
	require.Len(t, logs, 1)
	require.Equal(t, "PATCH", logs[0].Action)
	require.Equal(t, "audit-handler-user", logs[0].Operator)
	require.Equal(t, "198.51.100.88", logs[0].IP)
	require.Contains(t, string(logs[0].Diff), "passwordChanged")
}

func TestReplaceUserHandlerWritesAuditWithActorAndIP(t *testing.T) {
	setupUsersAuditHandlerTestDB(t)
	now := time.Now().UTC()
	require.NoError(t, db.DB.Exec(`
		INSERT INTO users (id, username, password, status, role, employee_id, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?)
	`, "audit-replace-user", "replace-target", "$2a$11$replacehashreplacehashreplacehashreplacehashreplace", "active", "staff", "EMP-11", now, now).Error)

	ctx, recorder := newUsersAuditContext(http.MethodPut, "/api/v1/users/audit-replace-user", `{"username":"replace-target-new","phoneNumber":"7777","firstName":"Audit","lastName":"Replace","status":"inactive","role":"manager","employeeId":"EMP-22","password":"ResetReplace123"}`)
	ctx.Params = gin.Params{{Key: "id", Value: "audit-replace-user"}}

	ReplaceUserHandler(ctx)

	require.Equal(t, http.StatusOK, recorder.Code, recorder.Body.String())
	var logs []models.AuditLog
	require.NoError(t, db.DB.Find(&logs).Error)
	require.Len(t, logs, 1)
	require.Equal(t, "REPLACE", logs[0].Action)
	require.Equal(t, "audit-handler-user", logs[0].Operator)
	require.Equal(t, "198.51.100.88", logs[0].IP)
}

func TestDeleteUserHandlerWritesAuditWithActorAndIP(t *testing.T) {
	setupUsersAuditHandlerTestDB(t)
	now := time.Now().UTC()
	require.NoError(t, db.DB.Exec(`
		INSERT INTO users (id, username, password, status, role, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, ?, ?)
	`, "audit-delete-user", "delete-target", "$2a$11$deletehashdeletehashdeletehashdeletehashdeletehash", "active", "staff", now, now).Error)

	ctx, recorder := newUsersAuditContext(http.MethodDelete, "/api/v1/users/audit-delete-user", "")
	ctx.Params = gin.Params{{Key: "id", Value: "audit-delete-user"}}

	DeleteUserHandler(ctx)

	require.Equal(t, http.StatusOK, recorder.Code, recorder.Body.String())
	var logs []models.AuditLog
	require.NoError(t, db.DB.Find(&logs).Error)
	require.Len(t, logs, 1)
	require.Equal(t, "DELETE", logs[0].Action)
	require.Equal(t, "audit-handler-user", logs[0].Operator)
	require.Equal(t, "198.51.100.88", logs[0].IP)
}

func TestReplaceUserPermissionsHandlerWritesAuditWithActorAndIP(t *testing.T) {
	setupUsersAuditHandlerTestDB(t)
	now := time.Now().UTC()
	require.NoError(t, db.DB.Exec(`
		INSERT INTO users (id, username, password, status, role, employee_id, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?)
	`, "audit-perm-user", "perm-target", "$2a$11$permhashpermhashpermhashpermhashpermhashpermhash", "active", "manager", "EMP-33", now, now).Error)
	require.NoError(t, db.DB.Exec(`
		INSERT INTO user_permissions (id, user_id, permission_id, source, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, ?)
	`, "audit-perm-row-1", "audit-perm-user", authz.PermissionUserView, "manual", now, now).Error)

	ctx, recorder := newUsersAuditContext(http.MethodPut, "/api/v1/users/audit-perm-user/permissions", `{"permissions":["`+authz.PermissionUserEdit+`","`+authz.PermissionUserView+`"],"source":"manual","reason":"audit coverage"}`)
	ctx.Params = gin.Params{{Key: "id", Value: "audit-perm-user"}}

	ReplaceUserPermissionsHandler(ctx)

	require.Equal(t, http.StatusOK, recorder.Code, recorder.Body.String())
	var logs []models.AuditLog
	require.NoError(t, db.DB.Find(&logs).Error)
	require.Len(t, logs, 1)
	require.Equal(t, "UserPermission", logs[0].Module)
	require.Equal(t, "REPLACE", logs[0].Action)
	require.Equal(t, "audit-handler-user", logs[0].Operator)
	require.Equal(t, "198.51.100.88", logs[0].IP)
}
