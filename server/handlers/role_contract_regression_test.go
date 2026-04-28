package handlers

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"
	"xdfc-server/db"
	"xdfc-server/models"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/stretchr/testify/require"
)

func setupRoleContractRegressionTestDB(t *testing.T) {
	t.Helper()
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
	}

	for _, stmt := range statements {
		require.NoError(t, db.DB.Exec(stmt).Error)
	}
}

func seedRoleRecord(t *testing.T, role models.Role) {
	t.Helper()
	require.NoError(t, db.DB.Create(&role).Error)
}

func seedRoleUser(t *testing.T, user models.User) {
	t.Helper()
	require.NoError(t, db.DB.Create(&user).Error)
}

func performRoleRequest(t *testing.T, method string, target string, body string) *httptest.ResponseRecorder {
	t.Helper()
	recorder := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(recorder)
	request := httptest.NewRequest(method, target, strings.NewReader(body))
	request.Header.Set("Content-Type", "application/json")
	ctx.Request = request
	if method == http.MethodDelete {
		ctx.Params = gin.Params{{Key: "id", Value: strings.TrimPrefix(target, "/api/v1/roles/")}}
	}
	if method == http.MethodGet {
		GetRolesHandler(ctx)
		return recorder
	}
	if method == http.MethodPost {
		UpsertRoleHandler(ctx)
		return recorder
	}
	DeleteRoleHandler(ctx)
	return recorder
}

func TestGetRolesHandlerReturnsNormalizedRoleContract(t *testing.T) {
	gin.SetMode(gin.TestMode)
	setupRoleContractRegressionTestDB(t)

	seedRoleRecord(t, models.Role{
		BaseModel: models.BaseModel{ID: uuid.NewString(), CreatedAt: time.Now(), UpdatedAt: time.Now()},
		RoleID:      "Finance-Manager",
		Label:       "财务经理",
		Color:       "bg-blue-500/10 text-blue-600 border-blue-200",
		Permissions: `["MENU_TRADING","action_trading_sales_order_manage"]`,
	})

	recorder := performRoleRequest(t, http.MethodGet, "/api/v1/roles", "")

	require.Equal(t, http.StatusOK, recorder.Code, recorder.Body.String())

	var payload []map[string]any
	require.NoError(t, json.Unmarshal(recorder.Body.Bytes(), &payload))
	require.Len(t, payload, 1)
	require.Equal(t, "finance-manager", payload[0]["id"])
	require.Equal(t, "财务经理", payload[0]["label"])
	require.Contains(t, payload[0]["permissions"].([]any), "menu_trading")
	require.Contains(t, payload[0]["permissions"].([]any), "action_trading_sales_order_manage")
}

func TestUpsertRoleHandlerCreatesNormalizedRole(t *testing.T) {
	gin.SetMode(gin.TestMode)
	setupRoleContractRegressionTestDB(t)

	recorder := performRoleRequest(t, http.MethodPost, "/api/v1/roles", `{
		"id":"Finance-Manager",
		"label":"财务经理",
		"color":"bg-blue-500/10 text-blue-600 border-blue-200",
		"permissions":["MENU_TRADING","menu_trading","action_trading_sales_order_manage"]
	}`)

	require.Equal(t, http.StatusOK, recorder.Code, recorder.Body.String())

	var persisted models.Role
	require.NoError(t, db.DB.First(&persisted, "LOWER(role_id) = ?", "finance-manager").Error)
	require.Equal(t, "finance-manager", persisted.RoleID)
	require.Equal(t, "财务经理", persisted.Label)
	require.JSONEq(t, `["menu_trading","action_trading_sales_order_manage"]`, persisted.Permissions)
}

func TestUpsertRoleHandlerUpdatesExistingRole(t *testing.T) {
	gin.SetMode(gin.TestMode)
	setupRoleContractRegressionTestDB(t)

	seedRoleRecord(t, models.Role{
		BaseModel: models.BaseModel{ID: uuid.NewString(), CreatedAt: time.Now(), UpdatedAt: time.Now()},
		RoleID:      "finance-manager",
		Label:       "旧标签",
		Color:       "bg-slate-500/10 text-slate-600 border-slate-200",
		Permissions: `["menu_org"]`,
	})

	recorder := performRoleRequest(t, http.MethodPost, "/api/v1/roles", `{
		"id":"finance-manager",
		"label":"财务经理",
		"color":"bg-emerald-500/10 text-emerald-600 border-emerald-200",
		"permissions":["menu_trading"]
	}`)

	require.Equal(t, http.StatusOK, recorder.Code, recorder.Body.String())

	var persisted models.Role
	require.NoError(t, db.DB.First(&persisted, "LOWER(role_id) = ?", "finance-manager").Error)
	require.Equal(t, "财务经理", persisted.Label)
	require.Equal(t, "bg-emerald-500/10 text-emerald-600 border-emerald-200", persisted.Color)
	require.JSONEq(t, `["menu_trading"]`, persisted.Permissions)
}

func TestDeleteRoleHandlerClearsUserBindingsAndDeletesRole(t *testing.T) {
	gin.SetMode(gin.TestMode)
	setupRoleContractRegressionTestDB(t)

	seedRoleRecord(t, models.Role{
		BaseModel: models.BaseModel{ID: uuid.NewString(), CreatedAt: time.Now(), UpdatedAt: time.Now()},
		RoleID:      "finance-manager",
		Label:       "财务经理",
		Color:       "bg-blue-500/10 text-blue-600 border-blue-200",
		Permissions: `["menu_trading"]`,
	})
	seedRoleUser(t, models.User{
		ID:        uuid.NewString(),
		Username:  "finance-user",
		Password:  "$2a$11$abcdefghijklmnopqrstuv",
		Status:    "active",
		Role:      "finance-manager",
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	})

	recorder := performRoleRequest(t, http.MethodDelete, "/api/v1/roles/finance-manager", "")

	require.Equal(t, http.StatusOK, recorder.Code, recorder.Body.String())

	var deleted models.Role
	require.Error(t, db.DB.First(&deleted, "LOWER(role_id) = ?", "finance-manager").Error)

	var user models.User
	require.NoError(t, db.DB.First(&user, "username = ?", "finance-user").Error)
	require.Equal(t, "", user.Role)
}

func TestDeleteRoleHandlerRejectsProtectedAdminRole(t *testing.T) {
	gin.SetMode(gin.TestMode)
	setupRoleContractRegressionTestDB(t)

	seedRoleRecord(t, models.Role{
		BaseModel: models.BaseModel{ID: uuid.NewString(), CreatedAt: time.Now(), UpdatedAt: time.Now()},
		RoleID:      "admin",
		Label:       "管理员",
		Color:       "bg-slate-500/10 text-slate-600 border-slate-200",
		Permissions: `["menu_org"]`,
	})

	recorder := performRoleRequest(t, http.MethodDelete, "/api/v1/roles/admin", "")

	require.Equal(t, http.StatusForbidden, recorder.Code, recorder.Body.String())
	require.Contains(t, recorder.Body.String(), "protected role cannot be deleted")

	var persisted models.Role
	require.NoError(t, db.DB.First(&persisted, "LOWER(role_id) = ?", "admin").Error)
}
