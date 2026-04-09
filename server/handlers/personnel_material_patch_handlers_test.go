package handlers

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strconv"
	"strings"
	"testing"
	"time"
	"xdfc-server/db"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/stretchr/testify/require"
)

func patchVersionForTest(ts time.Time) int {
	version := ts.UnixMilli()
	if version < 1 {
		return 1
	}
	return int(version)
}

func setupPersonnelMaterialPatchHandlerTestDB(t *testing.T) {
	t.Helper()
	gin.SetMode(gin.TestMode)
	setupHandlerSQLiteTestDB(t)

	statements := []string{
		`CREATE TABLE organizations (
			id TEXT PRIMARY KEY NOT NULL,
			name TEXT,
			parent_id TEXT,
			manager TEXT,
			description TEXT,
			type TEXT,
			linked_architecture TEXT,
			created_at DATETIME,
			updated_at DATETIME,
			deleted_at DATETIME
		)`,
		`CREATE TABLE employees (
			id TEXT PRIMARY KEY NOT NULL,
			staff_id TEXT,
			name TEXT,
			gender TEXT,
			birthday DATETIME,
			id_card TEXT,
			phone TEXT,
			emergency_phone TEXT,
			address TEXT,
			bank_card TEXT,
			bank_name TEXT,
			education TEXT,
			age INTEGER DEFAULT 0,
			station TEXT,
			status TEXT,
			joined_date DATETIME,
			dept_id TEXT,
			line_id TEXT,
			process_id TEXT,
			created_at DATETIME,
			updated_at DATETIME,
			deleted_at DATETIME
		)`,
		`CREATE TABLE production_lines (
			id TEXT PRIMARY KEY NOT NULL,
			name TEXT
		)`,
		`CREATE TABLE process_steps (
			id TEXT PRIMARY KEY NOT NULL,
			name TEXT
		)`,
		`CREATE TABLE materials (
			id TEXT PRIMARY KEY NOT NULL,
			code TEXT,
			name TEXT,
			category TEXT,
			spec TEXT,
			internal_dimensions TEXT,
			external_dimensions TEXT,
			uom TEXT,
			min_stock REAL DEFAULT 0,
			cost_price REAL DEFAULT 0,
			supplier_id TEXT,
			description TEXT,
			images TEXT,
			status TEXT,
			revision_no TEXT,
			effective_from DATETIME,
			effective_to DATETIME,
			change_type TEXT,
			change_order_no TEXT,
			site_code TEXT,
			is_default_site BOOLEAN DEFAULT FALSE,
			version INTEGER DEFAULT 1,
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

func TestPatchEmployeeHandlerReturnsVersionedResponse(t *testing.T) {
	setupPersonnelMaterialPatchHandlerTestDB(t)

	now := time.Now().Add(-2 * time.Second).UTC()
	deptID := uuid.NewString()
	employeeID := uuid.NewString()
	require.NoError(t, db.DB.Exec(`INSERT INTO organizations (id, name, type, created_at, updated_at) VALUES (?, ?, ?, ?, ?)`, deptID, "Manufacturing", "department", now, now).Error)
	require.NoError(t, db.DB.Exec(`
		INSERT INTO employees (id, staff_id, name, phone, status, dept_id, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?)
	`, employeeID, "EMP-001", "Alice", "13800000000", "active", deptID, now, now).Error)

	recorder := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(recorder)
	request := httptest.NewRequest(
		http.MethodPatch,
		"/api/v1/employees/"+employeeID,
		strings.NewReader(`{"op":"PATCH","delta":{"name":{"o":"Alice","n":"Alice Chen"}},"metadata":{"id":"`+employeeID+`","version":`+strconv.Itoa(patchVersionForTest(now))+`}}`),
	)
	request.Header.Set("Content-Type", "application/json")
	ctx.Params = gin.Params{{Key: "id", Value: employeeID}}
	ctx.Request = request

	PatchEmployeeHandler(ctx)

	require.Equal(t, http.StatusOK, recorder.Code, recorder.Body.String())

	var response struct {
		ID      string `json:"id"`
		Name    string `json:"name"`
		Version int    `json:"version"`
	}
	require.NoError(t, json.Unmarshal(recorder.Body.Bytes(), &response))
	require.Equal(t, employeeID, response.ID)
	require.Equal(t, "Alice Chen", response.Name)
	require.Greater(t, response.Version, patchVersionForTest(now))
}

func TestPatchOrgHandlerRejectsStaleVersion(t *testing.T) {
	setupPersonnelMaterialPatchHandlerTestDB(t)

	now := time.Now().Add(-2 * time.Second).UTC()
	orgID := uuid.NewString()
	require.NoError(t, db.DB.Exec(`
		INSERT INTO organizations (id, name, type, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?)
	`, orgID, "Headquarters", "company", now, now).Error)

	recorder := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(recorder)
	request := httptest.NewRequest(
		http.MethodPatch,
		"/api/v1/org/"+orgID,
		strings.NewReader(`{"op":"PATCH","delta":{"name":{"o":"Headquarters","n":"HQ"}},"metadata":{"id":"`+orgID+`","version":1}}`),
	)
	request.Header.Set("Content-Type", "application/json")
	ctx.Params = gin.Params{{Key: "id", Value: orgID}}
	ctx.Request = request

	PatchOrgHandler(ctx)

	require.Equal(t, http.StatusConflict, recorder.Code, recorder.Body.String())
	require.Contains(t, recorder.Body.String(), "CONFLICT")
	require.Contains(t, recorder.Body.String(), "刷新后重试")
}

func TestPatchMaterialHandlerReturnsVersionedResponse(t *testing.T) {
	setupPersonnelMaterialPatchHandlerTestDB(t)

	now := time.Now().UTC()
	materialID := uuid.NewString()
	require.NoError(t, db.DB.Exec(`
		INSERT INTO materials (id, code, name, category, uom, status, version, revision_no, change_type, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	`, materialID, "MAT-001", "Tube", "RAW_MATERIAL", "PCS", "Active", 2, "R1", "MANUAL", now, now).Error)

	recorder := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(recorder)
	request := httptest.NewRequest(
		http.MethodPatch,
		"/api/v1/materials/"+materialID,
		strings.NewReader(`{"op":"PATCH","delta":{"name":{"o":"Tube","n":"Tube Plus"}},"metadata":{"id":"`+materialID+`","version":2}}`),
	)
	request.Header.Set("Content-Type", "application/json")
	ctx.Params = gin.Params{{Key: "id", Value: materialID}}
	ctx.Request = request

	PatchMaterialHandler(ctx)

	require.Equal(t, http.StatusOK, recorder.Code, recorder.Body.String())

	var response struct {
		ID      string `json:"id"`
		Name    string `json:"name"`
		Version int    `json:"version"`
		Legacy  int    `json:"_v"`
	}
	require.NoError(t, json.Unmarshal(recorder.Body.Bytes(), &response))
	require.Equal(t, materialID, response.ID)
	require.Equal(t, "Tube Plus", response.Name)
	require.Equal(t, 3, response.Version)
	require.Equal(t, 3, response.Legacy)
}
