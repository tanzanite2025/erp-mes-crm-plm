package handlers

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"testing"

	"xdfc-server/db"
	"xdfc-server/models"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/stdlib"
	"github.com/stretchr/testify/require"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

func createProductionPlanMBOMBranchHTTPPostgresDatabase(t *testing.T) *gorm.DB {
	t.Helper()
	dsn := strings.TrimSpace(os.Getenv("PRODUCTION_MBOM_BRANCH_TEST_POSTGRES_DSN"))
	if dsn == "" {
		t.Skip("set PRODUCTION_MBOM_BRANCH_TEST_POSTGRES_DSN for isolated PostgreSQL production plan HTTP checks")
	}
	admin, err := gorm.Open(postgres.Open(dsn), &gorm.Config{Logger: logger.Default.LogMode(logger.Silent)})
	require.NoError(t, err)
	adminConnection, err := admin.DB()
	require.NoError(t, err)
	t.Cleanup(func() { require.NoError(t, adminConnection.Close()) })
	schemaName := "production_plan_http_" + strings.ReplaceAll(uuid.NewString(), "-", "")
	require.NoError(t, admin.Exec("CREATE SCHEMA "+schemaName).Error)
	t.Cleanup(func() { require.NoError(t, admin.Exec("DROP SCHEMA "+schemaName+" CASCADE").Error) })
	config, err := pgx.ParseConfig(dsn)
	require.NoError(t, err)
	config.RuntimeParams["search_path"] = schemaName
	config.RuntimeParams["statement_timeout"] = "15000"
	connection := stdlib.OpenDB(*config)
	t.Cleanup(func() { require.NoError(t, connection.Close()) })
	database, err := gorm.Open(postgres.New(postgres.Config{Conn: connection}), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Silent), IgnoreRelationshipsWhenMigrating: true,
	})
	require.NoError(t, err)
	require.NoError(t, database.AutoMigrate(
		&models.ProductionPlan{}, &models.ProductionTask{}, &models.ProductionExecutionLot{},
		&models.ProcessStep{}, &models.ProductionMBOMBranchProcessAssociation{},
		&models.ProductionRouteFamily{}, &models.ProductionRoute{}, &models.ProductionRouteStep{},
	))
	for _, statement := range []string{
		`CREATE TABLE products (id uuid PRIMARY KEY, sku text, name text, status text, deleted_at timestamptz)`,
		`CREATE TABLE customers (id uuid PRIMARY KEY, name text, deleted_at timestamptz)`,
		`CREATE TABLE boms (id uuid PRIMARY KEY, product_id uuid NOT NULL, bom_type text, status text, owner_type text,
			owner_customer_id varchar(36) NOT NULL DEFAULT '', version_level text, effective_from timestamptz, effective_to timestamptz, deleted_at timestamptz)`,
	} {
		require.NoError(t, database.Exec(statement).Error)
	}
	previousDatabase := db.DB
	db.DB = database
	t.Cleanup(func() { db.DB = previousDatabase })
	return database
}

func seedProductionPlanHTTPPublishedRouteRevision(
	t *testing.T,
	database *gorm.DB,
	productID string,
	ownerType string,
	ownerCustomerID string,
	versionLevel string,
) {
	t.Helper()
	processLibrary := models.ProcessStep{BaseModel: models.BaseModel{ID: uuid.NewString()}, Code: "PLAN-" + uuid.NewString(), Name: "排产工序", IsActive: true}
	require.NoError(t, database.Create(&processLibrary).Error)
	require.NoError(t, database.Create(&models.ProductionMBOMBranchProcessAssociation{
		BaseModel: models.BaseModel{ID: uuid.NewString()}, ProductID: productID,
		BOMOwnerType: ownerType, BOMOwnerCustomerID: ownerCustomerID, BOMVersionLevel: versionLevel,
		ProcessStepID: processLibrary.ID,
	}).Error)
	routeID := uuid.NewString()
	family := models.ProductionRouteFamily{
		BaseModel: models.BaseModel{ID: uuid.NewString()}, Code: "HTTP-ROUTE-" + uuid.NewString(),
		ProductID: productID, BOMOwnerType: ownerType, BOMOwnerCustomerID: ownerCustomerID,
		BOMVersionLevel: versionLevel,
	}
	require.NoError(t, database.Create(&family).Error)
	require.NoError(t, database.Create(&models.ProductionRoute{
		BaseModel: models.BaseModel{ID: routeID}, RouteFamilyID: family.ID, RevisionNo: 1,
		Code: family.Code, Name: "排产测试路线", ProductID: productID,
		BOMOwnerType: ownerType, BOMOwnerCustomerID: ownerCustomerID, BOMVersionLevel: versionLevel,
		Status: "PUBLISHED", Version: 1,
		Steps: []models.ProductionRouteStep{{
			BaseModel: models.BaseModel{ID: uuid.NewString()}, Sequence: 1,
			ProcessStepID: processLibrary.ID, ProcessNameSnapshot: processLibrary.Name,
			ExecutionMode: "IN_HOUSE", QualityGate: "NONE",
		}},
	}).Error)
	require.NoError(t, database.Model(&family).Update("current_revision_id", routeID).Error)
}

func TestProductionPlanMBOMBranchPostgresHTTPCreateWithoutOrderAndUpdateClearsPreviousCustomerAndVersionBeforeExecution(t *testing.T) {
	database := createProductionPlanMBOMBranchHTTPPostgresDatabase(t)
	productID, customerID := uuid.NewString(), uuid.NewString()
	require.NoError(t, database.Exec(`INSERT INTO products (id, sku, name, status) VALUES (?, 'HTTP-PLAN', 'HTTP计划产品', 'ACTIVE')`, productID).Error)
	require.NoError(t, database.Exec(`INSERT INTO customers (id, name) VALUES (?, '分支归属客户')`, customerID).Error)
	for _, branch := range []struct{ ownerType, customerID, version string }{
		{"CUSTOMER", customerID, "standard"}, {"INTERNAL", "", ""},
	} {
		require.NoError(t, database.Exec(`INSERT INTO boms (id, product_id, bom_type, status, owner_type, owner_customer_id, version_level)
			VALUES (?, ?, 'MBOM', 'RELEASED', ?, ?, ?)`, uuid.NewString(), productID, branch.ownerType, branch.customerID, branch.version).Error)
	}
	seedProductionPlanHTTPPublishedRouteRevision(t, database, productID, "INTERNAL", "", "")
	plan := models.ProductionPlan{
		OrderNo: "HTTP-BRANCH", ProductID: productID, BOMOwnerType: "CUSTOMER", BOMOwnerCustomerID: customerID,
		BOMVersionLevel: "standard", Quantity: 1, Status: "SCHEDULED",
	}
	require.NoError(t, database.Omit("OrderID", "SalesOrder", "Tasks").Create(&plan).Error)
	previousGinMode := gin.Mode()
	gin.SetMode(gin.TestMode)
	t.Cleanup(func() { gin.SetMode(previousGinMode) })
	router := gin.New()
	router.POST("/production/plans", SaveProductionPlanHandler)
	plan.BOMOwnerType, plan.BOMOwnerCustomerID, plan.BOMVersionLevel = "INTERNAL", "", ""
	body, err := json.Marshal(plan)
	require.NoError(t, err)
	request := httptest.NewRequest(http.MethodPost, "/production/plans", bytes.NewReader(body))
	request.Header.Set("Content-Type", "application/json")
	response := httptest.NewRecorder()
	router.ServeHTTP(response, request)
	require.Equal(t, http.StatusOK, response.Code, response.Body.String())
	var saved models.ProductionPlan
	require.NoError(t, database.First(&saved, "id = ?", plan.ID).Error)
	require.Equal(t, "INTERNAL", saved.BOMOwnerType)
	require.Empty(t, saved.BOMOwnerCustomerID)
	require.Empty(t, saved.BOMVersionLevel)

	lot := models.ProductionExecutionLot{ProductBarcode: "HTTP-PLAN-LOCKED", ProductID: productID, PlanID: plan.ID}
	require.NoError(t, database.Omit("TaskID").Create(&lot).Error)
	plan.BOMOwnerType, plan.BOMOwnerCustomerID, plan.BOMVersionLevel = "CUSTOMER", customerID, "standard"
	body, err = json.Marshal(plan)
	require.NoError(t, err)
	request = httptest.NewRequest(http.MethodPost, "/production/plans", bytes.NewReader(body))
	request.Header.Set("Content-Type", "application/json")
	response = httptest.NewRecorder()
	router.ServeHTTP(response, request)
	require.Equal(t, http.StatusBadRequest, response.Code, response.Body.String())
	require.NoError(t, database.First(&saved, "id = ?", plan.ID).Error)
	require.Equal(t, "INTERNAL", saved.BOMOwnerType)
	require.Empty(t, saved.BOMOwnerCustomerID)

	plan.ID = ""
	plan.OrderNo = "HTTP-CREATE-BRANCH"
	plan.BOMOwnerType, plan.BOMOwnerCustomerID, plan.BOMVersionLevel = "INTERNAL", "", ""
	body, err = json.Marshal(plan)
	require.NoError(t, err)
	request = httptest.NewRequest(http.MethodPost, "/production/plans", bytes.NewReader(body))
	request.Header.Set("Content-Type", "application/json")
	response = httptest.NewRecorder()
	router.ServeHTTP(response, request)
	require.Equal(t, http.StatusOK, response.Code, response.Body.String())
	var created models.ProductionPlan
	require.NoError(t, database.First(&created, "order_no = ?", plan.OrderNo).Error)
	require.Equal(t, productID, created.ProductID)
	require.Equal(t, "INTERNAL", created.BOMOwnerType)
	require.Empty(t, created.BOMOwnerCustomerID)
	require.Empty(t, created.BOMVersionLevel)
	var hasNullOrderID bool
	require.NoError(t, database.Raw("SELECT order_id IS NULL FROM production_plans WHERE id = ?", created.ID).Scan(&hasNullOrderID).Error)
	require.True(t, hasNullOrderID)
}
