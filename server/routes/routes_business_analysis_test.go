package routes

import (
	"net/http"
	"net/http/httptest"
	"testing"
	"xdfc-server/authz"
	"xdfc-server/db"

	"github.com/gin-gonic/gin"
	"github.com/glebarez/sqlite"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
)

func TestBusinessAnalysisRoutesRequireBusinessAnalysisMenuPermission(t *testing.T) {
	gin.SetMode(gin.TestMode)

	previousDB := db.DB
	database, err := gorm.Open(
		sqlite.Open("file:business_analysis_route_permissions?mode=memory&cache=shared"),
		&gorm.Config{},
	)
	require.NoError(t, err)
	db.DB = database
	t.Cleanup(func() {
		db.DB = previousDB
	})
	createBusinessAnalysisRouteTestSchema(t, database)

	paths := []string{
		"/api/v1/business-analysis/production-capacity?from=2026-07-01&to=2026-08-01",
		"/api/v1/business-analysis/production-capacity/export?from=2026-07-01&to=2026-08-01",
		"/api/v1/business-analysis/production-capacity/drilldown?from=2026-07-01&to=2026-08-01&dimension=product&value=product-001",
		"/api/v1/business-analysis/production-capacity/options",
	}

	deniedSnapshots := []struct {
		name        string
		permissions []string
	}{
		{name: "empty permission snapshot"},
		{name: "trading menu cannot read business analysis", permissions: []string{authz.MenuTrading}},
		{name: "quality menu cannot read business analysis", permissions: []string{authz.MenuQuality}},
		{
			name:        "business analysis tab without menu keeps API closed",
			permissions: []string{authz.TabBusinessAnalysisProductionCapacity},
		},
	}

	for _, path := range paths {
		t.Run(path+" denies other scopes", func(t *testing.T) {
			for _, snapshot := range deniedSnapshots {
				t.Run(snapshot.name, func(t *testing.T) {
					recorder := performBusinessAnalysisRouteRequest(path, snapshot.permissions)

					require.Equal(t, http.StatusForbidden, recorder.Code)
				})
			}
		})

		t.Run(path+" allows business analysis scope", func(t *testing.T) {
			recorder := performBusinessAnalysisRouteRequest(
				path,
				[]string{authz.MenuBusinessAnalysis},
			)

			require.Equal(t, http.StatusOK, recorder.Code)
		})
	}
}

func performBusinessAnalysisRouteRequest(
	path string,
	permissions []string,
) *httptest.ResponseRecorder {
	router := gin.New()
	api := router.Group("/api/v1")
	api.Use(func(c *gin.Context) {
		c.Set("permissions", permissions)
		c.Next()
	})
	registerBusinessAnalysisRoutes(api)

	recorder := httptest.NewRecorder()
	request := httptest.NewRequest(http.MethodGet, path, nil)
	router.ServeHTTP(recorder, request)
	return recorder
}

func createBusinessAnalysisRouteTestSchema(t *testing.T, database *gorm.DB) {
	t.Helper()

	statements := []string{
		`CREATE TABLE audit_logs (
			id TEXT PRIMARY KEY,
			module TEXT,
			target_id TEXT,
			action TEXT,
			diff TEXT,
			operator TEXT,
			ip TEXT,
			created_at DATETIME
		)`,
		`CREATE TABLE customers (
			id TEXT PRIMARY KEY,
			name TEXT,
			code TEXT,
			deleted_at DATETIME
		)`,
		`CREATE TABLE products (
			id TEXT PRIMARY KEY,
			name TEXT,
			sku TEXT,
			model_code TEXT,
			deleted_at DATETIME
		)`,
		`CREATE TABLE sales_orders (
			id TEXT PRIMARY KEY,
			order_no TEXT,
			customer_id TEXT,
			customer_name TEXT,
			created_at DATETIME,
			updated_at DATETIME,
			deleted_at DATETIME
		)`,
		`CREATE TABLE production_plans (
			id TEXT PRIMARY KEY,
			order_no TEXT,
			order_id TEXT,
			product_id TEXT,
			product_name TEXT,
			quantity REAL,
			status TEXT,
			start_date DATETIME,
			end_date DATETIME,
			notes TEXT,
			created_at DATETIME,
			updated_at DATETIME,
			deleted_at DATETIME
		)`,
		`CREATE TABLE production_tasks (
			id TEXT PRIMARY KEY,
			plan_id TEXT,
			batch_no TEXT,
			process_id TEXT,
			process_name TEXT,
			target_qty REAL,
			actual_qty REAL,
			status TEXT,
			operator TEXT,
			started_at DATETIME,
			completed_at DATETIME
		)`,
		`CREATE TABLE inspection_tasks (
			id TEXT PRIMARY KEY,
			production_plan_id TEXT,
			order_id TEXT,
			batch_no TEXT,
			product_id TEXT,
			deleted_at DATETIME
		)`,
		`CREATE TABLE quality_abnormalities (
			id TEXT PRIMARY KEY,
			task_id TEXT,
			disposal_method TEXT,
			scrap_quantity REAL,
			scrap_unit TEXT,
			production_plan_id TEXT,
			order_id TEXT,
			product_id TEXT,
			batch_no TEXT,
			occurred_at DATETIME,
			status TEXT,
			description TEXT,
			created_at DATETIME,
			updated_at DATETIME,
			deleted_at DATETIME
		)`,
	}

	for _, statement := range statements {
		require.NoError(t, database.Exec(statement).Error)
	}
}
