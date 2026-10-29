package routes

import (
	"encoding/json"
	"net/http"
	"testing"
	"xdfc-server/authz"
	"xdfc-server/models"
	"xdfc-server/services"

	"github.com/stretchr/testify/require"
)

func TestProductionMaterialIssuanceActiveOrderProgressHTTPRequiresProductionAccessViewAndIdentity(t *testing.T) {
	openProductionMaterialIssuanceReadonlyHTTPTestDatabase(t)
	for _, permissions := range [][]string{
		nil, {authz.MenuMrp}, {authz.ActionProductionMaterialIssuanceView},
		{authz.MenuWarehouse, authz.ActionProductionMaterialIssuanceView},
		{"tab_mrp_production_material_issuance_guide", authz.ActionProductionMaterialIssuanceView},
	} {
		response := requestProductionMaterialIssuanceReadonlyHTTPRoute(permissions, "reader", "GET", "/active-order-progress", "")
		require.Equal(t, http.StatusForbidden, response.Code, response.Body.String())
	}
	response := requestProductionMaterialIssuanceReadonlyHTTPRoute([]string{authz.MenuMrp, authz.ActionProductionMaterialIssuanceView}, "", "GET", "/active-order-progress", "")
	require.Equal(t, http.StatusUnauthorized, response.Code)
}

func TestProductionMaterialIssuanceActiveOrderProgressHTTPReturnsFullScopeBeforePaginationAndRejectsUnknownOrRepeatedInput(t *testing.T) {
	database, source := openProductionMaterialIssuanceReadonlyHTTPTestDatabase(t)
	permissions := []string{authz.TabMrpProductionMaterialIssuance, authz.ActionProductionMaterialIssuanceView}
	response := requestProductionMaterialIssuanceReadonlyHTTPRoute(permissions, "reader", "GET", "/active-order-progress?pageSize=1", "")
	require.Equal(t, http.StatusOK, response.Code, response.Body.String())
	require.Equal(t, "no-store", response.Header().Get("Cache-Control"))
	var result services.ProductionMaterialIssuanceActiveProgressResponse
	require.NoError(t, json.Unmarshal(response.Body.Bytes(), &result))
	require.Equal(t, 1, result.Scope.SourceLineCount)
	require.Equal(t, 1, result.Scope.UndispatchedLineCount)
	require.True(t, result.Scope.IsComplete)
	require.Equal(t, source.SalesOrderLineID, result.OrderLines[0].SalesOrderLineID)
	require.Equal(t, 50.0, result.Materials[0].RemainingQty)
	for _, invalid := range []string{"?pageSize=101", "?ordersPage=0", "?materialsPage=-1", "?ordersPage=", "?ordersPage=1&ordersPage=2", "?page=1", "?customerId=forged", "?pageSize=100&ordersPage=9223372036854775807"} {
		response = requestProductionMaterialIssuanceReadonlyHTTPRoute(permissions, "reader", "GET", "/active-order-progress"+invalid, "")
		require.Equal(t, http.StatusBadRequest, response.Code, response.Body.String())
	}
	for _, model := range []any{&models.ProductionMaterialIssuanceDocument{}, &models.ProductionMaterialIssuanceSourceSnapshot{}, &models.ProductionMaterialIssuanceActiveSourceCoverage{}, &models.ProductionMaterialIssuanceCommandReceipt{}, &models.AuditLog{}} {
		var count int64
		require.NoError(t, database.Model(model).Count(&count).Error)
		require.Zero(t, count)
	}
	require.NoError(t, database.Exec(`DROP TABLE boms`).Error)
	response = requestProductionMaterialIssuanceReadonlyHTTPRoute(permissions, "reader", "GET", "/active-order-progress", "")
	require.Equal(t, http.StatusInternalServerError, response.Code)
	require.NotContains(t, response.Body.String(), "SELECT")
}
