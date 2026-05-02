package handlers

import (
	"encoding/json"
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

func setupMaterialsAuditHandlerTestDB(t *testing.T) {
	t.Helper()
	gin.SetMode(gin.TestMode)
	setupHandlerSQLiteTestDB(t)

	statements := []string{
		`CREATE TABLE materials (
			id TEXT PRIMARY KEY NOT NULL,
			code TEXT UNIQUE,
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
		`CREATE TABLE inventory (
			id TEXT PRIMARY KEY NOT NULL,
			material_id TEXT,
			quantity REAL DEFAULT 0,
			deleted_at DATETIME
		)`,
		`CREATE TABLE sales_order_lines (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			product_id TEXT,
			deleted_at DATETIME
		)`,
		`CREATE TABLE bom_items (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			material_id TEXT,
			deleted_at DATETIME
		)`,
		`CREATE TABLE purchase_order_lines (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			material_id TEXT,
			deleted_at DATETIME
		)`,
	}

	for _, statement := range statements {
		require.NoError(t, db.DB.Exec(statement).Error)
	}
}

func newMaterialsAuditHandlerContext(method string, target string, body string) (*gin.Context, *httptest.ResponseRecorder) {
	recorder := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(recorder)
	request := httptest.NewRequest(method, target, strings.NewReader(body))
	request.Header.Set("Content-Type", "application/json")
	request.RemoteAddr = "198.51.100.50:12345"
	ctx.Request = request
	ctx.Set("userId", "handler-user-1")
	ctx.Set("username", "handler-auditor")
	ctx.Set("permissions", []string{authz.PermissionManage})
	return ctx, recorder
}

func TestSaveMaterialHandlerWritesAuditWithActorAndIP(t *testing.T) {
	setupMaterialsAuditHandlerTestDB(t)

	ctx, recorder := newMaterialsAuditHandlerContext(
		http.MethodPost,
		"/api/v1/materials",
		`{"code":"MAT-H-001","name":"Handler Material","category":"RAW_MATERIAL","uom":"PCS","status":"Active","revisionNo":"R1","changeType":"MANUAL"}`,
	)

	SaveMaterialHandler(ctx)

	require.Equal(t, http.StatusOK, recorder.Code, recorder.Body.String())

	var logs []models.AuditLog
	require.NoError(t, db.DB.Find(&logs).Error)
	require.Len(t, logs, 1)
	require.Equal(t, "SAVE", logs[0].Action)
	require.Equal(t, "handler-auditor", logs[0].Operator)
	require.Equal(t, "198.51.100.50", logs[0].IP)
}

func TestBulkSyncMaterialsHandlerWritesAuditWithActorAndIP(t *testing.T) {
	setupMaterialsAuditHandlerTestDB(t)
	seedTime := time.Now().UTC()
	require.NoError(t, db.DB.Exec(`
		INSERT INTO materials (id, code, name, category, uom, status, version, revision_no, change_type, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	`, "mat-handler-existing", "MAT-H-BULK-001", "Old", "RAW_MATERIAL", "PCS", "Active", 2, "R1", "MANUAL", seedTime, seedTime).Error)

	ctx, recorder := newMaterialsAuditHandlerContext(
		http.MethodPost,
		"/api/v1/materials/sync",
		`{"globalVersion":3,"materials":[{"code":"MAT-H-BULK-001","name":"New Name","category":"RAW_MATERIAL","uom":"PCS","status":"Active","revisionNo":"R1","changeType":"MANUAL"},{"code":"MAT-H-BULK-002","name":"Fresh","category":"RAW_MATERIAL","uom":"KG","status":"Active","revisionNo":"R1","changeType":"MANUAL"}]}`,
	)

	BulkSyncMaterialsHandler(ctx)

	require.Equal(t, http.StatusOK, recorder.Code, recorder.Body.String())

	var logs []models.AuditLog
	require.NoError(t, db.DB.Order("target_id asc").Find(&logs).Error)
	require.Len(t, logs, 2)
	for _, log := range logs {
		require.Equal(t, "BULK_SYNC", log.Action)
		require.Equal(t, "handler-auditor", log.Operator)
		require.Equal(t, "198.51.100.50", log.IP)
	}
}

func TestDeleteMaterialHandlerWritesAuditWithActorAndIP(t *testing.T) {
	setupMaterialsAuditHandlerTestDB(t)
	now := time.Now().UTC()
	require.NoError(t, db.DB.Exec(`
		INSERT INTO materials (id, code, name, category, uom, status, version, revision_no, change_type, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	`, "mat-handler-delete", "MAT-H-DEL-001", "Delete By Handler", "RAW_MATERIAL", "PCS", "Active", 1, "R1", "MANUAL", now, now).Error)

	ctx, _ := newMaterialsAuditHandlerContext(http.MethodDelete, "/api/v1/materials/mat-handler-delete", "")
	ctx.Params = gin.Params{{Key: "id", Value: "mat-handler-delete"}}

	DeleteMaterialHandler(ctx)

	require.Equal(t, http.StatusNoContent, ctx.Writer.Status())

	var logs []models.AuditLog
	require.NoError(t, db.DB.Find(&logs).Error)
	require.Len(t, logs, 1)
	require.Equal(t, "DELETE", logs[0].Action)
	require.Equal(t, "handler-auditor", logs[0].Operator)
	require.Equal(t, "198.51.100.50", logs[0].IP)
}

func TestDeleteMaterialHandlerBlockedDoesNotWriteAudit(t *testing.T) {
	setupMaterialsAuditHandlerTestDB(t)
	now := time.Now().UTC()
	require.NoError(t, db.DB.Exec(`
		INSERT INTO materials (id, code, name, category, uom, status, version, revision_no, change_type, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	`, "mat-handler-blocked", "MAT-H-BLOCK-001", "Blocked", "RAW_MATERIAL", "PCS", "Active", 1, "R1", "MANUAL", now, now).Error)
	require.NoError(t, db.DB.Exec(`INSERT INTO inventory (id, material_id, quantity) VALUES (?, ?, ?)`, "inv-handler-1", "mat-handler-blocked", 1).Error)

	ctx, recorder := newMaterialsAuditHandlerContext(http.MethodDelete, "/api/v1/materials/mat-handler-blocked", "")
	ctx.Params = gin.Params{{Key: "id", Value: "mat-handler-blocked"}}

	DeleteMaterialHandler(ctx)

	require.Equal(t, http.StatusForbidden, recorder.Code, recorder.Body.String())

	var count int64
	require.NoError(t, db.DB.Model(&models.AuditLog{}).Count(&count).Error)
	require.Zero(t, count)
}

func TestSaveMaterialHandlerResponseRemainsJSONObject(t *testing.T) {
	setupMaterialsAuditHandlerTestDB(t)

	ctx, recorder := newMaterialsAuditHandlerContext(
		http.MethodPost,
		"/api/v1/materials",
		`{"code":"MAT-H-JSON-001","name":"JSON Material","category":"RAW_MATERIAL","uom":"PCS","status":"Active","revisionNo":"R1","changeType":"MANUAL"}`,
	)

	SaveMaterialHandler(ctx)

	require.Equal(t, http.StatusOK, recorder.Code, recorder.Body.String())
	var payload map[string]any
	require.NoError(t, json.Unmarshal(recorder.Body.Bytes(), &payload))
	require.Equal(t, "MAT-H-JSON-001", payload["code"])
}
