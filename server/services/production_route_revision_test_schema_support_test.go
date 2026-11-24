package services

import (
	"testing"
	"xdfc-server/models"

	"github.com/google/uuid"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
)

func migrateProductionRouteRevisionTestSchema(t *testing.T, database *gorm.DB, includeProductionPlan bool) {
	t.Helper()
	statements := []string{
		`CREATE TABLE IF NOT EXISTS production_route_families (
			id TEXT PRIMARY KEY,
			created_at DATETIME,
			updated_at DATETIME,
			deleted_at DATETIME,
			code TEXT NOT NULL UNIQUE,
			product_id TEXT NOT NULL,
			bom_owner_type TEXT NOT NULL,
			bom_owner_customer_id TEXT NOT NULL DEFAULT '',
			bom_version_level TEXT NOT NULL DEFAULT '',
			current_revision_id TEXT
		)`,
		`CREATE UNIQUE INDEX IF NOT EXISTS idx_production_route_family_branch
			ON production_route_families (product_id, bom_owner_type, bom_owner_customer_id, bom_version_level)`,
	}
	for _, statement := range statements {
		require.NoError(t, database.Exec(statement).Error)
	}
	addProductionRouteRevisionTestColumn(t, database, "production_routes", "route_family_id", "TEXT")
	addProductionRouteRevisionTestColumn(t, database, "production_routes", "revision_no", "INTEGER NOT NULL DEFAULT 0")
	addProductionRouteRevisionTestColumn(t, database, "production_routes", "based_on_route_id", "TEXT")
	addProductionRouteRevisionTestColumn(t, database, "production_route_steps", "branch_operation_name_snapshot", "TEXT NOT NULL DEFAULT ''")
	addProductionRouteRevisionTestColumn(t, database, "production_route_steps", "branch_operation_description_snapshot", "TEXT")
	if includeProductionPlan {
		addProductionRouteRevisionTestColumn(t, database, "production_plans", "production_route_revision_id", "TEXT")
		addProductionRouteRevisionTestColumn(t, database, "production_plans", "production_route_revision_no", "INTEGER NOT NULL DEFAULT 0")
	}
}

func addProductionRouteRevisionTestColumn(t *testing.T, database *gorm.DB, table string, column string, definition string) {
	t.Helper()
	if database.Migrator().HasColumn(table, column) {
		return
	}
	require.NoError(t, database.Exec("ALTER TABLE "+table+" ADD COLUMN "+column+" "+definition).Error)
}

func createProductionRouteRevisionTestRecord(t *testing.T, database *gorm.DB, route models.ProductionRoute) models.ProductionRoute {
	t.Helper()
	saved, err := saveProductionRouteRevisionTestRecord(database, route)
	require.NoError(t, err)
	return saved
}

func saveProductionRouteRevisionTestRecord(database *gorm.DB, route models.ProductionRoute) (models.ProductionRoute, error) {
	routeID := route.ID
	if routeID == "" {
		routeID = uuid.NewString()
		route.ID = routeID
	}
	var routeFamily models.ProductionRouteFamily
	err := database.Where(
		"product_id = ? AND UPPER(bom_owner_type) = ? AND COALESCE(bom_owner_customer_id, '') = ? AND COALESCE(bom_version_level, '') = ?",
		route.ProductID,
		route.BOMOwnerType,
		route.BOMOwnerCustomerID,
		route.BOMVersionLevel,
	).First(&routeFamily).Error
	if err == gorm.ErrRecordNotFound {
		routeFamily = models.ProductionRouteFamily{
			BaseModel:          models.BaseModel{ID: uuid.NewString()},
			Code:               "TEST-FAMILY-" + uuid.NewString(),
			ProductID:          route.ProductID,
			BOMOwnerType:       route.BOMOwnerType,
			BOMOwnerCustomerID: route.BOMOwnerCustomerID,
			BOMVersionLevel:    route.BOMVersionLevel,
		}
		if err := database.Create(&routeFamily).Error; err != nil {
			return models.ProductionRoute{}, err
		}
	} else {
		if err != nil {
			return models.ProductionRoute{}, err
		}
	}

	route.RouteFamilyID = routeFamily.ID
	if route.RevisionNo <= 0 {
		if err := database.Model(&models.ProductionRoute{}).
			Where("route_family_id = ?", routeFamily.ID).
			Select("COALESCE(MAX(revision_no), 0)").Scan(&route.RevisionNo).Error; err != nil {
			return models.ProductionRoute{}, err
		}
		route.RevisionNo++
	}
	if err := database.Create(&route).Error; err != nil {
		return models.ProductionRoute{}, err
	}
	if route.Status == productionRouteStatusPublished {
		if err := database.Model(&routeFamily).Update("current_revision_id", route.ID).Error; err != nil {
			return models.ProductionRoute{}, err
		}
	}
	return route, nil
}
