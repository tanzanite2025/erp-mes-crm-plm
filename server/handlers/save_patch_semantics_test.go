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
	"xdfc-server/services"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/stretchr/testify/require"
)

func setupSavePatchSemanticsTestDB(t *testing.T) {
	t.Helper()
	setupHandlerSQLiteTestDB(t)

	schemaStatements := []string{
		`CREATE TABLE units (
			id TEXT PRIMARY KEY NOT NULL,
			created_at DATETIME,
			updated_at DATETIME,
			deleted_at DATETIME,
			code TEXT,
			name TEXT,
			category TEXT,
			precision INTEGER,
			status TEXT,
			is_system BOOLEAN,
			description TEXT
		)`,
		`CREATE TABLE tax_rates (
			id TEXT PRIMARY KEY NOT NULL,
			created_at DATETIME,
			updated_at DATETIME,
			deleted_at DATETIME,
			code TEXT,
			name TEXT,
			rate INTEGER,
			status TEXT,
			description TEXT
		)`,
		`CREATE TABLE sales_orders (
			id TEXT PRIMARY KEY NOT NULL,
			order_no TEXT,
			order_name TEXT,
			customer_name TEXT,
			customer_id TEXT,
			type TEXT,
			currency TEXT,
			exchange_rate_snapshot REAL,
			payment_method TEXT,
			payment_method_name TEXT,
			payment_term TEXT,
			payment_term_name TEXT,
			classification TEXT,
			status TEXT,
			status_note TEXT,
			amount REAL,
			quantity REAL,
			order_date TEXT,
			delivery_date TEXT,
			purchase_order_no TEXT,
			barcode TEXT,
			requirements TEXT,
			evidences BLOB DEFAULT X'5B5D',
			created_at DATETIME,
			updated_at DATETIME,
			deleted_at DATETIME,
			updated_by TEXT,
			is_deleted BOOLEAN,
			version INTEGER
		)`,
	}

	for _, stmt := range schemaStatements {
		require.NoError(t, db.DB.Exec(stmt).Error)
	}
}

func TestSaveUnitHandlerPreservesDescriptionAndSystemFlagOnSparseUpdate(t *testing.T) {
	setupSavePatchSemanticsTestDB(t)
	gin.SetMode(gin.TestMode)

	unitID := uuid.NewString()
	now := time.Now()
	require.NoError(t, db.DB.Exec(`
		INSERT INTO units (id, created_at, updated_at, code, name, category, precision, status, is_system, description)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	`, unitID, now, now, "KG", "Kilogram", "weight", 3, "active", true, "system unit").Error)

	recorder := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(recorder)
	request := httptest.NewRequest(http.MethodPatch, "/api/v1/basic/units/"+unitID, strings.NewReader(`{"id":"`+unitID+`","name":"Kilogram Updated"}`))
	request.Header.Set("Content-Type", "application/json")
	ctx.Request = request
	SaveUnitHandler(ctx)

	require.Equal(t, http.StatusOK, recorder.Code, recorder.Body.String())

	var persisted models.Unit
	require.NoError(t, db.DB.Where("id = ?", unitID).First(&persisted).Error)
	require.Equal(t, "Kilogram Updated", persisted.Name)
	require.Equal(t, "KG", persisted.Code)
	require.Equal(t, "weight", persisted.Category)
	require.Equal(t, 3, persisted.Precision)
	require.Equal(t, "system unit", persisted.Description)
	require.True(t, persisted.IsSystem)
}

func TestPatchUnitHandlerSupportsDeltaPayloadAndNormalizesCategory(t *testing.T) {
	setupSavePatchSemanticsTestDB(t)
	gin.SetMode(gin.TestMode)

	unitID := uuid.NewString()
	now := time.Now()
	require.NoError(t, db.DB.Exec(`
		INSERT INTO units (id, created_at, updated_at, code, name, category, precision, status, is_system, description)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	`, unitID, now, now, "CBM", "Cubic Meter", "weight", 3, "active", false, "volume unit").Error)

	payload := services.SDRTSDeltaHandlerRequest{
		Op: "PATCH",
		Delta: map[string]json.RawMessage{
			"category": json.RawMessage(`{"o":"weight","n":"闂堛垻袧"}`),
			"name":     json.RawMessage(`{"o":"Cubic Meter","n":"Square Meter"}`),
		},
		Metadata: services.SDRTSDeltaMetadata{ID: unitID, Version: 1},
	}
	body, err := json.Marshal(payload)
	require.NoError(t, err)

	recorder := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(recorder)
	request := httptest.NewRequest(http.MethodPatch, "/api/v1/basic/units/"+unitID, strings.NewReader(string(body)))
	request.Header.Set("Content-Type", "application/json")
	ctx.Request = request
	ctx.Params = gin.Params{{Key: "id", Value: unitID}}
	ctx.Set("permissions", []string{authz.PermissionManage})

	PatchUnitHandler(ctx)

	require.Equal(t, http.StatusOK, recorder.Code, recorder.Body.String())

	var persisted models.Unit
	require.NoError(t, db.DB.Where("id = ?", unitID).First(&persisted).Error)
	require.Equal(t, "Square Meter", persisted.Name)
	require.Equal(t, "AREA", persisted.Category)
	require.Equal(t, "volume unit", persisted.Description)
}

func TestPatchUnitHandlerReturnsForbiddenWithoutManagePermission(t *testing.T) {
	setupSavePatchSemanticsTestDB(t)
	gin.SetMode(gin.TestMode)

	unitID := uuid.NewString()
	now := time.Now()
	require.NoError(t, db.DB.Exec(`
		INSERT INTO units (id, created_at, updated_at, code, name, category, precision, status, is_system, description)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	`, unitID, now, now, "KG", "Kilogram", "weight", 3, "active", true, "system unit").Error)

	payload := services.SDRTSDeltaHandlerRequest{
		Op: "PATCH",
		Delta: map[string]json.RawMessage{
			"name": json.RawMessage(`{"o":"Kilogram","n":"Hijacked"}`),
		},
		Metadata: services.SDRTSDeltaMetadata{ID: unitID, Version: 1},
	}
	body, err := json.Marshal(payload)
	require.NoError(t, err)

	recorder := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(recorder)
	request := httptest.NewRequest(http.MethodPatch, "/api/v1/basic/units/"+unitID, strings.NewReader(string(body)))
	request.Header.Set("Content-Type", "application/json")
	ctx.Request = request
	ctx.Params = gin.Params{{Key: "id", Value: unitID}}

	PatchUnitHandler(ctx)

	require.Equal(t, http.StatusForbidden, recorder.Code, recorder.Body.String())
	require.Contains(t, recorder.Body.String(), "insufficient permissions")

	var persisted models.Unit
	require.NoError(t, db.DB.Where("id = ?", unitID).First(&persisted).Error)
	require.Equal(t, "Kilogram", persisted.Name)
}

func TestGetUnitsHandlerNormalizesHistoricalCategories(t *testing.T) {
	setupSavePatchSemanticsTestDB(t)
	gin.SetMode(gin.TestMode)

	now := time.Now()
	require.NoError(t, db.DB.Exec(`
		INSERT INTO units (id, created_at, updated_at, code, name, category, precision, status, is_system, description)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	`, uuid.NewString(), now, now, "KG", "Kilogram", "weight", 3, "active", true, "weight unit").Error)
	require.NoError(t, db.DB.Exec(`
		INSERT INTO units (id, created_at, updated_at, code, name, category, precision, status, is_system, description)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	`, uuid.NewString(), now, now, "M2", "Square Meter", "闂堛垻袧", 2, "active", false, "area unit").Error)

	recorder := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(recorder)
	request := httptest.NewRequest(http.MethodGet, "/api/v1/basic/units", nil)
	ctx.Request = request

	GetUnitsHandler(ctx)

	require.Equal(t, http.StatusOK, recorder.Code, recorder.Body.String())

	var response []models.Unit
	require.NoError(t, json.Unmarshal(recorder.Body.Bytes(), &response))
	require.Len(t, response, 2)

	categoryByCode := make(map[string]string, len(response))
	for _, unit := range response {
		categoryByCode[unit.Code] = unit.Category
	}

	require.Equal(t, "WEIGHT", categoryByCode["KG"])
	require.Equal(t, "AREA", categoryByCode["M2"])
}

func TestDeleteUnitHandlerDoesNotPanicWhenRedisIsNil(t *testing.T) {
	setupSavePatchSemanticsTestDB(t)
	gin.SetMode(gin.TestMode)

	previousRDB := db.RDB
	db.RDB = nil
	t.Cleanup(func() {
		db.RDB = previousRDB
	})

	unitID := uuid.NewString()
	now := time.Now()
	require.NoError(t, db.DB.Exec(`
		INSERT INTO units (id, created_at, updated_at, code, name, category, precision, status, is_system, description)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	`, unitID, now, now, "PCS", "Pieces", "quantity", 0, "active", false, "count unit").Error)

	recorder := httptest.NewRecorder()
	router := gin.New()
	router.Use(func(c *gin.Context) {
		c.Set("permissions", []string{authz.PermissionManage})
		c.Next()
	})
	router.DELETE("/api/v1/basic/units/:id", DeleteUnitHandler)
	request := httptest.NewRequest(http.MethodDelete, "/api/v1/basic/units/"+unitID, nil)

	require.NotPanics(t, func() {
		router.ServeHTTP(recorder, request)
	})
	require.Equal(t, http.StatusNoContent, recorder.Code, recorder.Body.String())

	var count int64
	require.NoError(t, db.DB.Model(&models.Unit{}).Where("id = ?", unitID).Count(&count).Error)
	require.Equal(t, int64(0), count)
}

func TestDeleteUnitHandlerReturnsForbiddenWithoutManagePermission(t *testing.T) {
	setupSavePatchSemanticsTestDB(t)
	gin.SetMode(gin.TestMode)

	unitID := uuid.NewString()
	now := time.Now()
	require.NoError(t, db.DB.Exec(`
		INSERT INTO units (id, created_at, updated_at, code, name, category, precision, status, is_system, description)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	`, unitID, now, now, "PCS", "Pieces", "quantity", 0, "active", false, "count unit").Error)

	recorder := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(recorder)
	request := httptest.NewRequest(http.MethodDelete, "/api/v1/basic/units/"+unitID, nil)
	ctx.Request = request
	ctx.Params = gin.Params{{Key: "id", Value: unitID}}

	DeleteUnitHandler(ctx)

	require.Equal(t, http.StatusForbidden, recorder.Code, recorder.Body.String())
	require.Contains(t, recorder.Body.String(), "insufficient permissions")

	var count int64
	require.NoError(t, db.DB.Model(&models.Unit{}).Where("id = ?", unitID).Count(&count).Error)
	require.Equal(t, int64(1), count)
}

func TestSaveTaxRateHandlerPreservesDescriptionOnSparseUpdate(t *testing.T) {
	setupSavePatchSemanticsTestDB(t)
	gin.SetMode(gin.TestMode)

	taxID := uuid.NewString()
	now := time.Now()
	require.NoError(t, db.DB.Exec(`
		INSERT INTO tax_rates (id, created_at, updated_at, code, name, rate, status, description)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?)
	`, taxID, now, now, "VAT13", "VAT 13", 13, "Active", "existing description").Error)

	recorder := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(recorder)
	request := httptest.NewRequest(http.MethodPatch, "/api/v1/finance/tax-rates/"+taxID, strings.NewReader(`{"id":"`+taxID+`","name":"VAT 13 Updated"}`))
	request.Header.Set("Content-Type", "application/json")
	ctx.Request = request
	SaveTaxRate(ctx)

	require.Equal(t, http.StatusOK, recorder.Code, recorder.Body.String())

	var persisted models.TaxRate
	require.NoError(t, db.DB.Where("id = ?", taxID).First(&persisted).Error)
	require.Equal(t, "VAT 13 Updated", persisted.Name)
	require.Equal(t, "VAT13", persisted.Code)
	require.Equal(t, 13, persisted.Rate)
	require.Equal(t, "existing description", persisted.Description)
}

func TestSaveSalesOrderForBulkSyncPreservesRequirementsOnSparseUpdate(t *testing.T) {
	setupSavePatchSemanticsTestDB(t)

	orderID := uuid.NewString()
	now := time.Now()
	require.NoError(t, db.DB.Exec(`
		INSERT INTO sales_orders (id, order_no, order_name, customer_name, customer_id, type, currency, classification, status, status_note, amount, quantity, order_date, delivery_date, purchase_order_no, barcode, requirements, created_at, updated_at, updated_by, is_deleted, version)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	`, orderID, "SO-001", "Original", "Customer", "cust-1", "standard", "CNY", "A", "Draft", "existing note", 100.0, 10.0, "2026-04-01", "2026-04-10", "PO-1", "BAR-1", "keep-me", now, now, "alice", false, 3).Error)

	testDB := db.DB

	err := services.SaveSalesOrderForBulkSync(testDB, &models.SalesOrder{
		ID:           orderID,
		OrderNo:      "SO-001",
		OrderName:    "Updated",
		CustomerName: "Customer",
		CustomerID:   "cust-1",
		Type:         "standard",
		Currency:     "CNY",
		Status:       "Released",
		Amount:       120.0,
		Quantity:     12.0,
		OrderDate:    "2026-04-01",
		DeliveryDate: "2026-04-12",
		Version:      4,
	})
	require.NoError(t, err)

	var persisted models.SalesOrder
	require.NoError(t, db.DB.Where("id = ?", orderID).First(&persisted).Error)
	require.Equal(t, "Updated", persisted.OrderName)
	require.Equal(t, "keep-me", persisted.Requirements)
}
