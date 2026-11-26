package routes

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"net/url"
	"testing"
	"xdfc-server/authz"
	"xdfc-server/models"
	"xdfc-server/services"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
	"xdfc-server/handlers"
	"xdfc-server/middleware"
)

func TestSalesOrderSavedMBOMBranchFlowsThroughMRPAndMaterialIssuanceHTTP(t *testing.T) {
	database, source := openProductionMaterialIssuanceReadonlyHTTPTestDatabase(t)
	addSalesOrderProductionBasisHTTPTestSchema(t, database)

	var originalLine models.SalesOrderLine
	require.NoError(t, database.First(&originalLine, "id = ?", source.SalesOrderLineID).Error)
	productID := originalLine.ProductID
	customerID := "50000000-0000-4000-8000-000000000002"
	customerBOMRevisionAID := "50000000-0000-4000-8000-000000000003"
	customerBOMRevisionBID := "50000000-0000-4000-8000-000000000004"
	customerBOMItemRevisionAID := "50000000-0000-4000-8000-000000000005"
	customerBOMItemRevisionBID := "50000000-0000-4000-8000-000000000006"
	var originalBOMItem models.BOMItem
	require.NoError(t, database.Where("bom_id = ?", source.ExpectedBOMID).Order("id ASC").First(&originalBOMItem).Error)
	materialID := originalBOMItem.MaterialID
	lineID := uint(101)

	require.NoError(t, database.Exec(`INSERT INTO customers (id, name, deleted_at) VALUES (?, '专属客户', NULL)`, customerID).Error)
	require.NoError(t, database.Exec(`INSERT INTO boms
		(id, product_id, bom_type, bom_no, status, owner_type, owner_customer_id, version, version_text, version_level, revision_no, measured_weight, measured_weight_unit)
		VALUES
		(?, ?, 'MBOM', 'CUSTOMER-A', 'RELEASED', 'CUSTOMER', ?, 3, 'V1', 'standard', 'A', 460, 'g'),
		(?, ?, 'MBOM', 'CUSTOMER-B', 'RELEASED', 'CUSTOMER', ?, 4, 'V2', 'standard', 'B', 440, 'g')`,
		customerBOMRevisionAID, productID, customerID,
		customerBOMRevisionBID, productID, customerID,
	).Error)
	require.NoError(t, database.Exec(`INSERT INTO bom_items (id, bom_id, sort_order, section, material_id, unit, standard_usage)
		VALUES (?, ?, 1, 'A', ?, ?, 0.25), (?, ?, 1, 'A', ?, ?, 0.35)`,
		customerBOMItemRevisionAID, customerBOMRevisionAID, materialID,
		originalBOMItem.Unit,
		customerBOMItemRevisionBID, customerBOMRevisionBID, materialID, originalBOMItem.Unit,
	).Error)
	require.NoError(t, database.Exec(`INSERT INTO inventory (id, material_id, category_code, batch_no, quantity, uom, deleted_at)
		VALUES ('stock-selected-branch', ?, 'MATERIAL', 'batch-1', 100, ?, NULL)`, materialID, originalBOMItem.Unit).Error)
	require.NoError(t, database.Exec(`INSERT INTO inventory_reservations (id, material_id, category_code, batch_no, quantity, status, deleted_at)
		VALUES ('reservation-selected-branch', ?, 'MATERIAL', 'batch-1', 0, 'RELEASED', NULL)`, materialID).Error)

	permissions := []string{
		authz.MenuTrading,
		authz.ActionTradingSalesOrderManage,
		authz.MenuMrp,
		authz.TabMrpRequirements,
		authz.ActionProductionMaterialIssuanceView,
		authz.ActionProductionMaterialIssuanceDispatch,
	}
	router := newSalesOrderMRPAndIssuanceHTTPTestRouter(permissions)

	var orderLines []models.SalesOrderLine
	require.NoError(t, database.Where("sales_order_id = ?", source.SalesOrderID).Order("line_no ASC").Find(&orderLines).Error)
	require.Len(t, orderLines, 1)
	lineRequests := make([]services.SalesOrderLineRequest, 0, len(orderLines))
	for _, line := range orderLines {
		encodedLine, err := json.Marshal(line)
		require.NoError(t, err)
		var request services.SalesOrderLineRequest
		require.NoError(t, json.Unmarshal(encodedLine, &request))
		if request.ID == lineID {
			request.BOMOwnerType = "CUSTOMER"
			request.BOMOwnerCustomerID = customerID
			request.BOMVersionLevel = "standard"
		}
		lineRequests = append(lineRequests, request)
	}
	lineChanges, err := json.Marshal(services.SalesOrderLinesChangePayload{Lines: lineRequests})
	require.NoError(t, err)
	transactionBody, err := json.Marshal(services.SalesOrderTransactionRequest{
		Intent:          services.SalesTransactionIntentOrderLinesChange,
		ExpectedVersion: 4,
		Payload:         lineChanges,
	})
	require.NoError(t, err)
	response := requestSalesOrderMRPAndIssuanceHTTP(t, router, http.MethodPost,
		"/api/v1/sales-orders/"+source.SalesOrderID+"/transactions", transactionBody)
	require.Equal(t, http.StatusOK, response.Code, response.Body.String())
	var savedOrder services.SalesOrderResponse
	require.NoError(t, json.Unmarshal(response.Body.Bytes(), &savedOrder))
	require.Equal(t, 5, savedOrder.Version)
	require.Equal(t, "CUSTOMER", savedOrder.Lines[0].BOMOwnerType)
	require.Equal(t, customerID, savedOrder.Lines[0].BOMOwnerCustomerID)

	mrpURL := "/api/v1/mrp/requirements?" + url.Values{"selectedKeys": []string{"SO-HTTP-1"}}.Encode()
	response = requestSalesOrderMRPAndIssuanceHTTP(t, router, http.MethodGet, mrpURL, nil)
	require.Equal(t, http.StatusOK, response.Code, response.Body.String())
	var ambiguousMRP services.MrpRequirementsResponse
	require.NoError(t, json.Unmarshal(response.Body.Bytes(), &ambiguousMRP))
	require.False(t, ambiguousMRP.IsComplete)
	require.Len(t, ambiguousMRP.SourceLines, 1)
	require.Equal(t, "DUPLICATE_EFFECTIVE_MBOM", ambiguousMRP.SourceLines[0].IssueCode)
	require.Len(t, ambiguousMRP.SourceLines[0].BOMCandidates, 2)
	for _, candidate := range ambiguousMRP.SourceLines[0].BOMCandidates {
		require.Equal(t, "CUSTOMER", candidate.OwnerType)
		require.Equal(t, customerID, candidate.OwnerCustomerID)
	}
	response = requestSalesOrderMRPAndIssuanceHTTP(t, router, http.MethodGet, mrpURL+"&bomSelections=%5B%5D", nil)
	require.Equal(t, http.StatusBadRequest, response.Code, response.Body.String())

	duplicatePreparationBody, err := json.Marshal(map[string]any{"sources": []services.ProductionMaterialIssuanceSourcePreparationSelection{{
		SalesOrderID: source.SalesOrderID, SalesOrderLineID: lineID,
	}}})
	require.NoError(t, err)
	response = requestSalesOrderMRPAndIssuanceHTTP(t, router, http.MethodPost,
		"/api/v1/mrp/production-material-issuance/source-preparation", duplicatePreparationBody)
	require.Equal(t, http.StatusOK, response.Code, response.Body.String())
	var duplicatePreparation services.ProductionMaterialIssuanceSourcePreparation
	require.NoError(t, json.Unmarshal(response.Body.Bytes(), &duplicatePreparation))
	require.False(t, duplicatePreparation.IsReady)
	require.Contains(t, duplicatePreparation.Issues, services.ProductionMaterialIssuanceSourcePrerequisiteIssue{SalesOrderLineID: lineID, Code: "DUPLICATE_EFFECTIVE_MBOM"})

	require.NoError(t, database.Exec("ALTER TABLE boms ADD COLUMN updated_at DATETIME").Error)
	require.NoError(t, database.Model(&models.BOM{}).Where("id = ?", customerBOMRevisionAID).Update("status", models.BOMStatusObsolete).Error)
	response = requestSalesOrderMRPAndIssuanceHTTP(t, router, http.MethodGet, mrpURL, nil)
	require.Equal(t, http.StatusOK, response.Code, response.Body.String())
	var selectedMRP services.MrpRequirementsResponse
	require.NoError(t, json.Unmarshal(response.Body.Bytes(), &selectedMRP))
	require.True(t, selectedMRP.IsComplete, "%s", response.Body.String())
	require.Equal(t, customerBOMRevisionBID, selectedMRP.SourceLines[0].BOM.ID)
	require.InDelta(t, originalLine.Qty*0.35, selectedMRP.SourceLines[0].Contributions[0].RequiredQty, 1e-9)

	selectionBody, err := json.Marshal(map[string]any{"sources": []services.ProductionMaterialIssuanceSourcePreparationSelection{{
		SalesOrderID: source.SalesOrderID, SalesOrderLineID: lineID,
	}}})
	require.NoError(t, err)
	response = requestSalesOrderMRPAndIssuanceHTTP(t, router, http.MethodPost,
		"/api/v1/mrp/production-material-issuance/source-preparation", selectionBody)
	require.Equal(t, http.StatusOK, response.Code, response.Body.String())
	var prepared services.ProductionMaterialIssuanceSourcePreparation
	require.NoError(t, json.Unmarshal(response.Body.Bytes(), &prepared))
	require.True(t, prepared.IsReady)
	require.Equal(t, customerBOMRevisionBID, prepared.SourceLines[0].BOM.ID)

	issueSelection := []services.ProductionMaterialIssuanceSourceSelection{{
		SalesOrderID: source.SalesOrderID, SalesOrderLineID: lineID, ExpectedBOMID: customerBOMRevisionBID,
	}}
	reviewBody, err := json.Marshal(map[string]any{"sources": issueSelection})
	require.NoError(t, err)
	response = requestSalesOrderMRPAndIssuanceHTTP(t, router, http.MethodPost,
		"/api/v1/mrp/production-material-issuance/source-review", reviewBody)
	require.Equal(t, http.StatusOK, response.Code, response.Body.String())
	var reviewed struct {
		Sources []services.ProductionMaterialIssuanceReviewedSourceBasis `json:"sources"`
	}
	require.NoError(t, json.Unmarshal(response.Body.Bytes(), &reviewed))
	require.Len(t, reviewed.Sources, 1)
	require.Equal(t, customerBOMRevisionBID, reviewed.Sources[0].BOM.ID)
	require.Equal(t, "CUSTOMER", reviewed.Sources[0].BOM.OwnerType)
	require.Equal(t, customerID, reviewed.Sources[0].BOM.OwnerCustomerID)

	dispatchRequest := services.ProductionMaterialIssuanceDispatchRequest{
		CommandID: uuid.NewString(),
		Sources: []services.ProductionMaterialIssuanceDispatchSourceExpectation{{
			ProductionMaterialIssuanceSourceSelection: issueSelection[0],
			ExpectedOrderVersion:                      reviewed.Sources[0].OrderVersion,
			ExpectedBOMVersion:                        reviewed.Sources[0].BOM.Version,
			BasisFingerprint:                          reviewed.Sources[0].BasisFingerprint,
		}},
	}
	dispatchBody, err := json.Marshal(dispatchRequest)
	require.NoError(t, err)
	response = requestSalesOrderMRPAndIssuanceHTTP(t, router, http.MethodPost,
		"/api/v1/mrp/production-material-issuance/dispatch", dispatchBody)
	require.Equal(t, http.StatusOK, response.Code, response.Body.String())
	var dispatched services.ProductionMaterialIssuanceDocumentDetail
	require.NoError(t, json.Unmarshal(response.Body.Bytes(), &dispatched))
	require.Equal(t, customerBOMRevisionBID, dispatched.Sources[0].BOM.ID)
	require.Equal(t, "CUSTOMER", dispatched.Sources[0].BOM.OwnerType)
	require.Equal(t, customerID, dispatched.Sources[0].BOM.OwnerCustomerID)

	var persistedLine models.SalesOrderLine
	require.NoError(t, database.First(&persistedLine, "id = ?", lineID).Error)
	require.Equal(t, "CUSTOMER", persistedLine.BOMOwnerType)
	require.Equal(t, customerID, persistedLine.BOMOwnerCustomerID)
	require.Equal(t, "standard", persistedLine.BOMVersionLevel)
}

func addSalesOrderProductionBasisHTTPTestSchema(t *testing.T, database *gorm.DB) {
	t.Helper()
	for _, statement := range []string{
		`ALTER TABLE sales_orders ADD COLUMN amount REAL DEFAULT 0`,
		`ALTER TABLE sales_orders ADD COLUMN quantity REAL DEFAULT 0`,
		`ALTER TABLE sales_orders ADD COLUMN updated_by TEXT DEFAULT ''`,
		`ALTER TABLE sales_orders ADD COLUMN created_at DATETIME`,
		`ALTER TABLE sales_orders ADD COLUMN updated_at DATETIME`,
		`CREATE TABLE customers (id TEXT PRIMARY KEY, name TEXT, deleted_at DATETIME)`,
		`CREATE TABLE linear_barcode_inventory_items (id TEXT PRIMARY KEY, sales_order_id TEXT, sales_order_line_id INTEGER NOT NULL DEFAULT 0, status TEXT, expires_at DATETIME, deleted_at DATETIME)`,
		`CREATE TABLE inventory (id TEXT PRIMARY KEY, material_id TEXT, category_code TEXT, batch_no TEXT, quantity REAL, uom TEXT, deleted_at DATETIME)`,
		`CREATE TABLE inventory_reservations (id TEXT PRIMARY KEY, material_id TEXT, category_code TEXT, batch_no TEXT, quantity REAL, status TEXT, deleted_at DATETIME)`,
		`CREATE TABLE packaging_rules (id TEXT PRIMARY KEY, material_id TEXT, pack_unit TEXT, base_unit TEXT, conversion_factor REAL, direction TEXT)`,
		`CREATE TABLE packaging_profile_targets (entity_type TEXT, entity_id TEXT, deleted_at DATETIME)`,
	} {
		require.NoError(t, database.Exec(statement).Error)
	}
}

func newSalesOrderMRPAndIssuanceHTTPTestRouter(permissions []string) *gin.Engine {
	router := gin.New()
	api := router.Group("/api/v1")
	api.Use(func(c *gin.Context) {
		c.Set("permissions", permissions)
		c.Set("userId", "selected-branch-http-test-user")
		c.Set("username", "selected-branch-http-test-user")
		c.Next()
	})
	salesOrders := api.Group("/sales-orders")
	salesOrders.Use(middleware.RequireAnyPermission(authz.MenuTrading))
	salesOrders.POST("/:id/transactions", middleware.RequireAnyPermission(authz.ActionTradingSalesOrderManage), handlers.ExecuteSalesOrderTransactionHandler)
	mrp := api.Group("/mrp")
	mrp.Use(middleware.RequireAnyPermission(authz.MenuMrp))
	mrp.GET("/requirements", handlers.GetMrpRequirementsHandler)
	registerProductionMaterialIssuanceSourceReviewAndDocumentQueryRoutes(api)
	registerProductionMaterialIssuanceDispatchAndWithdrawalCommandRoutes(api)
	return router
}

func requestSalesOrderMRPAndIssuanceHTTP(t *testing.T, router *gin.Engine, method, target string, body []byte) *httptest.ResponseRecorder {
	t.Helper()
	request := httptest.NewRequest(method, target, bytes.NewReader(body))
	request.Header.Set("Content-Type", "application/json")
	response := httptest.NewRecorder()
	router.ServeHTTP(response, request)
	return response
}
