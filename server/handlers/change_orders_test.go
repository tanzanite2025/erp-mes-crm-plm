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

func setupChangeOrderHandlerTestDB(t *testing.T) {
	t.Helper()

	testDB := setupHandlerSQLiteTestDB(t)
	require.NoError(t, testDB.Exec(`
		CREATE TABLE products (
			id TEXT PRIMARY KEY NOT NULL,
			created_at DATETIME,
			updated_at DATETIME,
			deleted_at DATETIME,
			sku TEXT,
			name TEXT,
			model_code TEXT,
			type_id TEXT,
			depth REAL DEFAULT 0,
			width_internal REAL DEFAULT 0,
			width_external REAL DEFAULT 0,
			tire_type TEXT,
			brake_type TEXT,
			tech_series TEXT,
			version_level TEXT,
			weight REAL DEFAULT 0,
			length REAL DEFAULT 0,
			angle REAL DEFAULT 0,
			clamp TEXT,
			offset REAL DEFAULT 0,
			axle_crown REAL DEFAULT 0,
			steerer TEXT,
			image TEXT,
			restrictions BLOB,
			mold_group TEXT,
			description TEXT,
			engineering_spec_id TEXT,
			technical_specs BLOB,
			barcode_config BLOB,
			attachments BLOB,
			status TEXT,
			revision_no TEXT,
			effective_from DATETIME,
			effective_to DATETIME,
			change_type TEXT,
			change_order_no TEXT,
			site_code TEXT,
			is_default_site BOOLEAN DEFAULT FALSE,
			version INTEGER DEFAULT 1
		)
	`).Error)
	require.NoError(t, testDB.Exec(`CREATE INDEX idx_products_deleted_at ON products(deleted_at)`).Error)

	require.NoError(t, testDB.Exec(`
		CREATE TABLE change_orders (
			id TEXT PRIMARY KEY NOT NULL,
			created_at DATETIME,
			updated_at DATETIME,
			deleted_at DATETIME,
			change_order_no TEXT NOT NULL,
			title TEXT NOT NULL,
			change_type TEXT,
			product_id TEXT,
			site_code TEXT,
			is_default_site BOOLEAN DEFAULT FALSE,
			revision_no TEXT,
			effective_from DATETIME,
			effective_to DATETIME,
			status TEXT,
			description TEXT,
			version INTEGER DEFAULT 1
		)
	`).Error)
	require.NoError(t, testDB.Exec(`CREATE INDEX idx_change_orders_deleted_at ON change_orders(deleted_at)`).Error)
}

func seedChangeOrderFixture(t *testing.T) (models.Product, models.ChangeOrder) {
	t.Helper()

	now := time.Now().UTC().Truncate(time.Second)
	product := models.Product{
		BaseModel: models.BaseModel{ID: uuid.NewString(), CreatedAt: now, UpdatedAt: now},
		SKU:       "PRD-CO-001",
		Name:      "Change Order Product",
		Status:    "active",
		Version:   1,
	}
	require.NoError(t, db.DB.Create(&product).Error)

	productID := product.ID
	changeOrder := models.ChangeOrder{
		BaseModel:     models.BaseModel{ID: uuid.NewString(), CreatedAt: now, UpdatedAt: now},
		ChangeOrderNo: "ECO-001",
		Title:         "Initial ECO",
		ChangeType:    "ECO",
		ProductID:     &productID,
		SiteCode:      "CN",
		IsDefaultSite: false,
		RevisionNo:    "R1",
		EffectiveFrom: &now,
		EffectiveTo:   &now,
		Status:        "draft",
		Description:   "seed description",
		Version:       2,
	}
	require.NoError(t, db.DB.Create(&changeOrder).Error)

	return product, changeOrder
}

func TestGetChangeOrdersHandlerOptionsReturnsMinimalDTO(t *testing.T) {
	gin.SetMode(gin.TestMode)
	setupChangeOrderHandlerTestDB(t)
	_, changeOrder := seedChangeOrderFixture(t)

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(http.MethodGet, "/api/v1/engineering/change-orders?options=true", nil)

	GetChangeOrdersHandler(c)

	require.Equal(t, http.StatusOK, w.Code, w.Body.String())

	var payload []map[string]any
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &payload))
	require.Len(t, payload, 1)

	item := payload[0]
	require.Equal(t, changeOrder.ID, item["id"])
	require.Equal(t, changeOrder.ChangeOrderNo, item["changeOrderNo"])
	require.Equal(t, changeOrder.Title, item["title"])
	require.Equal(t, changeOrder.ChangeType, item["changeType"])
	require.Equal(t, changeOrder.SiteCode, item["siteCode"])
	require.Equal(t, changeOrder.RevisionNo, item["revisionNo"])
	require.Equal(t, changeOrder.Status, item["status"])
	require.NotNil(t, item["productId"])
	require.NotNil(t, item["effectiveFrom"])
	require.NotNil(t, item["effectiveTo"])
	require.NotNil(t, item["_v"])

	_, hasProduct := item["product"]
	_, hasDescription := item["description"]
	_, hasCreatedAt := item["createdAt"]
	_, hasUpdatedAt := item["updatedAt"]
	require.False(t, hasProduct)
	require.False(t, hasDescription)
	require.False(t, hasCreatedAt)
	require.False(t, hasUpdatedAt)
}

func TestGetChangeOrdersHandlerListReturnsPagedDTO(t *testing.T) {
	gin.SetMode(gin.TestMode)
	setupChangeOrderHandlerTestDB(t)
	_, changeOrder := seedChangeOrderFixture(t)

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(http.MethodGet, "/api/v1/engineering/change-orders?page=1&pageSize=10", nil)

	GetChangeOrdersHandler(c)

	require.Equal(t, http.StatusOK, w.Code, w.Body.String())

	var payload map[string]any
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &payload))
	require.Contains(t, payload, "items")
	require.Contains(t, payload, "total")
	require.Contains(t, payload, "page")
	require.Contains(t, payload, "pageSize")

	items, ok := payload["items"].([]any)
	require.True(t, ok)
	require.Len(t, items, 1)

	item, ok := items[0].(map[string]any)
	require.True(t, ok)
	require.Equal(t, changeOrder.ID, item["id"])
	require.Equal(t, changeOrder.Description, item["description"])
	require.NotNil(t, item["createdAt"])
	require.NotNil(t, item["updatedAt"])
	require.NotNil(t, item["_v"])
}

func TestSaveChangeOrderHandlerReturnsChangeOrderAPIDTO(t *testing.T) {
	gin.SetMode(gin.TestMode)
	setupChangeOrderHandlerTestDB(t)
	product, changeOrder := seedChangeOrderFixture(t)

	requestBody := `{
		"id":"` + changeOrder.ID + `",
		"changeOrderNo":"ECO-SAVE-001",
		"title":"Saved ECO",
		"changeType":"ECO",
		"productId":"` + product.ID + `",
		"siteCode":"CN",
		"isDefaultSite":false,
		"revisionNo":"R2",
		"status":"draft",
		"description":"saved description",
		"version":2
	}`

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	request := httptest.NewRequest(http.MethodPost, "/api/v1/engineering/change-orders", strings.NewReader(requestBody))
	request.Header.Set("Content-Type", "application/json")
	c.Request = request

	SaveChangeOrderHandler(c)

	require.Equal(t, http.StatusOK, w.Code, w.Body.String())

	var payload map[string]any
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &payload))
	require.Equal(t, "ECO-SAVE-001", payload["changeOrderNo"])
	require.Equal(t, "Saved ECO", payload["title"])
	require.Equal(t, "saved description", payload["description"])
	require.NotNil(t, payload["createdAt"])
	require.NotNil(t, payload["updatedAt"])
	require.NotNil(t, payload["_v"])
}

func TestSaveChangeOrderHandlerRejectsMissingRequiredFields(t *testing.T) {
	gin.SetMode(gin.TestMode)
	setupChangeOrderHandlerTestDB(t)

	requestBody := `{
		"changeOrderNo":"   ",
		"title":"",
		"changeType":"ECO",
		"status":"draft"
	}`

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	request := httptest.NewRequest(http.MethodPost, "/api/v1/engineering/change-orders", strings.NewReader(requestBody))
	request.Header.Set("Content-Type", "application/json")
	c.Request = request

	SaveChangeOrderHandler(c)

	require.Equal(t, http.StatusBadRequest, w.Code, w.Body.String())
	require.Contains(t, w.Body.String(), "change order number and title are required")
}

func TestSaveChangeOrderHandlerRejectsInvalidPayload(t *testing.T) {
	gin.SetMode(gin.TestMode)
	setupChangeOrderHandlerTestDB(t)

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	request := httptest.NewRequest(http.MethodPost, "/api/v1/engineering/change-orders", strings.NewReader(`{"changeOrderNo":`))
	request.Header.Set("Content-Type", "application/json")
	c.Request = request

	SaveChangeOrderHandler(c)

	require.Equal(t, http.StatusBadRequest, w.Code, w.Body.String())
	require.Contains(t, w.Body.String(), "invalid change order payload")
}

func TestSaveChangeOrderHandlerReturnsConflictOnVersionMismatch(t *testing.T) {
	gin.SetMode(gin.TestMode)
	setupChangeOrderHandlerTestDB(t)
	product, changeOrder := seedChangeOrderFixture(t)

	requestBody := `{
		"id":"` + changeOrder.ID + `",
		"changeOrderNo":"ECO-CONFLICT-001",
		"title":"Conflict ECO",
		"changeType":"ECO",
		"productId":"` + product.ID + `",
		"siteCode":"CN",
		"isDefaultSite":false,
		"revisionNo":"R9",
		"status":"draft",
		"description":"conflict description",
		"version":1
	}`

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	request := httptest.NewRequest(http.MethodPost, "/api/v1/engineering/change-orders", strings.NewReader(requestBody))
	request.Header.Set("Content-Type", "application/json")
	c.Request = request

	SaveChangeOrderHandler(c)

	require.Equal(t, http.StatusConflict, w.Code, w.Body.String())
	require.Contains(t, w.Body.String(), versionConflictMessage)
	require.Contains(t, w.Body.String(), "CONFLICT")
}
