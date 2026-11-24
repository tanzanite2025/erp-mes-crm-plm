package services

import (
	"testing"

	"xdfc-server/models"

	"github.com/google/uuid"
	"github.com/stretchr/testify/require"
)

func TestProductionMindmapL1DeactivationL2RemovalAndLineDeletionPreserveSharedBranchOperationsRoutesAndFacts(t *testing.T) {
	service, database := newProductionTopologyL1TemplateTestService(t)
	for _, column := range []string{"CreatedAt", "RevisionNo", "EffectiveFrom", "EffectiveTo", "ChangeType", "ChangeOrderNo", "SiteCode", "IsDefaultSite", "ComponentKey", "Description", "Version"} {
		require.NoError(t, database.Migrator().AddColumn(&models.ProductTemplate{}, column))
	}
	manager := productionTopologyL1TemplateTestTransactionManager{database: database}
	template := models.ProductTemplate{BaseModel: models.BaseModel{ID: uuid.NewString()}, Code: "INDEPENDENT-L1", Name: "独立模板", Active: true}
	insertProductionTopologyProductTemplateForTest(t, manager, template)
	seedProductionTopologyBOMBranchForTest(t, manager, "shared-product", "SHARED-SKU", "共享产品", "shared-bom", "INTERNAL", "", "standard", models.BOMStatusReleased, nil)
	require.NoError(t, database.Create(&models.ProcessStep{BaseModel: models.BaseModel{ID: "shared-library-operation"}, Code: "SHARED-OP", Name: "共享分支工序", IsActive: true}).Error)
	selectedOperations, err := service.SaveProductionBOMBranchOperationSelection(SaveProductionBOMBranchOperationSelectionRequest{
		ProductID: "shared-product", BOMOwnerType: "INTERNAL", BOMVersionLevel: "standard", ProcessLibraryIDs: []string{"shared-library-operation"},
	})
	require.NoError(t, err)
	operation := selectedOperations[0]
	lineIDs := []string{uuid.NewString(), uuid.NewString(), uuid.NewString()}
	for index, lineID := range lineIDs {
		require.NoError(t, database.Exec(`INSERT INTO production_lines (id, code, name, product_template_id, version, is_active)
			VALUES (?, ?, ?, ?, 1, true)`, lineID, "LINE-"+lineID, template.Name, template.ID).Error)
		require.NoError(t, database.Exec(`INSERT INTO line_segments (id, line_id, name, product_id, bom_owner_type, bom_owner_customer_id, bom_version_level)
			VALUES (?, ?, '共享分支', 'shared-product', 'INTERNAL', '', 'standard')`, uuid.NewString(), lineIDs[index]).Error)
	}
	require.NoError(t, database.Exec(`CREATE TABLE production_routes (id TEXT PRIMARY KEY, deleted_at DATETIME, status TEXT)`).Error)
	require.NoError(t, database.Exec(`CREATE TABLE production_route_steps (id TEXT PRIMARY KEY, route_id TEXT, branch_operation_id TEXT, deleted_at DATETIME)`).Error)
	require.NoError(t, database.Exec(`CREATE TABLE production_operation_executions (id TEXT PRIMARY KEY, branch_operation_id TEXT, deleted_at DATETIME)`).Error)
	require.NoError(t, database.Exec(`INSERT INTO production_routes (id, status) VALUES ('shared-route', 'PUBLISHED')`).Error)
	require.NoError(t, database.Exec(`INSERT INTO production_route_steps (id, route_id, branch_operation_id) VALUES ('shared-step', 'shared-route', ?)`, operation.ID).Error)
	require.NoError(t, database.Exec(`INSERT INTO production_operation_executions (id, branch_operation_id) VALUES ('shared-execution', ?)`, operation.ID).Error)
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
	line, err = service.SaveProductionLine(SaveProductionLineRequest{Line: line, AuthCode: "622575"})
	require.NoError(t, err)
	line.Segments = nil
	_, err = service.SaveProductionLine(SaveProductionLineRequest{Line: line, AuthCode: "622575"})
	require.NoError(t, err)
	require.NoError(t, service.DeleteProductionLine(line.ID, "test", ""))
	lines, err = service.ListProductionLines()
	require.NoError(t, err)
	require.Len(t, lines, 1)
	require.Equal(t, lineIDs[1], lines[0].ID)
	require.Len(t, lines[0].Segments, 1)
	require.Len(t, lines[0].Segments[0].BranchOperations, 1)
	require.Equal(t, operation.ID, lines[0].Segments[0].BranchOperations[0].ID)
	require.True(t, lines[0].Segments[0].BranchOperations[0].IsActive)
	for _, table := range []string{"production_routes", "production_route_steps", "production_operation_executions"} {
		var count int64
		require.NoError(t, database.Table(table).Where("deleted_at IS NULL").Count(&count).Error)
		require.EqualValues(t, 1, count, table)
	}
}
