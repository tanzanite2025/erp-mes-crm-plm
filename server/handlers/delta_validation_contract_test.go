package handlers

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"
	"xdfc-server/db"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/stretchr/testify/require"
)

func setupCustomerDeltaValidationTestDB(t *testing.T) {
	t.Helper()
	gin.SetMode(gin.TestMode)
	setupHandlerSQLiteTestDB(t)

	require.NoError(t, db.DB.Exec(`
		CREATE TABLE customers (
			id TEXT PRIMARY KEY NOT NULL,
			name TEXT,
			code TEXT,
			contact_person TEXT,
			contact_phone TEXT,
			email TEXT,
			address TEXT,
			status TEXT,
			credit_limit REAL,
			balance REAL,
			created_at DATETIME,
			updated_at DATETIME,
			is_deleted BOOLEAN DEFAULT FALSE,
			version INTEGER DEFAULT 1
		)
	`).Error)
}

func TestPatchCustomerHandlerRejectsNestedDeltaPath(t *testing.T) {
	setupCustomerDeltaValidationTestDB(t)

	now := time.Now().UTC()
	customerID := uuid.NewString()
	require.NoError(t, db.DB.Exec(`
		INSERT INTO customers (id, name, code, contact_person, contact_phone, email, address, status, credit_limit, balance, created_at, updated_at, is_deleted, version)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	`, customerID, "Acme", "CUST-001", "Alice", "10086", "alice@acme.test", "Shanghai", "Active", 1000.0, 100.0, now, now, false, 2).Error)

	recorder := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(recorder)
	request := httptest.NewRequest(http.MethodPatch, "/api/v1/customers/"+customerID, strings.NewReader(`{"op":"PATCH","delta":{"contactPerson.name":{"o":"Alice","n":"Dora"}},"metadata":{"id":"`+customerID+`","version":2}}`))
	request.Header.Set("Content-Type", "application/json")
	ctx.Params = gin.Params{{Key: "id", Value: customerID}}
	ctx.Request = request

	PatchCustomerHandler(ctx)
	require.Equal(t, http.StatusBadRequest, recorder.Code, recorder.Body.String())

	var response map[string]any
	require.NoError(t, json.Unmarshal(recorder.Body.Bytes(), &response))
	require.Equal(t, "CUSTOMER_PATCH_VALIDATION_FAILED", response["code"])
	require.Contains(t, response["error"], "nested delta path is not supported")
}

func TestPatchInventoryHandlerRejectsNestedDeltaPath(t *testing.T) {
	setupInventoryCommandHandlerTestDB(t)

	materialID := uuid.NewString()
	now := time.Now().Add(-2 * time.Second).UTC()
	recordID := uuid.NewString()
	require.NoError(t, db.DB.Exec(`
		INSERT INTO inventory (id, created_at, updated_at, material_id, material_name, material_code, quantity, total_value, average_unit_cost, category_code, batch_no, uom)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	`, recordID, now, now, materialID, "Tube", "MAT-001", 10.0, 50.0, 5.0, "WH_A", "B-001", "PCS").Error)

	recorder := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(recorder)
	request := httptest.NewRequest(http.MethodPatch, "/api/v1/inventory/"+recordID, strings.NewReader(`{"op":"PATCH","delta":{"material.meta.code":{"o":"MAT-001","n":"MAT-002"}},"metadata":{"id":"`+recordID+`","version":1}}`))
	request.Header.Set("Content-Type", "application/json")
	ctx.Params = gin.Params{{Key: "id", Value: recordID}}
	ctx.Request = request

	PatchInventoryHandler(ctx)
	require.Equal(t, http.StatusBadRequest, recorder.Code, recorder.Body.String())

	var response inventoryErrorResponse
	require.NoError(t, json.Unmarshal(recorder.Body.Bytes(), &response))
	require.Equal(t, "INVENTORY_PATCH_VALIDATION_FAILED", response.Code)
	require.Contains(t, response.Error, "nested delta path is not supported")
}
