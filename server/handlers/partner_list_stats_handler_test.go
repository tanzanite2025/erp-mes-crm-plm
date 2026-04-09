package handlers

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"
	"xdfc-server/db"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/stretchr/testify/require"
)

type partnerListStatsResponse struct {
	Items    []json.RawMessage `json:"items"`
	Total    int64             `json:"total"`
	Page     int               `json:"page"`
	PageSize int               `json:"pageSize"`
	Metadata struct {
		Pagination struct {
			Total    int64 `json:"total"`
			Page     int   `json:"page"`
			PageSize int   `json:"pageSize"`
		} `json:"pagination"`
		Stats map[string]int64 `json:"stats"`
	} `json:"metadata"`
}

func setupPartnerListStatsHandlerTestDB(t *testing.T) {
	t.Helper()
	gin.SetMode(gin.TestMode)
	setupHandlerSQLiteTestDB(t)

	schemaStatements := []string{
		`CREATE TABLE customers (
			id TEXT PRIMARY KEY,
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
		)`,
		`CREATE TABLE suppliers (
			id TEXT PRIMARY KEY,
			name TEXT,
			code TEXT,
			category TEXT,
			main_products TEXT,
			contact_person TEXT,
			contact_phone TEXT,
			email TEXT,
			address TEXT,
			status TEXT,
			rating REAL,
			created_at DATETIME,
			updated_at DATETIME,
			is_deleted BOOLEAN DEFAULT FALSE,
			version INTEGER DEFAULT 1
		)`,
	}

	for _, stmt := range schemaStatements {
		require.NoError(t, db.DB.Exec(stmt).Error)
	}
}

func TestGetCustomersHandlerReturnsMetadataStats(t *testing.T) {
	setupPartnerListStatsHandlerTestDB(t)

	now := time.Now().UTC()
	startOfMonth := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, time.UTC)
	lastMonth := startOfMonth.Add(-24 * time.Hour)

	require.NoError(t, db.DB.Exec(`
		INSERT INTO customers (id, name, code, contact_person, contact_phone, email, address, status, credit_limit, balance, created_at, updated_at, is_deleted, version)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	`, uuid.NewString(), "Active New Customer", "CUST-001", "Alice", "13800000001", "a@example.com", "Addr-1", "Active", 1000, 0, now, now, false, 1).Error)
	require.NoError(t, db.DB.Exec(`
		INSERT INTO customers (id, name, code, contact_person, contact_phone, email, address, status, credit_limit, balance, created_at, updated_at, is_deleted, version)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	`, uuid.NewString(), "Inactive Old Customer", "CUST-002", "Bob", "13800000002", "b@example.com", "Addr-2", "Inactive", 1000, 0, lastMonth, lastMonth, false, 1).Error)
	require.NoError(t, db.DB.Exec(`
		INSERT INTO customers (id, name, code, contact_person, contact_phone, email, address, status, credit_limit, balance, created_at, updated_at, is_deleted, version)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	`, uuid.NewString(), "Deleted Customer", "CUST-003", "Carol", "13800000003", "c@example.com", "Addr-3", "Active", 1000, 0, now, now, true, 1).Error)

	recorder := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(recorder)
	ctx.Request = httptest.NewRequest(http.MethodGet, "/api/v1/customers?page=1&pageSize=10", nil)

	GetCustomersHandler(ctx)
	require.Equal(t, http.StatusOK, recorder.Code, recorder.Body.String())

	var response partnerListStatsResponse
	require.NoError(t, json.Unmarshal(recorder.Body.Bytes(), &response))
	require.Equal(t, int64(2), response.Total)
	require.Equal(t, 1, response.Page)
	require.Equal(t, 10, response.PageSize)
	require.Len(t, response.Items, 2)
	require.Equal(t, int64(2), response.Metadata.Pagination.Total)
	require.Equal(t, 1, response.Metadata.Pagination.Page)
	require.Equal(t, 10, response.Metadata.Pagination.PageSize)
	require.Equal(t, int64(2), response.Metadata.Stats["total"])
	require.Equal(t, int64(1), response.Metadata.Stats["active"])
	require.Equal(t, int64(1), response.Metadata.Stats["newThisMonth"])
}

func TestGetSuppliersHandlerReturnsMetadataStats(t *testing.T) {
	setupPartnerListStatsHandlerTestDB(t)

	now := time.Now().UTC()

	require.NoError(t, db.DB.Exec(`
		INSERT INTO suppliers (id, name, code, category, main_products, contact_person, contact_phone, email, address, status, rating, created_at, updated_at, is_deleted, version)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	`, uuid.NewString(), "Active Supplier", "SUP-001", "Metal", "[]", "Alice", "13800000101", "sa@example.com", "Addr-1", "Active", 4.5, now, now, false, 1).Error)
	require.NoError(t, db.DB.Exec(`
		INSERT INTO suppliers (id, name, code, category, main_products, contact_person, contact_phone, email, address, status, rating, created_at, updated_at, is_deleted, version)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	`, uuid.NewString(), "Review Supplier", "SUP-002", "Chem", "[]", "Bob", "13800000102", "sb@example.com", "Addr-2", "OnReview", 4.2, now, now, false, 1).Error)
	require.NoError(t, db.DB.Exec(`
		INSERT INTO suppliers (id, name, code, category, main_products, contact_person, contact_phone, email, address, status, rating, created_at, updated_at, is_deleted, version)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	`, uuid.NewString(), "Deleted Supplier", "SUP-003", "Equip", "[]", "Carol", "13800000103", "sc@example.com", "Addr-3", "Active", 4.8, now, now, true, 1).Error)

	recorder := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(recorder)
	ctx.Request = httptest.NewRequest(http.MethodGet, "/api/v1/suppliers?page=1&pageSize=10", nil)

	GetSuppliersHandler(ctx)
	require.Equal(t, http.StatusOK, recorder.Code, recorder.Body.String())

	var response partnerListStatsResponse
	require.NoError(t, json.Unmarshal(recorder.Body.Bytes(), &response))
	require.Equal(t, int64(2), response.Total)
	require.Equal(t, 1, response.Page)
	require.Equal(t, 10, response.PageSize)
	require.Len(t, response.Items, 2)
	require.Equal(t, int64(2), response.Metadata.Pagination.Total)
	require.Equal(t, 1, response.Metadata.Pagination.Page)
	require.Equal(t, 10, response.Metadata.Pagination.PageSize)
	require.Equal(t, int64(2), response.Metadata.Stats["total"])
	require.Equal(t, int64(1), response.Metadata.Stats["active"])
	require.Equal(t, int64(1), response.Metadata.Stats["pendingReview"])
}
