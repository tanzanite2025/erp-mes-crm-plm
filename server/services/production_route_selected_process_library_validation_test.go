package services

import (
	"testing"
	"xdfc-server/models"

	"github.com/stretchr/testify/require"
)

func TestProductionRouteAcceptsOnlyActiveSelectedProcessLibraryOperations(t *testing.T) {
	service, database := newProductionRouteLifecycleTestService(t)
	seedProductionRouteLifecycleReferences(t, database)

	validRoute, err := service.SaveProductionRoute(SaveProductionRouteRequest{
		Route:    productionRouteLifecycleDTO("DRAFT", "branch-operation-outer"),
		Operator: "operator",
	})
	require.NoError(t, err)
	require.Equal(t, "branch-operation-outer", validRoute.Steps[0].BranchOperationID)

	_, err = service.SaveProductionRoute(SaveProductionRouteRequest{
		Route:    productionRouteLifecycleDTO("DRAFT", "branch-operation-forming"),
		Operator: "operator",
	})
	require.ErrorIs(t, err, ErrInvalidProductionRoute)

	require.NoError(t, database.Model(&models.ProcessStep{}).
		Where("id = ?", "library-outer").Update("is_active", false).Error)
	_, err = service.SaveProductionRoute(SaveProductionRouteRequest{
		Route:    productionRouteLifecycleDTO("DRAFT", "branch-operation-outer"),
		Operator: "operator",
	})
	require.ErrorIs(t, err, ErrInvalidProductionRoute)
}
