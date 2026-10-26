package services

import (
	"context"
	"net/http"
	"net/url"
	"os"
	"strconv"
	"strings"
	"sync"
	"testing"
	"time"
	"xdfc-server/authz"
	"xdfc-server/db"
	"xdfc-server/models"

	"github.com/glebarez/sqlite"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/stdlib"
	"github.com/stretchr/testify/require"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
	"gorm.io/gorm/schema"
)

func TestGlobalBusinessSearchCatalogUsesExistingBusinessModelFields(t *testing.T) {
	modelsByTable := map[string]any{
		"sales_orders": &models.SalesOrder{}, "sales_order_lines": &models.SalesOrderLine{},
		"purchase_orders": &models.PurchaseOrder{}, "purchase_order_lines": &models.PurchaseOrderLine{},
		"materials": &models.Material{}, "products": &models.Product{},
		"customers": &models.Customer{}, "suppliers": &models.Supplier{},
		"inventory": &models.Inventory{}, "sales_returns": &models.SalesReturn{},
		"sales_return_lines": &models.SalesReturnLine{}, "sales_return_line_barcodes": &models.SalesReturnLineBarcode{},
		"sales_exchange_lines": &models.SalesExchangeLine{}, "sales_exchange_label_codes": &models.SalesExchangeLabelCode{},
		"sales_exchanges": &models.SalesExchange{}, "approval_requests": &models.ApprovalRequest{},
	}
	parsedModels := map[string]*schema.Schema{}
	for table, model := range modelsByTable {
		parsedModel, err := schema.Parse(model, &sync.Map{}, schema.NamingStrategy{})
		require.NoError(t, err)
		parsedModels[table] = parsedModel
	}
	for _, source := range globalBusinessSearchSources {
		for _, column := range append(append([]string{source.codeColumn, "deleted_at"}, source.titleColumns...), append(source.searchColumns, source.userScopeColumns...)...) {
			require.NotNil(t, parsedModels[source.table].FieldsByDBName[column], source.table+"."+column)
		}
		require.NotEmpty(t, source.requiredPermissions)
		for _, relation := range source.relations {
			require.NotNil(t, parsedModels[source.table].FieldsByDBName[relation.parentKey])
			foreignKeyField := parsedModels[relation.table].FieldsByDBName[relation.foreignKey]
			require.NotNil(t, foreignKeyField)
			require.Equal(t, foreignKeyField.DataType == "uuid", relation.foreignKeyIsUUID, "relation key type must match the persistence model: "+relation.table+"."+relation.foreignKey)
			for _, column := range append([]string{relation.foreignKey}, relation.searchColumns...) {
				require.NotNil(t, parsedModels[relation.table].FieldsByDBName[column], relation.table+"."+column)
			}
		}
	}
}

func createIsolatedGlobalBusinessSearchDatabase(t *testing.T) *gorm.DB {
	t.Helper()
	var database *gorm.DB
	var err error
	config := &gorm.Config{Logger: logger.Default.LogMode(logger.Silent)}
	if dsn := os.Getenv("GLOBAL_SEARCH_TEST_POSTGRES_DSN"); dsn != "" {
		adminDatabase, openError := gorm.Open(postgres.Open(dsn), config)
		require.NoError(t, openError)
		adminConnection, connectionError := adminDatabase.DB()
		require.NoError(t, connectionError)
		t.Cleanup(func() { require.NoError(t, adminConnection.Close()) })
		schemaName := "global_business_search_" + strings.ReplaceAll(uuid.NewString(), "-", "")
		require.NoError(t, adminDatabase.Exec("CREATE SCHEMA "+schemaName).Error)
		t.Cleanup(func() { require.NoError(t, adminDatabase.Exec("DROP SCHEMA "+schemaName+" CASCADE").Error) })
		connectionConfig, parseError := pgx.ParseConfig(dsn)
		require.NoError(t, parseError)
		connectionConfig.RuntimeParams["search_path"] = schemaName + ",public"
		connection := stdlib.OpenDB(*connectionConfig)
		t.Cleanup(func() { require.NoError(t, connection.Close()) })
		database, err = gorm.Open(postgres.New(postgres.Config{Conn: connection}), config)
	} else {
		database, err = gorm.Open(sqlite.Open(":memory:"), config)
		require.NoError(t, err)
		connection, connectionError := database.DB()
		require.NoError(t, connectionError)
		connection.SetMaxOpenConns(1)
		t.Cleanup(func() { require.NoError(t, connection.Close()) })
	}
	require.NoError(t, err)
	// Use UUID keys and varchar partner references, matching the production schema.
	schemas := []string{
		`CREATE TABLE sales_orders (id uuid PRIMARY KEY, order_no text, order_name text, customer_name text, customer_id text, purchase_order_no text, barcode text, classification text, type text, status text, requirements text, deleted_at timestamp)`,
		`CREATE TABLE sales_order_lines (sales_order_id uuid, product_code text, product_model text, customer_part_no text, specification text, description text, product_display_title_snapshot text, product_display_subtitle_snapshot text, product_display_code_snapshot text, product_display_full_label_snapshot text, engineering_spec_name_snapshot text, model_code_snapshot text, job_no text)`,
		`CREATE TABLE purchase_orders (id uuid PRIMARY KEY, order_no text, supplier_name text, supplier_id text, purchaser text, status text, deleted_at timestamp)`,
		`CREATE TABLE purchase_order_lines (purchase_order_id uuid, material_code text, material_name text, specification text)`,
		`CREATE TABLE materials (id uuid PRIMARY KEY, code text, name text, spec text, description text, deleted_at timestamp)`,
		`CREATE TABLE products (id uuid PRIMARY KEY, sku text, name text, model_code text, description text, deleted_at timestamp)`,
		`CREATE TABLE customers (id uuid PRIMARY KEY, code text, name text, contact_person text, contact_phone text, email text, deleted_at timestamp)`,
		`CREATE TABLE suppliers (id uuid PRIMARY KEY, code text, name text, contact_person text, contact_phone text, email text, category text, status text, main_products jsonb, deleted_at timestamp)`,
		`CREATE TABLE inventory (id uuid PRIMARY KEY, material_code text, material_name text, material_spec text, batch_no text, category_code text, deleted_at timestamp)`,
		`CREATE TABLE sales_returns (id uuid PRIMARY KEY, return_no text, sales_order_no text, customer_id text, customer_name text, tracking_no text, deleted_at timestamp)`,
		`CREATE TABLE sales_return_lines (sales_return_id uuid, product_code text, product_model text, specification text, description text, product_display_title_snapshot text, product_display_subtitle_snapshot text, product_display_code_snapshot text, product_display_full_label_snapshot text)`,
		`CREATE TABLE sales_return_line_barcodes (sales_return_id uuid, raw_code text, normalized_code text, product_code_snapshot text)`,
		`CREATE TABLE sales_exchanges (id uuid PRIMARY KEY, exchange_no text, sales_order_no text, customer_id text, customer_name text, received_old_item_tracking_no text, replacement_tracking_no text, deleted_at timestamp)`,
		`CREATE TABLE sales_exchange_lines (sales_exchange_id uuid, product_code text, product_model text, specification text, description text, product_display_title_snapshot text, product_display_subtitle_snapshot text, product_display_code_snapshot text, product_display_full_label_snapshot text, replacement_product_code text, replacement_product_model text)`,
		`CREATE TABLE sales_exchange_label_codes (sales_exchange_id uuid, raw_label_code text, normalized_label_code text)`,
		`CREATE TABLE approval_requests (id uuid PRIMARY KEY, target_id text, reason text, module text, action text, status text, requester_id uuid, approver1_id uuid, approver2_id uuid, deleted_at timestamp)`,
	}
	for _, statement := range schemas {
		require.NoError(t, database.Exec(statement).Error)
	}
	previousDatabase := db.DB
	db.DB = database
	t.Cleanup(func() { db.DB = previousDatabase })
	return database
}

func requestGlobalBusinessSearchResults(t *testing.T, query string, permissions []string, userID string, limit, offset string) GlobalBusinessSearchPage {
	t.Helper()
	endpoint := os.Getenv("GLOBAL_SEARCH_TEST_RUST_URL")
	if endpoint == "" {
		t.Skip("set GLOBAL_SEARCH_TEST_RUST_URL to test the actual Rust sidecar")
	}
	client := &SearchServiceClient{BaseURL: endpoint, HTTPClient: &http.Client{Timeout: 5 * time.Second}}
	searchContext, cancelSearch := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancelSearch()
	_, err := RebuildGlobalBusinessSearchSnapshot(searchContext, db.DB, client)
	require.NoError(t, err)
	pageLimit := 30
	if limit != "" {
		pageLimit, err = strconv.Atoi(limit)
		require.NoError(t, err)
	}
	pageOffset := 0
	if offset != "" {
		pageOffset, err = strconv.Atoi(offset)
		require.NoError(t, err)
	}
	canManage := false
	for _, permission := range permissions {
		canManage = canManage || permission == authz.PermissionManage
	}
	result, err := SearchGlobalBusinessRecords(searchContext, db.DB, client, query, userID, permissions, canManage, pageLimit, pageOffset, "")
	require.NoError(t, err)
	return result
}

func TestGlobalBusinessSearchFindsEveryRegisteredCategoryThroughRustSidecar(t *testing.T) {
	database := createIsolatedGlobalBusinessSearchDatabase(t)

	statements := []string{
		`INSERT INTO sales_orders (id, order_no, order_name, status) VALUES (?, 'SO-共同-001', '销售订单', 'Confirmed')`,
		`INSERT INTO sales_orders (id, order_no, classification) VALUES (?, 'QT-共同-001', ' Quote ')`,
		`INSERT INTO purchase_orders (id, order_no, supplier_name) VALUES (?, 'PO-共同-001', '供应单位')`,
		`INSERT INTO materials (id, code, name) VALUES (?, 'MAT-共同-001', '碳纤维')`,
		`INSERT INTO products (id, sku, name) VALUES (?, 'SKU-共同-001', '轮圈')`,
		`INSERT INTO customers (id, code, name) VALUES (?, 'CUST-001', '共同客户')`,
		`INSERT INTO suppliers (id, code, name, main_products) VALUES (?, 'SUP-001', '共同供应商', '["历史索引物料"]')`,
		`INSERT INTO inventory (id, material_code, material_name) VALUES (?, 'MAT-共同-001', '库存')`,
		`INSERT INTO sales_returns (id, return_no) VALUES (?, 'SR-共同-001')`,
		`INSERT INTO sales_exchanges (id, exchange_no) VALUES (?, 'SE-共同-001')`,
		`INSERT INTO approval_requests (id, target_id, reason) VALUES (?, 'AP-共同-001', '审批')`,
	}
	for _, statement := range statements {
		require.NoError(t, database.Exec(statement, uuid.NewString()).Error)
	}
	result := requestGlobalBusinessSearchResults(t, "共同", []string{authz.PermissionManage}, uuid.NewString(), "100", "")
	require.Len(t, result.Data, 11)
	counts := map[string]int{}
	for _, item := range result.Data {
		counts[item.Category]++
		require.NotEmpty(t, item.Title)
		require.NotEmpty(t, item.ParentTitle)
		link, err := url.Parse(item.Href)
		require.NoError(t, err)
		require.NotContains(t, link.Path, ":")
		if item.Category == "quote" {
			require.Equal(t, "/quotes/orders", link.Path)
			require.Equal(t, item.ID, link.Query().Get("detailId"))
		}
	}
	for _, source := range globalBusinessSearchSources {
		require.Equal(t, 1, counts[source.category], source.category)
	}
	require.False(t, result.HasMore)
	for _, keyword := range []string{"Confirmed", "历史索引物料", "轮"} {
		preservedResults := requestGlobalBusinessSearchResults(t, keyword, []string{authz.PermissionManage}, uuid.NewString(), "", "")
		require.Len(t, preservedResults.Data, 1)
	}
}

func TestGlobalBusinessSearchMatchesOrderLinesPartnersAndMultipleKeywords(t *testing.T) {
	database := createIsolatedGlobalBusinessSearchDatabase(t)
	customerID, salesID, supplierID, purchaseID := uuid.NewString(), uuid.NewString(), uuid.NewString(), uuid.NewString()
	require.NoError(t, database.Exec(`INSERT INTO customers (id, code, name) VALUES (?, 'CUST-77', '更新客户名')`, customerID).Error)
	require.NoError(t, database.Exec(`INSERT INTO suppliers (id, code, name) VALUES (?, 'SUP-77', '更新供应商')`, supplierID).Error)
	require.NoError(t, database.Exec(`INSERT INTO sales_orders (id, order_no, customer_id, customer_name) VALUES (?, 'SO-A&B/77', ?, '历史名称')`, salesID, customerID).Error)
	require.NoError(t, database.Exec(`INSERT INTO sales_order_lines (sales_order_id, product_code, customer_part_no) VALUES (?, 'SKU-CARBON-77', '客户料号-009')`, salesID).Error)
	require.NoError(t, database.Exec(`INSERT INTO sales_order_lines (sales_order_id, product_code) VALUES (?, 'SKU-CARBON-77')`, salesID).Error)
	require.NoError(t, database.Exec(`INSERT INTO purchase_orders (id, order_no, supplier_id) VALUES (?, 'PO-77', ?)`, purchaseID, supplierID).Error)
	require.NoError(t, database.Exec(`INSERT INTO purchase_order_lines (purchase_order_id, material_code, material_name) VALUES (?, 'MAT-CARBON-77', '碳布')`, purchaseID).Error)
	for _, scenario := range []struct{ keyword, expectedID string }{
		{"客户料号-009 更新客户", salesID},
		{"sku-carbon-77 CUST-77", salesID},
		{"SO-A&B/77", salesID},
		{"MAT-CARBON-77 SUP-77", purchaseID},
		{"更新供应商 碳布", purchaseID},
	} {
		t.Run(scenario.keyword, func(t *testing.T) {
			result := requestGlobalBusinessSearchResults(t, scenario.keyword, []string{authz.PermissionManage}, uuid.NewString(), "", "")
			require.Len(t, result.Data, 1)
			require.Equal(t, scenario.expectedID, result.Data[0].ID)
		})
	}
}

func TestGlobalBusinessSearchFiltersPermissionsAndApprovalOwnershipBeforePagination(t *testing.T) {
	database := createIsolatedGlobalBusinessSearchDatabase(t)
	userID, otherUserID := uuid.NewString(), uuid.NewString()
	require.NoError(t, database.Exec(`INSERT INTO customers (id, code, name) VALUES (?, '共同', '客户')`, uuid.NewString()).Error)
	require.NoError(t, database.Exec(`INSERT INTO suppliers (id, code, name) VALUES (?, '共同', '供应商')`, uuid.NewString()).Error)
	require.NoError(t, database.Exec(`INSERT INTO materials (id, code, name, deleted_at) VALUES (?, '共同', '已删除', CURRENT_TIMESTAMP)`, uuid.NewString()).Error)
	for _, ownerID := range []string{userID, otherUserID} {
		require.NoError(t, database.Exec(`INSERT INTO approval_requests (id, target_id, reason, requester_id) VALUES (?, '共同', '审批', ?)`, uuid.NewString(), ownerID).Error)
	}
	tradingResults := requestGlobalBusinessSearchResults(t, "共同", []string{authz.MenuTrading}, userID, "1", "")
	require.Len(t, tradingResults.Data, 1)
	require.Equal(t, "customer", tradingResults.Data[0].Category)
	require.False(t, tradingResults.HasMore)
	approvalResults := requestGlobalBusinessSearchResults(t, "共同", []string{authz.MenuApproval}, userID, "", "")
	require.Len(t, approvalResults.Data, 1)
	adminResults := requestGlobalBusinessSearchResults(t, "共同", []string{authz.PermissionManage}, userID, "", "")
	require.Len(t, adminResults.Data, 4)
	noAccessResults := requestGlobalBusinessSearchResults(t, "共同", nil, userID, "", "")
	require.Empty(t, noAccessResults.Data)
}

func TestGlobalBusinessSearchRanksExactCodesEscapesWildcardsAndPaginates(t *testing.T) {
	database := createIsolatedGlobalBusinessSearchDatabase(t)
	for _, code := range []string{"ABC-123", "prefix-ABC-123", "ABC-123-extra", "A_100%&!", "AX100more"} {
		require.NoError(t, database.Exec(`INSERT INTO materials (id, code, name) VALUES (?, ?, '测试')`, uuid.NewString(), code).Error)
	}
	pageOne := requestGlobalBusinessSearchResults(t, "abc-123", []string{authz.MenuWarehouse}, uuid.NewString(), "2", "")
	require.Len(t, pageOne.Data, 2)
	require.Equal(t, "ABC-123", pageOne.Data[0].Code)
	require.True(t, pageOne.HasMore)
	client := &SearchServiceClient{BaseURL: os.Getenv("GLOBAL_SEARCH_TEST_RUST_URL"), HTTPClient: &http.Client{Timeout: 5 * time.Second}}
	pageTwo, err := SearchGlobalBusinessRecords(context.Background(), database, client, "abc-123", uuid.NewString(), []string{authz.MenuWarehouse}, false, 2, pageOne.NextOffset, pageOne.Generation)
	require.NoError(t, err)
	require.Len(t, pageTwo.Data, 1)
	require.False(t, pageTwo.HasMore)
	require.NotEqual(t, pageOne.Data[0].ID, pageTwo.Data[0].ID)
	for _, keyword := range []string{"A_100%&!", "１００％", "_100%"} {
		result := requestGlobalBusinessSearchResults(t, keyword, []string{authz.MenuWarehouse}, uuid.NewString(), "", "")
		require.Len(t, result.Data, 1)
		require.Equal(t, "A_100%&!", result.Data[0].Code)
		link, err := url.Parse(result.Data[0].Href)
		require.NoError(t, err)
		require.Equal(t, "A_100%&!", link.Query().Get("search"))
	}
}
