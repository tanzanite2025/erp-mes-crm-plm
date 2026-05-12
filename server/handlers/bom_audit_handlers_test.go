package handlers

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"xdfc-server/db"
	"xdfc-server/models"
	"xdfc-server/services"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/require"
)

func setupBOMAuditHandlerTestDB(t *testing.T) {
	t.Helper()
	gin.SetMode(gin.TestMode)
	setupHandlerSQLiteTestDB(t)

	statements := []string{
		`CREATE TABLE bom_sections (
			id TEXT PRIMARY KEY NOT NULL,
			created_at DATETIME,
			updated_at DATETIME,
			deleted_at DATETIME,
			code TEXT NOT NULL,
			name TEXT NOT NULL,
			description TEXT,
			is_system BOOLEAN DEFAULT FALSE,
			active BOOLEAN DEFAULT TRUE,
			sort_order INTEGER DEFAULT 0,
			is_default BOOLEAN DEFAULT FALSE,
			legacy_names TEXT NOT NULL DEFAULT '[]'
		)`,
		`CREATE TABLE products (
			id TEXT PRIMARY KEY NOT NULL,
			created_at DATETIME,
			updated_at DATETIME,
			deleted_at DATETIME,
			sku TEXT,
			name TEXT,
			status TEXT
		)`,
		`CREATE TABLE materials (
			id TEXT PRIMARY KEY NOT NULL,
			created_at DATETIME,
			updated_at DATETIME,
			deleted_at DATETIME,
			code TEXT,
			name TEXT,
			status TEXT
		)`,
		`CREATE TABLE boms (
			id TEXT PRIMARY KEY NOT NULL DEFAULT (lower(hex(randomblob(16)))),
			created_at DATETIME,
			updated_at DATETIME,
			deleted_at DATETIME,
			revision_no TEXT,
			effective_from DATETIME,
			effective_to DATETIME,
			change_type TEXT,
			change_order_no TEXT,
			site_code TEXT,
			is_default_site BOOLEAN DEFAULT FALSE,
			bom_no TEXT,
			product_id TEXT,
			version_text TEXT,
			status TEXT,
			description TEXT,
			relation_sidecar TEXT
		)`,
		`CREATE TABLE bom_items (
			id TEXT PRIMARY KEY NOT NULL,
			bom_id TEXT,
			section TEXT,
			material_id TEXT,
			unit_price REAL DEFAULT 0,
			unit TEXT,
			unit_usage REAL DEFAULT 0,
			wastage_percent REAL DEFAULT 0,
			standard_usage REAL DEFAULT 0,
			material_type TEXT,
			supply_channel TEXT
		)`,
		`CREATE TABLE bom_version_snapshots (
			id TEXT PRIMARY KEY NOT NULL,
			created_at DATETIME,
			updated_at DATETIME,
			deleted_at DATETIME,
			bom_id TEXT NOT NULL,
			product_id TEXT NOT NULL,
			bom_no TEXT NOT NULL,
			version_sequence INTEGER NOT NULL,
			version_text TEXT,
			status TEXT,
			description TEXT,
			revision_no TEXT,
			effective_from DATETIME,
			effective_to DATETIME,
			change_type TEXT,
			change_order_no TEXT,
			site_code TEXT,
			is_default_site BOOLEAN DEFAULT FALSE,
			operation TEXT,
			created_by TEXT,
			snapshot TEXT NOT NULL,
			relation_sidecar TEXT
		)`,
		`CREATE TABLE audit_logs (
			id TEXT PRIMARY KEY NOT NULL,
			module TEXT,
			target_id TEXT,
			action TEXT,
			diff BLOB,
			operator TEXT,
			ip TEXT,
			created_at DATETIME
		)`,
	}

	for _, statement := range statements {
		require.NoError(t, db.DB.Exec(statement).Error)
	}
	require.NoError(t, db.DB.Create(&models.BOMSection{
		BaseModel:   models.BaseModel{ID: "section-prepare"},
		Code:        "MAIN",
		Name:        "主层",
		Active:      true,
		SortOrder:   1,
		IsDefault:   true,
		LegacyNames: json.RawMessage(`[]`),
	}).Error)
}

func newBOMAuditHandlerContext(method string, target string, body string) (*gin.Context, *httptest.ResponseRecorder) {
	recorder := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(recorder)
	request := httptest.NewRequest(method, target, strings.NewReader(body))
	request.Header.Set("Content-Type", "application/json")
	request.RemoteAddr = "198.51.100.88:4567"
	ctx.Request = request
	ctx.Set("userId", "bom-auditor-id")
	ctx.Set("username", "bom-auditor")
	return ctx, recorder
}

func TestSaveBOMHandlerWritesAuditWithActorAndIP(t *testing.T) {
	setupBOMAuditHandlerTestDB(t)

	require.NoError(t, db.DB.Exec(`INSERT INTO products (id, sku, name, status) VALUES (?, ?, ?, ?)`, "product-bom-1", "P-BOM-001", "BOM Product", "active").Error)
	require.NoError(t, db.DB.Exec(`INSERT INTO materials (id, code, name, status) VALUES (?, ?, ?, ?)`, "material-bom-1", "MAT-BOM-001", "Carbon Cloth", "Active").Error)

	ctx, recorder := newBOMAuditHandlerContext(
		http.MethodPost,
		"/api/v1/engineering/bom",
		`{"bomNo":"BOM-AUD-001","productId":"product-bom-1","version":"V1.0","status":"active","description":"handler bom audit","revisionNo":"R1","changeType":"MANUAL","siteCode":"CN","isDefaultSite":true,"relationSidecar":{"kind":"parent_children_protocol","version":"v1","protocolDraft":{"rootChildren":["branch:main"],"branchNodes":[{"id":"branch:main","parentId":"root","children":["branch:main:collection"],"nodeKind":"branch","branchRole":"section","label":"主层","sectionCode":"MAIN","sectionName":"主层"},{"id":"branch:main:collection","parentId":"branch:main","children":["field:seed-1"],"nodeKind":"branch","branchRole":"collection","label":"主层明细","sectionCode":"MAIN","sectionName":"主层"}],"itemNodes":[{"id":"field:seed-1","parentId":"branch:main:collection","children":[],"nodeKind":"item","sectionCode":"MAIN","sectionName":"主层"}]}} ,"items":[{"section":"MAIN","materialId":"material-bom-1","unit":"KG","unitUsage":2.5,"wastagePercent":10,"materialType":"RAW","supplyChannel":"PURCHASE"}]}`,
	)

	SaveBOMHandler(ctx)

	require.Equal(t, http.StatusOK, recorder.Code, recorder.Body.String())

	var payload map[string]any
	require.NoError(t, json.Unmarshal(recorder.Body.Bytes(), &payload))
	require.Equal(t, "BOM-AUD-001", payload["bomNo"])
	require.Equal(t, "handler bom audit", payload["description"])

	var logs []models.AuditLog
	require.NoError(t, db.DB.Order("created_at desc").Find(&logs).Error)
	require.Len(t, logs, 1)
	require.Equal(t, services.AuditModuleBOM, logs[0].Module)
	require.Equal(t, "SAVE", logs[0].Action)
	require.Equal(t, "bom-auditor", logs[0].Operator)
	require.Equal(t, "198.51.100.88", logs[0].IP)

	var snapshots []models.BOMVersionSnapshot
	require.NoError(t, db.DB.Order("created_at desc").Find(&snapshots).Error)
	require.Len(t, snapshots, 1)
	require.Equal(t, "bom-auditor", snapshots[0].CreatedBy)
	require.Equal(t, "SAVE", snapshots[0].Operation)
}
