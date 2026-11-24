package db

import (
	"testing"
	"xdfc-server/models"

	"github.com/glebarez/sqlite"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

func TestEnsureProductionRouteFamilyRevisionIntegrityBackfillsAndPreservesPublishedHistory(t *testing.T) {
	database, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{Logger: logger.Default.LogMode(logger.Silent)})
	require.NoError(t, err)
	for _, statement := range []string{
		`CREATE TABLE production_route_families (
			id TEXT PRIMARY KEY, created_at DATETIME, updated_at DATETIME, deleted_at DATETIME,
			code TEXT NOT NULL UNIQUE, product_id TEXT NOT NULL, bom_owner_type TEXT NOT NULL,
			bom_owner_customer_id TEXT NOT NULL DEFAULT '', bom_version_level TEXT NOT NULL DEFAULT '', current_revision_id TEXT
		)`,
		`CREATE TABLE production_routes (
			id TEXT PRIMARY KEY, created_at DATETIME, updated_at DATETIME, deleted_at DATETIME,
			route_family_id TEXT, revision_no INTEGER NOT NULL DEFAULT 0, based_on_route_id TEXT,
			code TEXT NOT NULL, name TEXT NOT NULL, product_id TEXT NOT NULL, product_sku TEXT, product_name TEXT,
			bom_owner_type TEXT NOT NULL, bom_owner_customer_id TEXT NOT NULL DEFAULT '', bom_owner_customer_name TEXT,
			bom_version_level TEXT NOT NULL DEFAULT '', description TEXT, version INTEGER NOT NULL DEFAULT 1, status TEXT NOT NULL
		)`,
		`CREATE UNIQUE INDEX idx_production_routes_code ON production_routes (code)`,
		`CREATE TABLE production_route_steps (
			id TEXT PRIMARY KEY, created_at DATETIME, updated_at DATETIME, deleted_at DATETIME, route_id TEXT NOT NULL,
			sequence INTEGER NOT NULL, branch_operation_id TEXT NOT NULL,
			branch_operation_name_snapshot TEXT NOT NULL DEFAULT '', branch_operation_description_snapshot TEXT,
			execution_mode TEXT NOT NULL DEFAULT 'IN_HOUSE', quality_gate TEXT NOT NULL DEFAULT 'NONE',
			quality_routing TEXT, estimated_minutes INTEGER NOT NULL DEFAULT 0, transfer_required BOOLEAN NOT NULL DEFAULT false,
			description TEXT
		)`,
		`CREATE TABLE production_plans (
			id TEXT PRIMARY KEY, created_at DATETIME, updated_at DATETIME, deleted_at DATETIME, order_no TEXT NOT NULL,
			order_id TEXT, sales_order_line_id INTEGER, product_id TEXT NOT NULL, product_name TEXT,
			bom_owner_type TEXT NOT NULL DEFAULT '', bom_owner_customer_id TEXT NOT NULL DEFAULT '', bom_version_level TEXT NOT NULL DEFAULT '',
			production_route_revision_id TEXT, production_route_revision_no INTEGER NOT NULL DEFAULT 0,
			quantity REAL NOT NULL DEFAULT 0, status TEXT NOT NULL DEFAULT 'SCHEDULED', start_date DATETIME, end_date DATETIME, notes TEXT
		)`,
		`CREATE TABLE production_bom_branch_operations (
			id TEXT PRIMARY KEY, created_at DATETIME, updated_at DATETIME, deleted_at DATETIME, product_id TEXT NOT NULL,
			bom_owner_type TEXT NOT NULL, bom_owner_customer_id TEXT NOT NULL DEFAULT '', bom_version_level TEXT NOT NULL DEFAULT '',
			name TEXT NOT NULL, description TEXT, sort_order INTEGER NOT NULL DEFAULT 0, is_active BOOLEAN NOT NULL DEFAULT true
		)`,
		`INSERT INTO production_routes (id, created_at, code, name, product_id, bom_owner_type, bom_version_level, version, status)
			VALUES ('route-r1', '2026-01-01 00:00:00', 'ROUTE-R1', '路线旧版', 'product-g24', 'INTERNAL', 'standard', 1, 'DRAFT'),
			('route-r2', '2026-02-01 00:00:00', 'ROUTE-R2', '路线发布版', 'product-g24', 'INTERNAL', 'standard', 1, 'PUBLISHED')`,
		`INSERT INTO production_route_steps (id, route_id, sequence, branch_operation_id) VALUES ('step-r1', 'route-r1', 1, 'operation-g24'), ('step-r2', 'route-r2', 1, 'operation-g24')`,
		`INSERT INTO production_plans (id, order_no, product_id, bom_owner_type, bom_version_level, quantity, status)
			VALUES ('plan-g24', 'PLAN-G24', 'product-g24', 'INTERNAL', 'standard', 1, 'SCHEDULED')`,
		`INSERT INTO production_bom_branch_operations (id, product_id, bom_owner_type, bom_version_level, name, is_active)
			VALUES ('operation-g24', 'product-g24', 'INTERNAL', 'standard', 'G24 成型', true)`,
	} {
		require.NoError(t, database.Exec(statement).Error)
	}

	require.NoError(t, EnsureProductionRouteFamilyRevisionIntegrity(database))

	var family models.ProductionRouteFamily
	require.NoError(t, database.Where("product_id = ?", "product-g24").First(&family).Error)
	require.Equal(t, "route-r2", family.CurrentRevisionID)
	var first models.ProductionRoute
	var second models.ProductionRoute
	require.NoError(t, database.First(&first, "id = ?", "route-r1").Error)
	require.NoError(t, database.First(&second, "id = ?", "route-r2").Error)
	require.Equal(t, family.ID, first.RouteFamilyID)
	require.Equal(t, family.ID, second.RouteFamilyID)
	require.Equal(t, 1, first.RevisionNo)
	require.Equal(t, 2, second.RevisionNo)
	require.NotNil(t, second.BasedOnRouteID)
	require.Equal(t, first.ID, *second.BasedOnRouteID)
	require.Equal(t, family.Code, first.Code)
	require.Equal(t, family.Code, second.Code)
	var plan models.ProductionPlan
	require.NoError(t, database.First(&plan, "id = ?", "plan-g24").Error)
	require.Equal(t, second.ID, plan.ProductionRouteRevisionID)
	require.Equal(t, second.RevisionNo, plan.ProductionRouteRevisionNo)
	var publishedStep models.ProductionRouteStep
	require.NoError(t, database.First(&publishedStep, "id = ?", "step-r2").Error)
	require.Equal(t, "G24 成型", publishedStep.BranchOperationNameSnapshot)

	require.NoError(t, database.Model(&models.ProductionBOMBranchOperation{}).
		Where("id = ?", "operation-g24").Update("name", "改名后的工序").Error)
	require.NoError(t, EnsureProductionRouteFamilyRevisionIntegrity(database))
	require.NoError(t, database.First(&publishedStep, "id = ?", "step-r2").Error)
	require.Equal(t, "G24 成型", publishedStep.BranchOperationNameSnapshot)
	require.NoError(t, database.First(&plan, "id = ?", "plan-g24").Error)
	require.Equal(t, second.ID, plan.ProductionRouteRevisionID)
	var familyCount int64
	require.NoError(t, database.Model(&models.ProductionRouteFamily{}).Count(&familyCount).Error)
	require.EqualValues(t, 1, familyCount)
}
