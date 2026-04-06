package handlers

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"xdfc-server/models"
	"xdfc-server/services"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
)

func setupTradingWorkflowHandlerTestDB(t *testing.T) *gorm.DB {
	t.Helper()
	gin.SetMode(gin.TestMode)

	testDB := setupHandlerSQLiteTestDB(t)

	schemaStatements := []string{
		`CREATE TABLE workflow_definitions (
			id TEXT PRIMARY KEY NOT NULL,
			created_at DATETIME,
			updated_at DATETIME,
			deleted_at DATETIME,
			code TEXT NOT NULL UNIQUE,
			name TEXT NOT NULL,
			version INTEGER DEFAULT 1,
			module TEXT NOT NULL,
			definition_json TEXT NOT NULL,
			description TEXT,
			is_active BOOLEAN DEFAULT TRUE
		)`,
		`CREATE TABLE workflow_instances (
			id TEXT PRIMARY KEY NOT NULL,
			created_at DATETIME,
			updated_at DATETIME,
			deleted_at DATETIME,
			definition_id TEXT NOT NULL,
			business_type TEXT NOT NULL,
			business_ref_id TEXT NOT NULL,
			current_node_id TEXT,
			status TEXT,
			requester_id TEXT,
			started_at DATETIME,
			finished_at DATETIME
		)`,
		`CREATE TABLE workflow_tasks (
			id TEXT PRIMARY KEY NOT NULL,
			created_at DATETIME,
			updated_at DATETIME,
			deleted_at DATETIME,
			instance_id TEXT NOT NULL,
			node_id TEXT,
			assignee_user_id TEXT NOT NULL,
			status TEXT,
			action TEXT,
			comment TEXT,
			action_at DATETIME
		)`,
		`CREATE TABLE purchase_orders (
			id TEXT PRIMARY KEY NOT NULL DEFAULT (lower(hex(randomblob(16)))),
			order_no TEXT NOT NULL,
			supplier_id TEXT,
			supplier_name TEXT,
			order_date TEXT,
			expected_date TEXT,
			status TEXT,
			currency TEXT,
			amount REAL,
			exchange_rate REAL,
			purchaser TEXT,
			payment_term TEXT,
			note TEXT,
			workflow_instance_id TEXT,
			created_at DATETIME,
			updated_at DATETIME,
			is_deleted BOOLEAN DEFAULT FALSE,
			version INTEGER DEFAULT 1
		)`,
		`CREATE TABLE purchase_order_lines (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			purchase_order_id TEXT,
			line_no INTEGER,
			material_id TEXT,
			material_code TEXT,
			material_name TEXT,
			specification TEXT,
			qty REAL,
			uom TEXT,
			price REAL,
			amount REAL,
			received_qty REAL,
			status TEXT
		)`,
		`CREATE TABLE sales_orders (
			id TEXT PRIMARY KEY NOT NULL DEFAULT (lower(hex(randomblob(16)))),
			order_no TEXT NOT NULL,
			order_name TEXT,
			customer_name TEXT,
			customer_id TEXT,
			type TEXT,
			currency TEXT,
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
			workflow_instance_id TEXT,
			created_at DATETIME,
			updated_at DATETIME,
			updated_by TEXT,
			is_deleted BOOLEAN DEFAULT FALSE,
			version INTEGER DEFAULT 1
		)`,
		`CREATE TABLE sales_order_lines (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			sales_order_id TEXT,
			line_no INTEGER,
			product_id TEXT,
			product_model TEXT,
			product_code TEXT,
			specification TEXT,
			description TEXT,
			qty REAL,
			uom TEXT,
			price REAL,
			amount REAL,
			delivered_qty REAL,
			customer_part_no TEXT,
			job_no TEXT,
			note TEXT,
			drilling_plan_id TEXT,
			labeling_plan_id TEXT,
			hole_count INTEGER,
			route TEXT,
			order_date TEXT,
			status TEXT,
			claimed_by TEXT,
			claimed_at TEXT
		)`,
	}

	for _, stmt := range schemaStatements {
		require.NoError(t, testDB.Exec(stmt).Error)
	}

	return testDB
}

func seedWorkflowDefinition(t *testing.T, testDB *gorm.DB, module string, code string) {
	t.Helper()

	definition := models.WorkflowDefinition{
		BaseModel:      models.BaseModel{ID: uuid.NewString()},
		Code:           code,
		Name:           code,
		Version:        1,
		Module:         module,
		DefinitionJSON: `{"startNodeId":"n1","nodes":[{"nodeId":"n1","assigneeUserId":"u-approver"}]}`,
		IsActive:       true,
	}
	require.NoError(t, testDB.Create(&definition).Error)
}

func TestSavePurchaseOrderHandlerCreatesWorkflowInstanceOnCreate(t *testing.T) {
	testDB := setupTradingWorkflowHandlerTestDB(t)
	seedWorkflowDefinition(t, testDB, services.WorkflowModulePurchaseOrder, "PO_FLOW_E2E")

	payload := `{"orderNo":"PO-E2E-001","supplierId":"supplier-1","supplierName":"Supplier A","currency":"CNY","amount":1200.5,"lines":[]}`

	recorder := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(recorder)
	request := httptest.NewRequest(http.MethodPost, "/api/v1/purchase-orders", strings.NewReader(payload))
	request.Header.Set("Content-Type", "application/json")
	ctx.Request = request
	ctx.Set("userId", "u-requester")

	SavePurchaseOrderHandler(ctx)

	require.Equal(t, http.StatusOK, recorder.Code, recorder.Body.String())

	var persisted models.PurchaseOrder
	require.NoError(t, testDB.Where("order_no = ?", "PO-E2E-001").First(&persisted).Error)
	require.NotEmpty(t, persisted.WorkflowInstanceID)

	var instance models.WorkflowInstance
	require.NoError(t, testDB.Where("id = ?", persisted.WorkflowInstanceID).First(&instance).Error)
	require.Equal(t, models.WorkflowInstanceStatusRunning, instance.Status)
	require.Equal(t, persisted.ID, instance.BusinessRefID)
	require.Equal(t, "PURCHASE_ORDER", instance.BusinessType)
}

func TestSaveSalesOrderHandlerCreatesWorkflowInstanceOnCreate(t *testing.T) {
	testDB := setupTradingWorkflowHandlerTestDB(t)
	seedWorkflowDefinition(t, testDB, services.WorkflowModuleSalesOrder, "SO_FLOW_E2E")

	payload := `{"orderNo":"SO-E2E-001","orderName":"Sample SO","customerName":"Customer A","currency":"CNY","amount":980.25,"lines":[]}`

	recorder := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(recorder)
	request := httptest.NewRequest(http.MethodPost, "/api/v1/sales-orders", strings.NewReader(payload))
	request.Header.Set("Content-Type", "application/json")
	ctx.Request = request
	ctx.Set("userId", "u-requester")
	ctx.Set("username", "tester")

	SaveSalesOrderHandler(ctx)

	require.Equal(t, http.StatusOK, recorder.Code, recorder.Body.String())

	var persisted models.SalesOrder
	require.NoError(t, testDB.Where("order_no = ?", "SO-E2E-001").First(&persisted).Error)
	require.NotEmpty(t, persisted.WorkflowInstanceID)

	var instance models.WorkflowInstance
	require.NoError(t, testDB.Where("id = ?", persisted.WorkflowInstanceID).First(&instance).Error)
	require.Equal(t, models.WorkflowInstanceStatusRunning, instance.Status)
	require.Equal(t, persisted.ID, instance.BusinessRefID)
	require.Equal(t, "SALES_ORDER", instance.BusinessType)
}

func TestSavePurchaseOrderHandlerReturnsBadRequestWhenWorkflowDefinitionMissing(t *testing.T) {
	testDB := setupTradingWorkflowHandlerTestDB(t)

	payload := `{"orderNo":"PO-E2E-NEG-001","supplierId":"supplier-1","supplierName":"Supplier A","currency":"CNY","amount":500,"lines":[]}`

	recorder := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(recorder)
	request := httptest.NewRequest(http.MethodPost, "/api/v1/purchase-orders", strings.NewReader(payload))
	request.Header.Set("Content-Type", "application/json")
	ctx.Request = request
	ctx.Set("userId", "u-requester")

	SavePurchaseOrderHandler(ctx)

	require.Equal(t, http.StatusBadRequest, recorder.Code, recorder.Body.String())
	require.Contains(t, recorder.Body.String(), "未找到可用流程定义")

	var count int64
	require.NoError(t, testDB.Model(&models.PurchaseOrder{}).Where("order_no = ?", "PO-E2E-NEG-001").Count(&count).Error)
	require.Equal(t, int64(0), count)
}

func TestSaveSalesOrderHandlerReturnsBadRequestWhenWorkflowDefinitionMissing(t *testing.T) {
	testDB := setupTradingWorkflowHandlerTestDB(t)

	payload := `{"orderNo":"SO-E2E-NEG-001","orderName":"Sample SO","customerName":"Customer A","currency":"CNY","amount":700,"lines":[]}`

	recorder := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(recorder)
	request := httptest.NewRequest(http.MethodPost, "/api/v1/sales-orders", strings.NewReader(payload))
	request.Header.Set("Content-Type", "application/json")
	ctx.Request = request
	ctx.Set("userId", "u-requester")
	ctx.Set("username", "tester")

	SaveSalesOrderHandler(ctx)

	require.Equal(t, http.StatusBadRequest, recorder.Code, recorder.Body.String())
	require.Contains(t, recorder.Body.String(), "未找到可用流程定义")

	var count int64
	require.NoError(t, testDB.Model(&models.SalesOrder{}).Where("order_no = ?", "SO-E2E-NEG-001").Count(&count).Error)
	require.Equal(t, int64(0), count)
}
