package services

import (
	"testing"

	"xdfc-server/models"

	"github.com/stretchr/testify/require"
)

func TestDeletingProductionLineDoesNotChangeBranchProcessOrExecutionFacts(t *testing.T) {
	service, database := newProductionServiceTestHarness(t)
	manager := productionServiceTestTransactionManager{database: database}
	seedProductionServiceMBOMBranchForTest(t, manager, "shared-product", "SHARED-SKU", "共享产品", "shared-bom", "INTERNAL", "", "standard", models.BOMStatusReleased, nil)
	require.NoError(t, database.Create(&models.ProcessStep{BaseModel: models.BaseModel{ID: "shared-library-operation"}, Code: "SHARED-OP", Name: "共享分支工序", IsActive: true}).Error)
	_, err := service.SaveProductionMBOMBranchProcessSelection(SaveProductionMBOMBranchProcessSelectionRequest{
		ProductID: "shared-product", BOMOwnerType: "INTERNAL", BOMVersionLevel: "standard", ProcessStepIDs: []string{"shared-library-operation"},
	})
	require.NoError(t, err)
	processStep := models.ProcessStep{BaseModel: models.BaseModel{ID: "shared-library-operation"}}
	lineIDs := []string{"line-delete-a", "line-delete-b", "line-delete-c"}
	lineNames := []string{"产线 A", "产线 B", "产线 C"}
	for index, lineID := range lineIDs {
		require.NoError(t, database.Exec(`INSERT INTO production_lines (id, code, name, version, is_active)
			VALUES (?, ?, ?, 1, true)`, lineID, "LINE-"+lineID, lineNames[index]).Error)
	}
	require.NoError(t, database.Exec(`CREATE TABLE IF NOT EXISTS production_routes (id TEXT PRIMARY KEY, deleted_at DATETIME, status TEXT)`).Error)
	require.NoError(t, database.Exec(`CREATE TABLE IF NOT EXISTS production_route_steps (id TEXT PRIMARY KEY, route_id TEXT, process_step_id TEXT, deleted_at DATETIME)`).Error)
	require.NoError(t, database.Exec(`CREATE TABLE production_operation_executions (id TEXT PRIMARY KEY, process_step_id TEXT, deleted_at DATETIME)`).Error)
	require.NoError(t, database.Exec(`INSERT INTO production_routes (id) VALUES ('shared-route')`).Error)
	require.NoError(t, database.Exec(`INSERT INTO production_route_steps (id, route_id, process_step_id) VALUES ('shared-step', 'shared-route', ?)`, processStep.ID).Error)
	require.NoError(t, database.Exec(`INSERT INTO production_operation_executions (id, process_step_id) VALUES ('shared-execution', ?)`, processStep.ID).Error)
	require.NoError(t, service.DeleteProductionLine(lineIDs[2], "test", ""))
	lines, err := service.ListProductionLines()
	require.NoError(t, err)
	var line ProductionLineDTO
	for _, candidate := range lines {
		if candidate.ID == lineIDs[0] {
			line = candidate
		}
	}
	require.NotEmpty(t, line.ID)
	line.IsActive = false
	line, err = service.SaveProductionLine(SaveProductionLineRequest{Line: line, AuthCode: "local-development-only"})
	require.NoError(t, err)
	require.NoError(t, service.DeleteProductionLine(line.ID, "test", ""))
	lines, err = service.ListProductionLines()
	require.NoError(t, err)
	require.Len(t, lines, 1)
	require.Equal(t, lineIDs[1], lines[0].ID)
	var branchProcessCount int64
	require.NoError(t, database.Model(&models.ProductionMBOMBranchProcessAssociation{}).
		Where("product_id = ? AND process_step_id = ?", "shared-product", "shared-library-operation").Count(&branchProcessCount).Error)
	require.EqualValues(t, 1, branchProcessCount)
	for _, table := range []string{"production_routes", "production_route_steps", "production_operation_executions"} {
		var count int64
		require.NoError(t, database.Table(table).Where("deleted_at IS NULL").Count(&count).Error)
		require.EqualValues(t, 1, count, table)
	}
}
