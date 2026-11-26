package services

import (
	"testing"
	"xdfc-server/models"

	"github.com/glebarez/sqlite"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

func TestSalesOrderLineProductionReferencesBlockDeletionAndProductReplacement(t *testing.T) {
	database, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{Logger: logger.Default.LogMode(logger.Silent)})
	require.NoError(t, err)
	require.NoError(t, database.Exec(`CREATE TABLE production_route_families (
		id TEXT PRIMARY KEY, deleted_at DATETIME, scope_type TEXT NOT NULL, sales_order_line_id INTEGER
	)`).Error)
	require.NoError(t, database.Exec(`CREATE TABLE production_plans (
		id TEXT PRIMARY KEY, deleted_at DATETIME, sales_order_line_id INTEGER
	)`).Error)
	lineID := uint(41)
	require.NoError(t, database.Exec(`INSERT INTO production_route_families (id, scope_type, sales_order_line_id)
		VALUES ('route-line-41', ?, ?)`, productionRouteScopeSalesOrderLine, lineID).Error)
	previous := []models.SalesOrderLine{{ID: lineID, LineNo: 1, ProductID: "product-1"}}

	err = validateSalesOrderLinesAgainstProductionReferencesTx(database, "order-1", previous, nil)
	require.ErrorIs(t, err, ErrSalesOrderLineProtectedByProductionRouteOrPlan)
	err = validateSalesOrderLinesAgainstProductionReferencesTx(database, "order-1", previous, []models.SalesOrderLine{{ID: lineID, LineNo: 1, ProductID: "product-2"}})
	require.ErrorIs(t, err, ErrSalesOrderLineProtectedByProductionRouteOrPlan)
	require.NoError(t, validateSalesOrderLinesAgainstProductionReferencesTx(database, "order-1", previous, []models.SalesOrderLine{{ID: lineID, LineNo: 1, ProductID: "product-1"}}))
	routeModePrevious := []models.SalesOrderLine{{ID: lineID, LineNo: 1, ProductID: "product-1", ProductionRouteMode: "CUSTOM"}}
	routeModeNext := []models.SalesOrderLine{{ID: lineID, LineNo: 1, ProductID: "product-1", ProductionRouteMode: "DEFAULT"}}
	require.NoError(t, validateSalesOrderLinesAgainstProductionReferencesTx(database, "order-1", routeModePrevious, routeModeNext))
	require.NoError(t, database.Exec(`UPDATE production_route_families SET deleted_at = CURRENT_TIMESTAMP WHERE sales_order_line_id = ?`, lineID).Error)
	err = validateSalesOrderLinesAgainstProductionReferencesTx(database, "order-1", previous, nil)
	require.ErrorIs(t, err, ErrSalesOrderLineProtectedByProductionRouteOrPlan)

	planLineID := uint(42)
	require.NoError(t, database.Exec(`INSERT INTO production_plans (id, sales_order_line_id) VALUES ('plan-42', ?)`, planLineID).Error)
	err = validateSalesOrderLinesAgainstProductionReferencesTx(
		database,
		"order-2",
		[]models.SalesOrderLine{{ID: planLineID, LineNo: 2, ProductID: "product-1"}},
		nil,
	)
	require.ErrorIs(t, err, ErrSalesOrderLineProtectedByProductionRouteOrPlan)
	planModePrevious := []models.SalesOrderLine{{ID: planLineID, LineNo: 2, ProductID: "product-1", ProductionRouteMode: "CUSTOM"}}
	planModeNext := []models.SalesOrderLine{{ID: planLineID, LineNo: 2, ProductID: "product-1", ProductionRouteMode: "DEFAULT"}}
	err = validateSalesOrderLinesAgainstProductionReferencesTx(database, "order-2", planModePrevious, planModeNext)
	require.ErrorIs(t, err, ErrSalesOrderLineProtectedByProductionRouteOrPlan)
	require.NoError(t, database.Exec(`UPDATE production_plans SET deleted_at = CURRENT_TIMESTAMP WHERE id = 'plan-42'`).Error)
	err = validateSalesOrderLinesAgainstProductionReferencesTx(
		database,
		"order-2",
		[]models.SalesOrderLine{{ID: planLineID, LineNo: 2, ProductID: "product-1"}},
		nil,
	)
	require.ErrorIs(t, err, ErrSalesOrderLineProtectedByProductionRouteOrPlan)
}
