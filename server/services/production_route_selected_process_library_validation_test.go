package services

import (
	"testing"
	"xdfc-server/models"

	"github.com/stretchr/testify/require"
)

func TestProductionRouteRejectsProcessLibraryWithoutBranchSelection(t *testing.T) {
	service, database := newProductionRouteLifecycleTestService(t)
	seedProductionRouteLifecycleReferences(t, database)
	require.NoError(t, database.Create(&models.ProcessStep{
		BaseModel: models.BaseModel{ID: "library-route-direct"}, Code: "DIRECT", Name: "路线直接选择工序", IsActive: true,
	}).Error)
	require.NoError(t, database.Unscoped().Delete(&models.ProductionMBOMBranchProcessAssociation{}, "id = ?", "selection-forming").Error)

	route := productionRouteLifecycleDTO("DRAFT", "library-route-direct")
	_, err := service.SaveProductionRoute(SaveProductionRouteRequest{
		Route:    route,
		Operator: "operator",
	})
	require.ErrorIs(t, err, ErrInvalidProductionRoute)
	require.Contains(t, err.Error(), "not configured for the selected MBOM branch")

	var routeCount int64
	require.NoError(t, database.Model(&models.ProductionRoute{}).
		Where("code = ?", route.Code).Count(&routeCount).Error)
	require.Zero(t, routeCount)
}

func TestProductionRouteRejectsInactiveSelectedProcessLibrary(t *testing.T) {
	service, database := newProductionRouteLifecycleTestService(t)
	seedProductionRouteLifecycleReferences(t, database)
	require.NoError(t, database.Model(&models.ProcessStep{}).
		Where("id = ?", "library-forming").Update("is_active", false).Error)

	route := productionRouteLifecycleDTO("DRAFT", "library-forming")
	_, err := service.SaveProductionRoute(SaveProductionRouteRequest{
		Route:    route,
		Operator: "operator",
	})
	require.ErrorIs(t, err, ErrInvalidProductionRoute)
}
