package handlers

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/glebarez/sqlite"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
	"xdfc-server/db"
)

func setupPackagingRuleTestDB(t *testing.T) *gorm.DB {
	t.Helper()

	testDB, err := gorm.Open(sqlite.Open(fmt.Sprintf("file:%s?mode=memory&cache=shared", t.Name())), &gorm.Config{})
	require.NoError(t, err)
	require.NoError(t, testDB.Exec(`
		CREATE TABLE materials (
			id TEXT PRIMARY KEY,
			deleted_at DATETIME,
			code TEXT NOT NULL,
			name TEXT NOT NULL,
			category TEXT,
			uom TEXT,
			status TEXT
		)
	`).Error)
	require.NoError(t, testDB.Exec(`
		CREATE TABLE packaging_rules (
			id TEXT PRIMARY KEY,
			material_id TEXT NOT NULL UNIQUE,
			pack_unit TEXT NOT NULL,
			base_unit TEXT NOT NULL,
			conversion_factor REAL NOT NULL,
			direction TEXT,
			updated_at DATETIME
		)
	`).Error)

	db.DB = testDB
	gin.SetMode(gin.TestMode)

	return testDB
}

func createPackagingRuleTestMaterial(t *testing.T, testDB *gorm.DB, id string) {
	t.Helper()

	require.NoError(t, testDB.Exec(
		"INSERT INTO materials (id, code, name, category, uom, status) VALUES (?, ?, ?, ?, ?, ?)",
		id, "MAT-"+id, "Material "+id, "PACKAGING", "pcs", "Active",
	).Error)
}

func performSavePackagingRuleRequest(t *testing.T, payload any) *httptest.ResponseRecorder {
	t.Helper()

	body, err := json.Marshal(payload)
	require.NoError(t, err)

	req := httptest.NewRequest(http.MethodPost, "/packaging", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	ctx, _ := gin.CreateTestContext(w)
	ctx.Request = req
	SavePackagingRuleHandler(ctx)

	return w
}

func TestSavePackagingRuleHandlerRejectsDuplicateMaterialCreate(t *testing.T) {
	testDB := setupPackagingRuleTestDB(t)
	createPackagingRuleTestMaterial(t, testDB, "mat-1")

	require.NoError(t, testDB.Exec(
		"INSERT INTO packaging_rules (id, material_id, pack_unit, base_unit, conversion_factor, direction) VALUES (?, ?, ?, ?, ?, ?)",
		"rule-1", "mat-1", "box", "pcs", 10, "forward",
	).Error)

	w := performSavePackagingRuleRequest(t, map[string]any{
		"materialId":       "mat-1",
		"packUnit":         "carton",
		"baseUnit":         "pcs",
		"conversionFactor": 20,
		"direction":        "forward",
	})

	require.Equal(t, http.StatusConflict, w.Code)
	require.Contains(t, w.Body.String(), "PACKAGING_RULE_DUPLICATE_MATERIAL")
}

func TestSavePackagingRuleHandlerRejectsDuplicateMaterialUpdate(t *testing.T) {
	testDB := setupPackagingRuleTestDB(t)
	createPackagingRuleTestMaterial(t, testDB, "mat-1")
	createPackagingRuleTestMaterial(t, testDB, "mat-2")

	require.NoError(t, testDB.Exec(
		"INSERT INTO packaging_rules (id, material_id, pack_unit, base_unit, conversion_factor, direction) VALUES (?, ?, ?, ?, ?, ?)",
		"rule-1", "mat-1", "box", "pcs", 10, "forward",
	).Error)
	require.NoError(t, testDB.Exec(
		"INSERT INTO packaging_rules (id, material_id, pack_unit, base_unit, conversion_factor, direction) VALUES (?, ?, ?, ?, ?, ?)",
		"rule-2", "mat-2", "bag", "pcs", 5, "forward",
	).Error)

	w := performSavePackagingRuleRequest(t, map[string]any{
		"id":               "rule-2",
		"materialId":       "mat-1",
		"packUnit":         "bag",
		"baseUnit":         "pcs",
		"conversionFactor": 6,
		"direction":        "forward",
	})

	require.Equal(t, http.StatusConflict, w.Code)
	require.Contains(t, w.Body.String(), "PACKAGING_RULE_DUPLICATE_MATERIAL")
}

func TestSavePackagingRuleHandlerAllowsUpdatingSameRule(t *testing.T) {
	testDB := setupPackagingRuleTestDB(t)
	createPackagingRuleTestMaterial(t, testDB, "mat-1")

	require.NoError(t, testDB.Exec(
		"INSERT INTO packaging_rules (id, material_id, pack_unit, base_unit, conversion_factor, direction) VALUES (?, ?, ?, ?, ?, ?)",
		"rule-1", "mat-1", "box", "pcs", 10, "forward",
	).Error)

	w := performSavePackagingRuleRequest(t, map[string]any{
		"id":               "rule-1",
		"materialId":       "mat-1",
		"packUnit":         "carton",
		"baseUnit":         "pcs",
		"conversionFactor": 12,
		"direction":        "forward",
	})

	require.Equal(t, http.StatusOK, w.Code)

	var saved struct {
		PackUnit         string
		ConversionFactor float64
	}
	require.NoError(t, testDB.Table("packaging_rules").Select("pack_unit, conversion_factor").Where("id = ?", "rule-1").Scan(&saved).Error)
	require.Equal(t, "carton", saved.PackUnit)
	require.Equal(t, 12.0, saved.ConversionFactor)
}
