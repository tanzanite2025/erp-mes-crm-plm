package handlers

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"xdfc-server/authz"
	"xdfc-server/db"
	"xdfc-server/models"
	"xdfc-server/services"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/require"
)

func TestNormalizeGlobalSearchHref_RewritesRetiredSystemRoutingEntry(t *testing.T) {
	require.Equal(
		t,
		"/approval/routing",
		normalizeGlobalSearchHref("/system-management/routing"),
	)
}

func TestNormalizeGlobalSearchHref_LeavesOtherRoutesUntouched(t *testing.T) {
	require.Equal(t, "/inventory", normalizeGlobalSearchHref("/inventory"))
	require.Equal(t, "/approval", normalizeGlobalSearchHref("/approval"))
}

func TestNewGlobalSearchItemResponse_UsesCategoryMetaCatalog(t *testing.T) {
	item := newGlobalSearchItemResponse(
		"order-1",
		"Road Bike Order",
		"SO-001",
		services.SearchCategorySalesOrder,
		0.98,
	)

	require.Equal(t, "order-1", item.ID)
	require.Equal(t, "Road Bike Order", item.Title)
	require.Equal(t, "SO-001", item.Code)
	require.Equal(t, services.SearchCategorySalesOrder, item.Category)
	require.Equal(t, "/trading/sales-orders", item.Href)
	require.Equal(t, "销售订单 / Sales Orders", item.ParentTitle)
	require.Equal(t, float32(0.98), item.Score)
}

func TestMapSalesOrderToGlobalSearchItem_BuildsDetailHref(t *testing.T) {
	item := mapSalesOrderToGlobalSearchItem(
		models.SalesOrder{
			ID:           "order-1",
			OrderNo:      "SO-001",
			OrderName:    "Road Bike Order",
			CustomerName: "Acme",
		},
		0.91,
	)

	require.Equal(t, "Road Bike Order", item.Title)
	require.Equal(t, "SO-001", item.Code)
	require.Equal(t, "/trading/sales-orders?detailId=order-1&search=SO-001", item.Href)
}

func TestMapApprovalRequestToGlobalSearchItem_BuildsRequestHref(t *testing.T) {
	item := mapApprovalRequestToGlobalSearchItem(
		models.ApprovalRequest{
			BaseModel: models.BaseModel{ID: "approval-1"},
			TargetID:  "order-1",
			Reason:    "Approval pending",
			Module:    "Sales",
			Action:    "ORDER_APPROVAL",
		},
		0.83,
	)

	require.Equal(t, "Approval pending", item.Title)
	require.Equal(t, "order-1", item.Code)
	require.Equal(t, "/approval/requests?requestId=approval-1", item.Href)
}

func TestMapPurchaseOrderToGlobalSearchItem_BuildsDetailHref(t *testing.T) {
	item := mapPurchaseOrderToGlobalSearchItem(
		models.PurchaseOrder{
			ID:           "purchase-1",
			OrderNo:      "PO-001",
			SupplierName: "Bright Supplier",
		},
		0.87,
	)

	require.Equal(t, "Bright Supplier", item.Title)
	require.Equal(t, "PO-001", item.Code)
	require.Equal(t, "/purchase/orders?detailId=purchase-1&search=PO-001", item.Href)
}

func TestMapSupplierToGlobalSearchItem_BuildsDetailHref(t *testing.T) {
	item := mapSupplierToGlobalSearchItem(
		models.Supplier{
			ID:   "supplier-1",
			Code: "SUP-001",
			Name: "Bright Supplier",
		},
		0.86,
	)

	require.Equal(t, "Bright Supplier", item.Title)
	require.Equal(t, "SUP-001", item.Code)
	require.Equal(t, "/purchase/suppliers?detailId=supplier-1&search=SUP-001", item.Href)
}

func TestMapGlobalSearchMatches_PreservesSearchOrderAcrossCategories(t *testing.T) {
	results := mapGlobalSearchMatches(
		[]globalSearchMatch{
			{ID: "approval-1", Category: services.SearchCategoryApprovalRequest, Score: 0.95},
			{ID: "purchase-1", Category: services.SearchCategoryPurchaseOrder, Score: 0.93},
			{ID: "supplier-1", Category: services.SearchCategorySupplier, Score: 0.92},
			{ID: "order-1", Category: services.SearchCategorySalesOrder, Score: 0.91},
			{ID: "inv-1", Category: services.SearchCategoryInventory, Score: 0.88},
			{ID: "missing", Category: services.SearchCategorySalesOrder, Score: 0.80},
		},
		map[string]models.Inventory{
			"inv-1": {
				BaseModel:    models.BaseModel{ID: "inv-1"},
				MaterialName: "Nickel Plate",
				MaterialCode: "MAT-001",
			},
		},
		map[string]models.SalesOrder{
			"order-1": {
				ID:        "order-1",
				OrderNo:   "SO-001",
				OrderName: "Road Bike Order",
			},
		},
		map[string]models.PurchaseOrder{
			"purchase-1": {
				ID:           "purchase-1",
				OrderNo:      "PO-001",
				SupplierName: "Bright Supplier",
			},
		},
		map[string]models.Supplier{
			"supplier-1": {
				ID:   "supplier-1",
				Code: "SUP-001",
				Name: "Bright Supplier",
			},
		},
		map[string]models.ApprovalRequest{
			"approval-1": {
				BaseModel: models.BaseModel{ID: "approval-1"},
				TargetID:  "order-1",
				Reason:    "Approval pending",
			},
		},
	)

	require.Len(t, results, 5)
	require.Equal(t, "approval-1", results[0].ID)
	require.Equal(t, float32(0.95), results[0].Score)
	require.Equal(t, "purchase-1", results[1].ID)
	require.Equal(t, float32(0.93), results[1].Score)
	require.Equal(t, "supplier-1", results[2].ID)
	require.Equal(t, float32(0.92), results[2].Score)
	require.Equal(t, "order-1", results[3].ID)
	require.Equal(t, float32(0.91), results[3].Score)
	require.Equal(t, "inv-1", results[4].ID)
	require.Equal(t, float32(0.88), results[4].Score)
}

func TestGlobalSearchHandlerFiltersHydrationByCategoryPermissions(t *testing.T) {
	setupGlobalSearchHydrationTestDB(t)
	require.NoError(t, db.DB.Exec(`INSERT INTO inventory (id, material_id, material_name, material_code, category_code) VALUES (?, ?, ?, ?, ?)`, "inv-visible", "mat-1", "Visible Stock", "INV-001", "RAW").Error)
	require.NoError(t, db.DB.Exec(`INSERT INTO sales_orders (id, order_no, order_name, customer_name) VALUES (?, ?, ?, ?)`, "sales-hidden", "SO-SECRET", "Hidden Sales Order", "Sensitive Customer").Error)
	require.NoError(t, db.DB.Exec(`INSERT INTO purchase_orders (id, order_no, supplier_name) VALUES (?, ?, ?)`, "purchase-hidden", "PO-SECRET", "Hidden Purchase Order").Error)
	require.NoError(t, db.DB.Exec(`INSERT INTO suppliers (id, code, name) VALUES (?, ?, ?)`, "supplier-hidden", "SUP-SECRET", "Hidden Supplier").Error)
	require.NoError(t, db.DB.Exec(`INSERT INTO approval_requests (id, requester_id, approver1_id, approver2_id, target_id, reason) VALUES (?, ?, ?, ?, ?, ?)`, "approval-hidden", "00000000-0000-0000-0000-000000000001", "00000000-0000-0000-0000-000000000002", "00000000-0000-0000-0000-000000000003", "SO-SECRET", "Hidden Approval").Error)

	router := setupGlobalSearchHandlerRouter(t, "warehouse-user", []string{authz.MenuWarehouse}, []map[string]any{
		{"id": "sales-hidden", "category": services.SearchCategorySalesOrder, "score": 0.99},
		{"id": "approval-hidden", "category": services.SearchCategoryApprovalRequest, "score": 0.98},
		{"id": "purchase-hidden", "category": services.SearchCategoryPurchaseOrder, "score": 0.97},
		{"id": "supplier-hidden", "category": services.SearchCategorySupplier, "score": 0.96},
		{"id": "inv-visible", "category": services.SearchCategoryInventory, "score": 0.95},
	})

	recorder := httptest.NewRecorder()
	router.ServeHTTP(recorder, httptest.NewRequest(http.MethodGet, "/global-search?q=secret", nil))
	require.Equal(t, http.StatusOK, recorder.Code)

	var payload struct {
		Data []GlobalSearchItemResponse `json:"data"`
	}
	require.NoError(t, json.Unmarshal(recorder.Body.Bytes(), &payload))
	require.Len(t, payload.Data, 1)
	require.Equal(t, services.SearchCategoryInventory, payload.Data[0].Category)
	require.Equal(t, "inv-visible", payload.Data[0].ID)
	require.NotContains(t, recorder.Body.String(), "SO-SECRET")
	require.NotContains(t, recorder.Body.String(), "Hidden Approval")
	require.NotContains(t, recorder.Body.String(), "SUP-SECRET")
}

func TestGlobalSearchHandlerScopesApprovalHydrationToCurrentUser(t *testing.T) {
	setupGlobalSearchHydrationTestDB(t)
	currentUserID := "11111111-1111-1111-1111-111111111111"
	require.NoError(t, db.DB.Exec(`INSERT INTO approval_requests (id, requester_id, approver1_id, approver2_id, target_id, reason) VALUES (?, ?, ?, ?, ?, ?)`, "approval-visible", "22222222-2222-2222-2222-222222222222", currentUserID, "33333333-3333-3333-3333-333333333333", "SO-001", "Visible Approval").Error)
	require.NoError(t, db.DB.Exec(`INSERT INTO approval_requests (id, requester_id, approver1_id, approver2_id, target_id, reason) VALUES (?, ?, ?, ?, ?, ?)`, "approval-hidden", "44444444-4444-4444-4444-444444444444", "55555555-5555-5555-5555-555555555555", "66666666-6666-6666-6666-666666666666", "SO-SECRET", "Hidden Approval").Error)

	router := setupGlobalSearchHandlerRouter(t, currentUserID, []string{authz.MenuApproval}, []map[string]any{
		{"id": "approval-hidden", "category": services.SearchCategoryApprovalRequest, "score": 0.99},
		{"id": "approval-visible", "category": services.SearchCategoryApprovalRequest, "score": 0.98},
	})

	recorder := httptest.NewRecorder()
	router.ServeHTTP(recorder, httptest.NewRequest(http.MethodGet, "/global-search?q=approval", nil))
	require.Equal(t, http.StatusOK, recorder.Code)

	var payload struct {
		Data []GlobalSearchItemResponse `json:"data"`
	}
	require.NoError(t, json.Unmarshal(recorder.Body.Bytes(), &payload))
	require.Len(t, payload.Data, 1)
	require.Equal(t, "approval-visible", payload.Data[0].ID)
	require.Equal(t, "Visible Approval", payload.Data[0].Title)
	require.NotContains(t, recorder.Body.String(), "Hidden Approval")
}

func setupGlobalSearchHandlerRouter(t *testing.T, userID string, permissions []string, items []map[string]any) *gin.Engine {
	t.Helper()
	previousClient := services.GlobalSearchClient
	searchServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		require.Equal(t, "/v1/search", r.URL.Path)
		require.NotEmpty(t, r.URL.Query().Get("q"))
		w.Header().Set("Content-Type", "application/json")
		require.NoError(t, json.NewEncoder(w).Encode(map[string]any{"items": items}))
	}))
	t.Cleanup(func() {
		services.GlobalSearchClient = previousClient
		searchServer.Close()
	})
	services.GlobalSearchClient = &services.SearchServiceClient{
		BaseURL:    searchServer.URL,
		HTTPClient: searchServer.Client(),
	}

	gin.SetMode(gin.TestMode)
	router := gin.New()
	router.Use(func(c *gin.Context) {
		c.Set("userId", userID)
		c.Set("permissions", permissions)
		c.Next()
	})
	router.GET("/global-search", GlobalSearchHandler)
	return router
}

func setupGlobalSearchHydrationTestDB(t *testing.T) {
	t.Helper()
	setupHandlerSQLiteTestDB(t)
	statements := []string{
		`CREATE TABLE inventory (
			id TEXT PRIMARY KEY,
			created_at DATETIME,
			updated_at DATETIME,
			deleted_at DATETIME,
			material_id TEXT,
			material_name TEXT,
			material_code TEXT,
			material_spec TEXT,
			quantity REAL,
			total_value REAL,
			average_unit_cost REAL,
			category_code TEXT,
			batch_no TEXT,
			uom TEXT
		)`,
		`CREATE TABLE sales_orders (
			id TEXT PRIMARY KEY,
			created_at DATETIME,
			updated_at DATETIME,
			deleted_at DATETIME,
			order_no TEXT,
			order_name TEXT,
			customer_name TEXT
		)`,
		`CREATE TABLE purchase_orders (
			id TEXT PRIMARY KEY,
			created_at DATETIME,
			updated_at DATETIME,
			deleted_at DATETIME,
			order_no TEXT,
			supplier_name TEXT
		)`,
		`CREATE TABLE suppliers (
			id TEXT PRIMARY KEY,
			created_at DATETIME,
			updated_at DATETIME,
			deleted_at DATETIME,
			code TEXT,
			name TEXT
		)`,
		`CREATE TABLE approval_requests (
			id TEXT PRIMARY KEY,
			created_at DATETIME,
			updated_at DATETIME,
			deleted_at DATETIME,
			requester_id TEXT,
			target_id TEXT,
			reason TEXT,
			approver1_id TEXT,
			approver2_id TEXT,
			current_level INTEGER,
			status TEXT,
			auth_code TEXT,
			expires_at DATETIME,
			module TEXT,
			action TEXT
		)`,
	}
	for _, statement := range statements {
		require.NoError(t, db.DB.Exec(statement).Error)
	}
}
