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

	schemaStatements := []string{
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
	}

	for _, stmt := range schemaStatements {
		require.NoError(t, db.DB.Exec(stmt).Error)
	}
}

func seedRoleContractRecord(t *testing.T, roleID string, permissions string, updatedAt time.Time) {
	t.Helper()
	require.NoError(t, db.DB.Create(&models.Role{
		BaseModel:   models.BaseModel{ID: uuid.NewString(), CreatedAt: updatedAt, UpdatedAt: updatedAt},
		RoleID:      roleID,
		Label:       roleID,
		Color:       "bg-slate-500/10 text-slate-600 border-slate-200",
		Permissions: permissions,
	}).Error)
}

func TestGetRolesHandlerReturnsStructuredMergedPermissionsForOrgRoleFamily(t *testing.T) {
	gin.SetMode(gin.TestMode)
	setupRoleContractRegressionTestDB(t)

	seedRoleContractRecord(t, "org_dept-9", `["page_trading_sales_orders"]`, time.Unix(100, 0))
	seedRoleContractRecord(t, "org_dept-9|sales", `["menu_system"]`, time.Unix(200, 0))

	recorder := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(recorder)
	ctx.Request = httptest.NewRequest(http.MethodGet, "/api/v1/roles", nil)

	GetRolesHandler(ctx)

	require.Equal(t, http.StatusOK, recorder.Code, recorder.Body.String())

	var payload []struct {
		ID          string   `json:"id"`
		Permissions []string `json:"permissions"`
	}
	require.NoError(t, json.Unmarshal(recorder.Body.Bytes(), &payload))
	require.Len(t, payload, 2)

	for _, role := range payload {
		if role.ID != "org_dept-9" && role.ID != "org_dept-9|sales" {
			continue
		}
		require.Contains(t, role.Permissions, "page_trading_sales_orders")
		require.Contains(t, role.Permissions, "menu_system")
		require.Contains(t, role.Permissions, "menu_trading")
	}
}

func TestUpsertRoleHandlerAcceptsStructuredPermissionsPayloadAndReturnsStructuredResponse(t *testing.T) {
	gin.SetMode(gin.TestMode)
	setupRoleContractRegressionTestDB(t)

	recorder := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(recorder)
	request := httptest.NewRequest(http.MethodPost, "/api/v1/roles", strings.NewReader(`{
		"id":"org_dept-ops",
		"label":"Ops",
		"color":"bg-blue-500/10 text-blue-600 border-blue-200",
		"permissions":["page_trading_sales_orders"]
	}`))
	request.Header.Set("Content-Type", "application/json")
	ctx.Request = request

	UpsertRoleHandler(ctx)

	require.Equal(t, http.StatusOK, recorder.Code, recorder.Body.String())

	var payload struct {
		ID          string   `json:"id"`
		Permissions []string `json:"permissions"`
	}
	require.NoError(t, json.Unmarshal(recorder.Body.Bytes(), &payload))
	require.Equal(t, "org_dept-ops", payload.ID)
	require.Contains(t, payload.Permissions, "page_trading_sales_orders")
	require.Contains(t, payload.Permissions, "menu_trading")

	var persisted models.Role
	require.NoError(t, db.DB.Where("role_id = ?", "org_dept-ops").First(&persisted).Error)
	require.Contains(t, persisted.Permissions, "page_trading_sales_orders")
}
