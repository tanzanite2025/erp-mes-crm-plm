package routes

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"xdfc-server/authz"
	"xdfc-server/db"
	"xdfc-server/models"
	"xdfc-server/services"

	"github.com/gin-gonic/gin"
	"github.com/glebarez/sqlite"
	"github.com/google/uuid"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

func openProductionMaterialIssuanceReadonlyHTTPTestDatabase(t *testing.T) (*gorm.DB, services.ProductionMaterialIssuanceSourceSelection) {
	t.Helper()
	database, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{Logger: logger.Default.LogMode(logger.Silent)})
	require.NoError(t, err)
	connection, err := database.DB()
	require.NoError(t, err)
	connection.SetMaxOpenConns(1)
	t.Cleanup(func() { require.NoError(t, connection.Close()) })
	previousDatabase := db.DB
	db.DB = database
	t.Cleanup(func() { db.DB = previousDatabase })
	require.NoError(t, database.AutoMigrate(&models.SalesOrderLine{}, &models.AuditLog{}, &models.ProductionMaterialIssuanceDocument{}, &models.ProductionMaterialIssuanceSourceSnapshot{}, &models.ProductionMaterialIssuanceActiveSourceCoverage{}, &models.ProductionMaterialIssuanceCommandReceipt{}, &models.ProductionMaterialIssuanceWarehouseMovement{}))
	for _, statement := range []string{
		`CREATE TABLE sales_orders (id TEXT PRIMARY KEY, order_no TEXT, status TEXT, version INTEGER, type TEXT, classification TEXT, customer_id TEXT, customer_name TEXT, deleted_at DATETIME)`,
		`CREATE TABLE warehouse_categories (id TEXT PRIMARY KEY, code TEXT, is_system BOOLEAN, active BOOLEAN, allow_shipment BOOLEAN, deleted_at DATETIME)`,
		`CREATE TABLE boms (id TEXT PRIMARY KEY, product_id TEXT, bom_type TEXT, bom_no TEXT, status TEXT, owner_type TEXT, owner_customer_id TEXT, version INTEGER, version_text TEXT, version_level TEXT, revision_no TEXT, measured_weight REAL, measured_weight_unit TEXT, effective_from DATETIME, effective_to DATETIME, deleted_at DATETIME)`,
		`CREATE TABLE bom_items (id TEXT PRIMARY KEY, bom_id TEXT, sort_order INTEGER, section TEXT, material_id TEXT, unit TEXT, standard_usage REAL)`,
		`CREATE TABLE materials (id TEXT PRIMARY KEY, code TEXT, name TEXT, spec TEXT, uom TEXT, status TEXT, deleted_at DATETIME)`,
		`CREATE TABLE products (id TEXT PRIMARY KEY, sku TEXT, name TEXT, tech_series TEXT, brake_type TEXT, deleted_at DATETIME)`,
		`CREATE TABLE product_attribute_options (id TEXT PRIMARY KEY, category TEXT, value TEXT, label TEXT, label_en TEXT, deleted_at DATETIME)`,
	} {
		require.NoError(t, database.Exec(statement).Error)
	}
	orderID, productID, materialID, bomID := uuid.NewString(), uuid.NewString(), uuid.NewString(), uuid.NewString()
	require.NoError(t, database.Exec(`INSERT INTO sales_orders VALUES (?, 'SO-HTTP', 'Pending', 4, 'standard', 'normal', 'customer-1', '测试客户', NULL)`, orderID).Error)
	require.NoError(t, database.Exec(`INSERT INTO warehouse_categories VALUES (?, 'MATERIAL', 1, 1, 1, NULL)`, uuid.NewString()).Error)
	require.NoError(t, database.Exec(`INSERT INTO products VALUES (?, 'R50', '产品', '系列', '碟刹', NULL)`, productID).Error)
	require.NoError(t, database.Exec(`INSERT INTO materials VALUES (?, 'M-1', '材料原名', '规格', 'kg', 'Active', NULL)`, materialID).Error)
	require.NoError(t, database.Exec(`INSERT INTO boms VALUES (?, ?, 'MBOM', 'MBOM-HTTP', 'RELEASED', 'INTERNAL', '', 3, 'V1', 'light', 'A', 420, 'g', NULL, NULL, NULL)`, bomID, productID).Error)
	require.NoError(t, database.Exec(`INSERT INTO bom_items VALUES (?, ?, 1, 'A', ?, 'kg', 0.5)`, uuid.NewString(), bomID, materialID).Error)
	require.NoError(t, database.Create(&models.SalesOrderLine{ID: 101, SalesOrderID: orderID, LineNo: 1, ProductID: productID, ProductModel: "R50", Qty: 100, UOM: "PCS"}).Error)
	return database, services.ProductionMaterialIssuanceSourceSelection{SalesOrderID: orderID, SalesOrderLineID: 101, BOMID: bomID}
}

func requestProductionMaterialIssuanceReadonlyHTTPRoute(permissions []string, actorID, method, endpoint, body string) *httptest.ResponseRecorder {
	router := gin.New()
	api := router.Group("/api/v1")
	api.Use(func(c *gin.Context) { c.Set("permissions", permissions); c.Set("userId", actorID); c.Next() })
	registerProductionMaterialIssuanceSourceReviewAndDocumentQueryRoutes(api)
	request := httptest.NewRequest(method, "/api/v1/mrp/production-material-issuance"+endpoint, bytes.NewBufferString(body))
	request.Header.Set("Content-Type", "application/json")
	response := httptest.NewRecorder()
	router.ServeHTTP(response, request)
	return response
}

func TestProductionMaterialIssuanceReadonlyHTTPRequiresBothBusinessAccessAndExplicitViewPermission(t *testing.T) {
	openProductionMaterialIssuanceReadonlyHTTPTestDatabase(t)
	for _, permissions := range [][]string{nil, {authz.MenuMrp}, {authz.TabMrpProductionMaterialIssuance}, {"tab_mrp_production_material_issuance_guide", authz.ActionProductionMaterialIssuanceView}, {authz.ActionProductionMaterialIssuanceView}, {authz.MenuWarehouse, authz.ActionWarehouseShipmentCommit}} {
		for _, route := range []struct{ method, endpoint, body string }{{"GET", "/documents", ""}, {"GET", "/documents/" + uuid.NewString(), ""}, {"POST", "/source-review", `{}`}} {
			response := requestProductionMaterialIssuanceReadonlyHTTPRoute(permissions, "reader-1", route.method, route.endpoint, route.body)
			require.Equal(t, http.StatusForbidden, response.Code, response.Body.String())
		}
	}
	for _, businessPermission := range []string{authz.MenuMrp, authz.TabMrpRequirements, authz.TabMrpProductionMaterialIssuance} {
		permissions := []string{businessPermission, authz.ActionProductionMaterialIssuanceView}
		response := requestProductionMaterialIssuanceReadonlyHTTPRoute(permissions, "reader-1", "GET", "/documents", "")
		require.Equal(t, http.StatusOK, response.Code, response.Body.String())
		require.JSONEq(t, `{"items":[],"total":0,"page":1,"pageSize":20}`, response.Body.String())
		require.Equal(t, "no-store", response.Header().Get("Cache-Control"))
		response = requestProductionMaterialIssuanceReadonlyHTTPRoute(permissions, "", "GET", "/documents", "")
		require.Equal(t, http.StatusUnauthorized, response.Code)
	}
}

func TestProductionMaterialIssuanceReadonlyHTTPReviewsRealSourceAndRejectsMalformedRequestsWithoutWrites(t *testing.T) {
	database, source := openProductionMaterialIssuanceReadonlyHTTPTestDatabase(t)
	permissions := []string{authz.TabMrpRequirements, authz.ActionProductionMaterialIssuanceView}
	raw, err := json.Marshal(map[string]any{"sources": []services.ProductionMaterialIssuanceSourceSelection{source}})
	require.NoError(t, err)
	response := requestProductionMaterialIssuanceReadonlyHTTPRoute(permissions, "reader-1", "POST", "/source-review", string(raw))
	require.Equal(t, http.StatusOK, response.Code, response.Body.String())
	var reviewed struct {
		Sources []services.ProductionMaterialIssuanceReviewedSourceBasis `json:"sources"`
	}
	require.NoError(t, json.Unmarshal(response.Body.Bytes(), &reviewed))
	require.Len(t, reviewed.Sources, 1)
	require.Equal(t, source.SalesOrderID, reviewed.Sources[0].SalesOrderID)
	require.EqualValues(t, 101, reviewed.Sources[0].SalesOrderLineID)
	require.Equal(t, 420.0, reviewed.Sources[0].BOM.MeasuredWeight)
	require.Equal(t, 50.0, reviewed.Sources[0].Contributions[0].RequiredQty)
	for _, invalidBody := range []string{`null`, `{}`, `{"sources":[]}`, string(raw) + `{}`, `{"sources":[],"finishedQty":999}`, strings.Replace(string(raw), `"bomId":`, `"actorId":"forged","bomId":`, 1), `{"sources":[{"salesOrderId":"bad","salesOrderLineId":101,"bomId":"bad"}]}`, `{"sources":[],"padding":"` + strings.Repeat("x", 256*1024) + `"}`} {
		response = requestProductionMaterialIssuanceReadonlyHTTPRoute(permissions, "reader-1", "POST", "/source-review", invalidBody)
		require.Equal(t, http.StatusBadRequest, response.Code, response.Body.String())
	}
	for _, query := range []string{"?page=0", "?page=", "?page=1&page=2", "?page=9223372036854775807&pageSize=200", "?pageSize=201", "?status=Done", "?customerId=customer-1"} {
		response = requestProductionMaterialIssuanceReadonlyHTTPRoute(permissions, "reader-1", "GET", "/documents"+query, "")
		require.Equal(t, http.StatusBadRequest, response.Code, response.Body.String())
	}
	for _, model := range []any{&models.ProductionMaterialIssuanceDocument{}, &models.ProductionMaterialIssuanceSourceSnapshot{}, &models.ProductionMaterialIssuanceActiveSourceCoverage{}, &models.ProductionMaterialIssuanceCommandReceipt{}, &models.AuditLog{}} {
		var count int64
		require.NoError(t, database.Model(model).Count(&count).Error)
		require.Zero(t, count, "%T", model)
	}
}

func TestProductionMaterialIssuanceReadonlyHTTPReturnsFrozenHistoryAndNeverExposesWriteCommands(t *testing.T) {
	database, source := openProductionMaterialIssuanceReadonlyHTTPTestDatabase(t)
	bases, err := services.ReviewProductionMaterialIssuanceSources(context.Background(), database, []services.ProductionMaterialIssuanceSourceSelection{source})
	require.NoError(t, err)
	detail, err := services.DispatchProductionMaterialIssuanceDocument(context.Background(), database, services.ProductionMaterialIssuanceCommandActor{UserID: "sender-1"}, services.ProductionMaterialIssuanceDispatchRequest{CommandID: "test-fixture-send", Sources: []services.ProductionMaterialIssuanceDispatchSourceExpectation{{ProductionMaterialIssuanceSourceSelection: source, ExpectedOrderVersion: bases[0].OrderVersion, ExpectedBOMVersion: bases[0].BOM.Version, BasisFingerprint: bases[0].BasisFingerprint}}})
	require.NoError(t, err)
	permissions := []string{authz.TabMrpProductionMaterialIssuance, authz.ActionProductionMaterialIssuanceView}
	require.NoError(t, database.Exec("UPDATE boms SET measured_weight=999, version=4").Error)
	require.NoError(t, database.Exec("UPDATE materials SET name='当前新名'").Error)
	response := requestProductionMaterialIssuanceReadonlyHTTPRoute(permissions, "other-reader", "GET", "/documents/"+detail.Document.ID, "")
	require.Equal(t, http.StatusOK, response.Code, response.Body.String())
	var history services.ProductionMaterialIssuanceDocumentDetail
	require.NoError(t, json.Unmarshal(response.Body.Bytes(), &history))
	require.Equal(t, detail.Sources, history.Sources)
	for _, endpoint := range []string{"/documents", "/dispatch", "/documents/" + detail.Document.ID + "/withdraw"} {
		response = requestProductionMaterialIssuanceReadonlyHTTPRoute(permissions, "reader-1", "POST", endpoint, `{}`)
		require.Equal(t, http.StatusNotFound, response.Code, response.Body.String())
	}
	response = requestProductionMaterialIssuanceReadonlyHTTPRoute(permissions, "reader-1", "GET", "/documents/not-a-uuid", "")
	require.Equal(t, http.StatusBadRequest, response.Code)
	response = requestProductionMaterialIssuanceReadonlyHTTPRoute(permissions, "reader-1", "GET", "/documents/"+uuid.NewString(), "")
	require.Equal(t, http.StatusNotFound, response.Code)
	raw, err := json.Marshal(map[string]any{"sources": []services.ProductionMaterialIssuanceSourceSelection{source}})
	require.NoError(t, err)
	response = requestProductionMaterialIssuanceReadonlyHTTPRoute(permissions, "reader-1", "POST", "/source-review", string(raw))
	require.Equal(t, http.StatusConflict, response.Code)
	require.Contains(t, response.Body.String(), "PRODUCTION_MATERIAL_ISSUANCE_SOURCE_COVERED")
	response = requestProductionMaterialIssuanceReadonlyHTTPRoute(permissions, "reader-1", "GET", "/documents?status=DISPATCHED&page=1&pageSize=1", "")
	require.Equal(t, http.StatusOK, response.Code)
	require.Contains(t, response.Body.String(), detail.Document.ID)
	require.NoError(t, database.Model(&models.ProductionMaterialIssuanceSourceSnapshot{}).Where("document_id = ?", detail.Document.ID).Update("snapshot", json.RawMessage(`{}`)).Error)
	response = requestProductionMaterialIssuanceReadonlyHTTPRoute(permissions, "reader-1", "GET", "/documents/"+detail.Document.ID, "")
	require.Equal(t, http.StatusInternalServerError, response.Code)
	require.Contains(t, response.Body.String(), "PRODUCTION_MATERIAL_ISSUANCE_QUERY_FAILED")
	require.NotContains(t, response.Body.String(), "SELECT")
	require.NotContains(t, response.Body.String(), "snapshot")
}
