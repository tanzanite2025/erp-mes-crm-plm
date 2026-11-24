package services

import (
	"testing"
	"xdfc-server/models"

	"github.com/stretchr/testify/require"
)

func TestProductionRouteSelectsProcessLibraryWithoutL2Selection(t *testing.T) {
	service, database := newProductionRouteLifecycleTestService(t)
	seedProductionRouteLifecycleReferences(t, database)
	require.NoError(t, database.Unscoped().Delete(&models.ProductionBOMBranchOperationProcessLibrarySelection{}, "id = ?", "selection-forming").Error)

	validRoute, err := service.SaveProductionRoute(SaveProductionRouteRequest{
		Route:    productionRouteLifecycleDTO("DRAFT", "branch-operation-outer"),
		Operator: "operator",
	})
	require.NoError(t, err)
	require.Equal(t, "branch-operation-outer", validRoute.Steps[0].BranchOperationID)

	validRoute.Steps[0].BranchOperationID = ""
	validRoute.Steps[0].ProcessLibraryID = "library-forming"
	validRoute, err = service.SaveProductionRoute(SaveProductionRouteRequest{
		Route:    validRoute,
		Operator: "operator",
	})
	require.NoError(t, err)

	require.NoError(t, database.Model(&models.ProcessStep{}).
		Where("id = ?", "library-forming").Update("is_active", false).Error)
	validRoute.Steps[0].BranchOperationID = ""
	validRoute.Steps[0].ProcessLibraryID = "library-forming"
	_, err = service.SaveProductionRoute(SaveProductionRouteRequest{
		Route:    validRoute,
		Operator: "operator",
	})
	require.ErrorIs(t, err, ErrInvalidProductionRoute)
}
