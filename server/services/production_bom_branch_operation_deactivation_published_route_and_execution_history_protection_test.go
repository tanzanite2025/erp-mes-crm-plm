package services

import (
	"testing"

	"xdfc-server/models"

	"github.com/stretchr/testify/require"
)

func TestProductionBOMBranchOperationPublishedRoutePreventsDeactivationButAllowsDescriptionEditing(t *testing.T) {
	service, database := newProductionRouteLifecycleTestService(t)
	seedProductionRouteLifecycleReferences(t, database)
	route, err := service.SaveProductionRoute(SaveProductionRouteRequest{Route: productionRouteLifecycleDTO("DRAFT", "branch-operation-forming")})
	require.NoError(t, err)
	_, err = service.PublishProductionRoute(route.ID, route.Version, "test", "")
	require.NoError(t, err)
	var operation models.ProductionBOMBranchOperation
	require.NoError(t, database.First(&operation, "id = ?", "branch-operation-forming").Error)
	request := SaveProductionBOMBranchOperationRequest{Operation: mapProductionBOMBranchOperationToDTO(operation)}
	request.Operation.Description = "独立维护工序说明"
	_, err = service.SaveProductionBOMBranchOperation(request)
	require.NoError(t, err)
	request.Operation.IsActive = false
	request.Operation.Name = "不应随失败停用写入的名称"
	_, err = service.SaveProductionBOMBranchOperation(request)
	require.ErrorIs(t, err, ErrProductionBOMBranchOperationDeactivationBlocked)
	require.ErrorContains(t, err, "已发布生产路线")
	require.NoError(t, database.First(&operation, "id = ?", operation.ID).Error)
	require.True(t, operation.IsActive)
	require.Equal(t, "成型", operation.Name)
	require.Equal(t, "独立维护工序说明", operation.Description)
}

func TestProductionBOMBranchOperationDraftReferenceAllowsDeactivationAndThenPreventsPublication(t *testing.T) {
	service, database := newProductionRouteLifecycleTestService(t)
	seedProductionRouteLifecycleReferences(t, database)
	route, err := service.SaveProductionRoute(SaveProductionRouteRequest{Route: productionRouteLifecycleDTO("DRAFT", "branch-operation-forming")})
	require.NoError(t, err)
	var operation models.ProductionBOMBranchOperation
	require.NoError(t, database.First(&operation, "id = ?", "branch-operation-forming").Error)
	request := SaveProductionBOMBranchOperationRequest{Operation: mapProductionBOMBranchOperationToDTO(operation)}
	request.Operation.IsActive = false
	deactivated, err := service.SaveProductionBOMBranchOperation(request)
	require.NoError(t, err)
	require.False(t, deactivated.IsActive)
	_, err = service.PublishProductionRoute(route.ID, route.Version, "test", "")
	require.ErrorIs(t, err, ErrInvalidProductionRoute)
	var savedRoute models.ProductionRoute
	require.NoError(t, database.First(&savedRoute, "id = ?", route.ID).Error)
	require.Equal(t, "DRAFT", savedRoute.Status)
	require.Equal(t, route.Version, savedRoute.Version)
	request.Operation.IsActive = true
	_, err = service.SaveProductionBOMBranchOperation(request)
	require.NoError(t, err)
	_, err = service.PublishProductionRoute(route.ID, route.Version, "test", "")
	require.NoError(t, err)
}

func TestProductionBOMBranchOperationExecutionReferencesPreventDeactivationIncludingSoftDeletedHistory(t *testing.T) {
	for _, reference := range []struct{ table, column, otherColumn string }{
		{"product_barcode_states", "current_branch_operation_id", ""},
		{"product_barcode_state_events", "from_branch_operation_id", "to_branch_operation_id"},
		{"product_barcode_state_events", "to_branch_operation_id", "from_branch_operation_id"},
		{"product_barcode_transfer_events", "from_branch_operation_id", "to_branch_operation_id"},
		{"product_barcode_transfer_events", "to_branch_operation_id", "from_branch_operation_id"},
		{"production_operation_executions", "branch_operation_id", ""},
		{"production_outsource_transfers", "branch_operation_id", ""},
		{"production_outsource_inspections", "branch_operation_id", ""},
	} {
		t.Run(reference.table+"_"+reference.column, func(t *testing.T) {
			service, database := newProductionRouteLifecycleTestService(t)
			seedProductionRouteLifecycleReferences(t, database)
			columns := reference.column + " TEXT"
			if reference.otherColumn != "" {
				columns += ", " + reference.otherColumn + " TEXT"
			}
			require.NoError(t, database.Exec("CREATE TABLE IF NOT EXISTS "+reference.table+" (id TEXT PRIMARY KEY, deleted_at DATETIME, "+columns+")").Error)
			fact := map[string]any{"id": "historical-reference", reference.column: "branch-operation-forming"}
			if reference.table == "production_operation_executions" {
				fact["product_barcode"], fact["production_work_location_id"] = "HISTORY-001", "work-location"
			}
			require.NoError(t, database.Table(reference.table).Create(fact).Error)
			var operation models.ProductionBOMBranchOperation
			require.NoError(t, database.First(&operation, "id = ?", "branch-operation-forming").Error)
			request := SaveProductionBOMBranchOperationRequest{Operation: mapProductionBOMBranchOperationToDTO(operation)}
			request.Operation.IsActive = false
			_, err := service.SaveProductionBOMBranchOperation(request)
			require.ErrorIs(t, err, ErrProductionBOMBranchOperationDeactivationBlocked)
			require.NoError(t, database.Table(reference.table).Where("id = ?", fact["id"]).Update("deleted_at", "2026-11-17 00:00:00").Error)
			_, err = service.SaveProductionBOMBranchOperation(request)
			require.ErrorIs(t, err, ErrProductionBOMBranchOperationDeactivationBlocked)
			require.NoError(t, database.First(&operation, "id = ?", operation.ID).Error)
			require.True(t, operation.IsActive)

			var unrelated models.ProductionBOMBranchOperation
			require.NoError(t, database.First(&unrelated, "id = ?", "branch-operation-outer").Error)
			unrelatedRequest := SaveProductionBOMBranchOperationRequest{Operation: mapProductionBOMBranchOperationToDTO(unrelated)}
			unrelatedRequest.Operation.IsActive = false
			_, err = service.SaveProductionBOMBranchOperation(unrelatedRequest)
			require.NoError(t, err, "references to another operation must not block this operation")
		})
	}
}
