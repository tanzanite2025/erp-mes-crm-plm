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
	"xdfc-server/models"
	"xdfc-server/services"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
)

func openProductionMaterialIssuanceWarehouseHTTPInventoryAndDispatchedDocumentTestDatabase(t *testing.T) (*gorm.DB, services.ProductionMaterialIssuanceDocumentDetail) {
	t.Helper()
	database, source := openProductionMaterialIssuanceReadonlyHTTPTestDatabase(t)
	require.NoError(t, database.AutoMigrate(&models.ProductionMaterialIssuanceWarehouseMovementMaterial{}, &models.ProductionMaterialIssuanceOrderLineAllocation{}))
	// PostgreSQL retains its UUID defaults; the isolated SQLite fixture declares
	// equivalent inventory columns without PostgreSQL-only default expressions.
	for _, statement := range []string{
		`CREATE TABLE inventory (id TEXT PRIMARY KEY,created_at DATETIME,updated_at DATETIME,deleted_at DATETIME,material_id TEXT,material_name TEXT,material_code TEXT,material_spec TEXT,quantity REAL,total_value REAL,average_unit_cost REAL,category_code TEXT,batch_no TEXT,uom TEXT)`,
		`CREATE TABLE inventory_ledger_entries (id TEXT PRIMARY KEY,created_at DATETIME,updated_at DATETIME,deleted_at DATETIME,transfer_id TEXT,transfer_type TEXT,direction TEXT,material_id TEXT,material_name TEXT,material_code TEXT,material_spec TEXT,category_code TEXT,batch_no TEXT,quantity_delta REAL,quantity_after REAL,unit_cost REAL,total_value_delta REAL,source_type TEXT,source_id TEXT,source_line_id TEXT,source_fact_id TEXT,operator TEXT,occurred_at DATETIME,remarks TEXT)`,
		`CREATE TABLE inventory_reservations (id TEXT PRIMARY KEY,deleted_at DATETIME,material_id TEXT,category_code TEXT,batch_no TEXT,quantity REAL,status TEXT)`,
	} {
		require.NoError(t, database.Exec(statement).Error)
	}
	require.NoError(t, database.Exec(`ALTER TABLE warehouse_categories ADD COLUMN allow_inbound BOOLEAN DEFAULT TRUE`).Error)
	require.NoError(t, database.Exec(`INSERT INTO warehouse_categories (id,code,is_system,active,allow_shipment,allow_inbound) VALUES (?, ?, TRUE, TRUE, TRUE, TRUE)`, uuid.NewString(), models.ProductionMaterialPendingConsumptionWarehouseCategoryCode).Error)
	dispatch := createProductionMaterialIssuanceReviewedHTTPDispatchRequest(t, database, source)
	detail, err := services.DispatchProductionMaterialIssuanceDocument(context.Background(), database, services.ProductionMaterialIssuanceCommandActor{UserID: "dispatcher"}, dispatch)
	require.NoError(t, err)
	require.NoError(t, database.Create(&models.Inventory{
		BaseModel: models.BaseModel{ID: uuid.NewString()}, MaterialID: detail.Sources[0].Contributions[0].MaterialID,
		CategoryCode: "MATERIAL", BatchNo: "batch-A", UOM: "kg", Quantity: 100, TotalValue: 500, AverageUnitCost: 5,
	}).Error)
	return database, detail
}

func requestProductionMaterialIssuanceWarehouseHTTPWithExplicitActorAndPermissions(permissions []string, actorID, method, endpoint, body string) *httptest.ResponseRecorder {
	router := gin.New()
	api := router.Group("/api/v1")
	api.Use(func(c *gin.Context) {
		c.Set("permissions", permissions)
		c.Set("userId", actorID)
		c.Set("username", "warehouse-test-operator")
		c.Next()
	})
	registerProductionMaterialIssuanceSourceReviewAndDocumentQueryRoutes(api)
	registerProductionMaterialIssuanceDispatchAndWithdrawalCommandRoutes(api)
	registerProductionMaterialIssuanceWarehouseReviewAllocationSuggestionAndMovementConfirmationRoutes(api)
	request := httptest.NewRequest(method, "/api/v1/mrp/production-material-issuance"+endpoint, bytes.NewBufferString(body))
	request.Header.Set("Content-Type", "application/json")
	response := httptest.NewRecorder()
	router.ServeHTTP(response, request)
	return response
}

func buildProductionMaterialIssuanceWarehouseHTTPConfirmationTestBody(detail services.ProductionMaterialIssuanceDocumentDetail, version int, quantity float64) map[string]any {
	return map[string]any{
		"commandId": uuid.NewString(), "expectedVersion": version, "reason": "明确交接原因",
		"materials": []services.ProductionMaterialIssuanceWarehouseMaterialInput{{
			MaterialID: detail.Sources[0].Contributions[0].MaterialID, BatchNo: "batch-A", Quantity: quantity,
			Allocations: []services.ProductionMaterialIssuanceWarehouseAllocationInput{{SalesOrderLineID: 101, Quantity: quantity}},
		}},
	}
}

func productionMaterialIssuanceWarehouseHTTPAllConfirmationPermissions() []string {
	return []string{authz.MenuWarehouse, authz.ActionProductionMaterialIssuanceView, authz.ActionProductionMaterialIssuanceWarehouseIssue, authz.ActionProductionMaterialIssuanceWarehouseSupplement, authz.ActionProductionMaterialIssuanceWarehouseReturn}
}

func TestProductionMaterialIssuanceWarehouseHTTPRequiresWarehouseViewAndSeparateMovementAction(t *testing.T) {
	database, detail := openProductionMaterialIssuanceWarehouseHTTPInventoryAndDispatchedDocumentTestDatabase(t)
	for _, permissions := range [][]string{
		nil,
		{authz.MenuWarehouse},
		{authz.MenuWarehouse, authz.ActionProductionMaterialIssuanceView},
		{authz.MenuWarehouse, authz.ActionWarehouseShipmentCommit, authz.ActionWarehouseInboundRecord},
		{authz.MenuWarehouse, authz.ActionProductionMaterialIssuanceView, authz.ActionProductionMaterialIssuanceDispatch, authz.ActionProductionMaterialIssuanceWithdraw},
		{authz.MenuMrp, authz.ActionProductionMaterialIssuanceView, authz.ActionProductionMaterialIssuanceWarehouseIssue, authz.ActionProductionMaterialIssuanceWarehouseSupplement, authz.ActionProductionMaterialIssuanceWarehouseReturn},
		{authz.ActionProductionMaterialIssuanceView, authz.ActionProductionMaterialIssuanceWarehouseIssue, authz.ActionProductionMaterialIssuanceWarehouseSupplement, authz.ActionProductionMaterialIssuanceWarehouseReturn},
		{authz.MenuWarehouse, authz.ActionProductionMaterialIssuanceWarehouseIssue, authz.ActionProductionMaterialIssuanceWarehouseSupplement, authz.ActionProductionMaterialIssuanceWarehouseReturn},
	} {
		for _, action := range []string{"issue", "supplement", "return"} {
			response := requestProductionMaterialIssuanceWarehouseHTTPWithExplicitActorAndPermissions(permissions, "warehouse-1", "POST", "/documents/"+detail.Document.ID+"/"+action, `{}`)
			require.Equal(t, http.StatusForbidden, response.Code, response.Body.String())
		}
	}
	for action, permission := range map[string]string{
		"issue": authz.ActionProductionMaterialIssuanceWarehouseIssue, "supplement": authz.ActionProductionMaterialIssuanceWarehouseSupplement, "return": authz.ActionProductionMaterialIssuanceWarehouseReturn,
	} {
		permissions := []string{authz.MenuWarehouse, authz.ActionProductionMaterialIssuanceView, permission}
		for _, requestedAction := range []string{"issue", "supplement", "return"} {
			response := requestProductionMaterialIssuanceWarehouseHTTPWithExplicitActorAndPermissions(permissions, "warehouse-1", "POST", "/documents/"+detail.Document.ID+"/"+requestedAction, `{}`)
			expectedStatus := http.StatusForbidden
			if requestedAction == action {
				expectedStatus = http.StatusBadRequest
			}
			require.Equal(t, expectedStatus, response.Code, response.Body.String())
		}
		response := requestProductionMaterialIssuanceWarehouseHTTPWithExplicitActorAndPermissions(permissions, "", "POST", "/documents/"+detail.Document.ID+"/"+action, `{}`)
		require.Equal(t, http.StatusUnauthorized, response.Code)
	}
	var count int64
	require.NoError(t, database.Model(&models.ProductionMaterialIssuanceWarehouseMovement{}).Count(&count).Error)
	require.Zero(t, count)
}

func TestProductionMaterialIssuanceWarehouseHTTPReviewAndSuggestionAreReadonlyAndWarehouseCanReadDispatchedDocuments(t *testing.T) {
	database, detail := openProductionMaterialIssuanceWarehouseHTTPInventoryAndDispatchedDocumentTestDatabase(t)
	base := "/documents/" + detail.Document.ID
	suggestion := map[string]any{"expectedVersion": 1, "materialId": detail.Sources[0].Contributions[0].MaterialID, "quantity": 12}
	for _, businessPermission := range []string{authz.MenuWarehouse, authz.MenuMrp, authz.TabMrpRequirements, authz.TabMrpProductionMaterialIssuance} {
		permissions := []string{businessPermission, authz.ActionProductionMaterialIssuanceView}
		for _, endpoint := range []string{"/documents", base, base + "/warehouse-review"} {
			response := requestProductionMaterialIssuanceWarehouseHTTPWithExplicitActorAndPermissions(permissions, "reader-1", "GET", endpoint, "")
			require.Equal(t, http.StatusOK, response.Code, response.Body.String())
			require.Equal(t, "no-store", response.Header().Get("Cache-Control"))
		}
		response := requestProductionMaterialIssuanceWarehouseHTTPWithExplicitActorAndPermissions(permissions, "reader-1", "POST", base+"/ordinary-allocation-suggestion", marshalProductionMaterialIssuanceHTTPCommandTestBody(t, suggestion))
		require.Equal(t, http.StatusOK, response.Code, response.Body.String())
		require.JSONEq(t, marshalProductionMaterialIssuanceHTTPCommandTestBody(t, map[string]any{
			"documentId": detail.Document.ID, "expectedVersion": 1, "materialId": suggestion["materialId"], "quantity": 12,
			"allocations": []map[string]any{{"salesOrderLineId": 101, "quantity": 12, "originalAllocationId": nil}},
		}), response.Body.String())
	}
	warehousePermissions := []string{authz.MenuWarehouse, authz.ActionProductionMaterialIssuanceView, authz.ActionProductionMaterialIssuanceDispatch, authz.ActionProductionMaterialIssuanceWithdraw}
	for _, endpoint := range []string{"/source-review", "/dispatch", base + "/withdraw"} {
		response := requestProductionMaterialIssuanceWarehouseHTTPWithExplicitActorAndPermissions(warehousePermissions, "warehouse-1", "POST", endpoint, `{}`)
		require.Equal(t, http.StatusForbidden, response.Code)
	}
	for _, permissions := range [][]string{nil, {authz.MenuWarehouse}, {authz.ActionProductionMaterialIssuanceView}, {"tab_mrp_production_material_issuance_guide", authz.ActionProductionMaterialIssuanceView}} {
		for _, route := range []struct{ method, endpoint, body string }{{"GET", base + "/warehouse-review", ""}, {"POST", base + "/ordinary-allocation-suggestion", `{}`}} {
			response := requestProductionMaterialIssuanceWarehouseHTTPWithExplicitActorAndPermissions(permissions, "reader-1", route.method, route.endpoint, route.body)
			require.Equal(t, http.StatusForbidden, response.Code)
		}
	}
	for _, endpoint := range []string{base + "/warehouse-review", base + "/ordinary-allocation-suggestion"} {
		method := "GET"
		if strings.HasSuffix(endpoint, "suggestion") {
			method = "POST"
		}
		response := requestProductionMaterialIssuanceWarehouseHTTPWithExplicitActorAndPermissions(warehousePermissions, "", method, endpoint, `{}`)
		require.Equal(t, http.StatusUnauthorized, response.Code)
	}
	for _, model := range []any{&models.ProductionMaterialIssuanceWarehouseMovement{}, &models.InventoryLedgerEntry{}} {
		var count int64
		require.NoError(t, database.Model(model).Count(&count).Error)
		require.Zero(t, count)
	}
	var stock models.Inventory
	require.NoError(t, database.First(&stock).Error)
	require.Equal(t, 100.0, stock.Quantity)
}

func TestProductionMaterialIssuanceWarehouseHTTPPartialIssueSupplementOriginalReturnAndStableReplay(t *testing.T) {
	database, detail := openProductionMaterialIssuanceWarehouseHTTPInventoryAndDispatchedDocumentTestDatabase(t)
	permissions := productionMaterialIssuanceWarehouseHTTPAllConfirmationPermissions()
	base := "/documents/" + detail.Document.ID
	issue := buildProductionMaterialIssuanceWarehouseHTTPConfirmationTestBody(detail, 1, 10)
	response := requestProductionMaterialIssuanceWarehouseHTTPWithExplicitActorAndPermissions(permissions, "warehouse-1", "POST", base+"/issue", marshalProductionMaterialIssuanceHTTPCommandTestBody(t, issue))
	require.Equal(t, http.StatusOK, response.Code, response.Body.String())
	var issued services.ProductionMaterialIssuanceWarehouseConfirmationResult
	require.NoError(t, json.Unmarshal(response.Body.Bytes(), &issued))
	require.Equal(t, "warehouse-1", issued.Movement.Movement.ConfirmedBy)
	require.Equal(t, "ISSUE", issued.Movement.Movement.Kind)
	require.Equal(t, 2, issued.Document.Version)
	require.NotNil(t, issued.Document.WarehouseExecutionAt)
	require.Equal(t, "no-store", response.Header().Get("Cache-Control"))
	supplement := buildProductionMaterialIssuanceWarehouseHTTPConfirmationTestBody(detail, 2, 45)
	response = requestProductionMaterialIssuanceWarehouseHTTPWithExplicitActorAndPermissions(permissions, "warehouse-2", "POST", base+"/supplement", marshalProductionMaterialIssuanceHTTPCommandTestBody(t, supplement))
	require.Equal(t, http.StatusOK, response.Code, response.Body.String())
	var supplemented services.ProductionMaterialIssuanceWarehouseConfirmationResult
	require.NoError(t, json.Unmarshal(response.Body.Bytes(), &supplemented))
	original := supplemented.Movement.Materials[0].Allocations[0].ID
	returnedBody := buildProductionMaterialIssuanceWarehouseHTTPConfirmationTestBody(detail, 3, 5)
	returnedBody["materials"].([]services.ProductionMaterialIssuanceWarehouseMaterialInput)[0].Allocations[0].OriginalAllocationID = &original
	response = requestProductionMaterialIssuanceWarehouseHTTPWithExplicitActorAndPermissions(permissions, "warehouse-3", "POST", base+"/return", marshalProductionMaterialIssuanceHTTPCommandTestBody(t, returnedBody))
	require.Equal(t, http.StatusOK, response.Code, response.Body.String())
	var returned services.ProductionMaterialIssuanceWarehouseConfirmationResult
	require.NoError(t, json.Unmarshal(response.Body.Bytes(), &returned))
	require.Equal(t, "RETURN", returned.Movement.Movement.Kind)
	require.Equal(t, 4, returned.Document.Version)
	require.True(t, issued.Document.WarehouseExecutionAt.Equal(*returned.Document.WarehouseExecutionAt))
	response = requestProductionMaterialIssuanceWarehouseHTTPWithExplicitActorAndPermissions(permissions, "warehouse-1", "POST", base+"/issue", marshalProductionMaterialIssuanceHTTPCommandTestBody(t, issue))
	require.Equal(t, http.StatusOK, response.Code, response.Body.String())
	var replay services.ProductionMaterialIssuanceWarehouseConfirmationResult
	require.NoError(t, json.Unmarshal(response.Body.Bytes(), &replay))
	require.Equal(t, issued.Movement, replay.Movement)
	require.Equal(t, 4, replay.Document.Version)
	response = requestProductionMaterialIssuanceWarehouseHTTPWithExplicitActorAndPermissions(permissions, "warehouse-1", "POST", base+"/supplement", marshalProductionMaterialIssuanceHTTPCommandTestBody(t, issue))
	require.Equal(t, http.StatusConflict, response.Code)
	require.Contains(t, response.Body.String(), "PRODUCTION_MATERIAL_ISSUANCE_COMMAND_REUSED")
	issue["expectedVersion"] = 4
	response = requestProductionMaterialIssuanceWarehouseHTTPWithExplicitActorAndPermissions(permissions, "warehouse-1", "POST", base+"/issue", marshalProductionMaterialIssuanceHTTPCommandTestBody(t, issue))
	require.Equal(t, http.StatusConflict, response.Code)
	response = requestProductionMaterialIssuanceWarehouseHTTPWithExplicitActorAndPermissions(permissions, "reader-1", "GET", base+"/warehouse-review", "")
	require.Equal(t, http.StatusOK, response.Code)
	var review services.ProductionMaterialIssuanceWarehouseReview
	require.NoError(t, json.Unmarshal(response.Body.Bytes(), &review))
	require.Len(t, review.Movements, 3)
	require.Equal(t, 50.0, review.SourceMaterials[0].StandardQty)
	require.Equal(t, 55.0, review.SourceMaterials[0].IssuedQty)
	require.Equal(t, 5.0, review.SourceMaterials[0].ReturnedQty)
	require.Equal(t, 50.0, review.SourceMaterials[0].NetQty)
	require.Zero(t, review.SourceMaterials[0].RemainingQty)
	require.Zero(t, review.SourceMaterials[0].ExcessQty)
	var balances []models.Inventory
	require.NoError(t, database.Order("category_code ASC").Find(&balances).Error)
	require.Len(t, balances, 2)
	for _, balance := range balances {
		require.Equal(t, 50.0, balance.Quantity)
		require.Equal(t, 250.0, balance.TotalValue)
	}
	for model, expected := range map[any]int64{&models.ProductionMaterialIssuanceWarehouseMovement{}: 3, &models.InventoryLedgerEntry{}: 6, &models.ProductionMaterialIssuanceCommandReceipt{}: 4, &models.AuditLog{}: 4} {
		var count int64
		require.NoError(t, database.Model(model).Count(&count).Error)
		require.Equal(t, expected, count)
	}
}
