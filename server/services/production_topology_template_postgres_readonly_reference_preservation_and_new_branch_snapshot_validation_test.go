package services

import (
	"encoding/json"
	"testing"

	"xdfc-server/models"

	"github.com/google/uuid"
	"github.com/stretchr/testify/require"
)

func TestProductionTopologyTemplatePostgresSavePreservesExistingReadonlyReferencesAfterActualOperationsChange(t *testing.T) {
	database, service, source, template := captureProductionTopologyTemplatePostgresFixture(t)
	originalBranch := template.Snapshot.Branches[0]
	require.NoError(t, database.Model(&models.ProductionBOMBranchOperation{}).Where("product_id = ?", source.Segments[0].ProductID).
		Update("name", "实际工序后续修改").Error)
	actualFacts := snapshotProductionTopologyTemplateActualBranchFacts(t, database)
	requestContent, err := json.Marshal(template.Snapshot)
	require.NoError(t, err)
	var snapshot ProductionTopologyTemplateSnapshot
	require.NoError(t, json.Unmarshal(requestContent, &snapshot))
	snapshot.ProductTemplateName, snapshot.SourceLineCode = "伪造产品模板名称", "伪造来源编码"
	snapshot.Branches[0].Name, snapshot.Branches[0].ProductSKU = "伪造型号名称", "FORGED-SKU"
	snapshot.Branches[0].OperationReferences = []ProductionTopologyTemplateOperationReferenceSnapshot{{Name: "伪造工序快照", IsActive: false}}
	snapshot.Branches[0].Description = "允许修改模板分支说明"
	snapshot.Branches[0].Attributes = json.RawMessage(`{"fixture":"editable-template-value"}`)
	saved, err := service.SaveProductionTopologyTemplateSnapshot(template.ID, SaveProductionTopologyTemplateSnapshotRequest{
		Name: template.Name, Version: template.Version, Snapshot: snapshot}, "test", "")
	require.NoError(t, err)
	require.Equal(t, template.Snapshot.ProductTemplateName, saved.Snapshot.ProductTemplateName)
	require.Equal(t, template.Snapshot.SourceLineCode, saved.Snapshot.SourceLineCode)
	require.Equal(t, originalBranch.Name, saved.Snapshot.Branches[0].Name)
	require.Equal(t, originalBranch.ProductSKU, saved.Snapshot.Branches[0].ProductSKU)
	require.Equal(t, originalBranch.OperationReferences, saved.Snapshot.Branches[0].OperationReferences)
	require.Equal(t, "允许修改模板分支说明", saved.Snapshot.Branches[0].Description)
	require.JSONEq(t, string(snapshot.Branches[0].Attributes), string(saved.Snapshot.Branches[0].Attributes))
	requireProductionTopologyTemplateActualBranchFactsUnchanged(t, database, actualFacts)
}

func TestProductionTopologyTemplatePostgresNewBranchCapturesCurrentReferencesWithoutCopyingFromClient(t *testing.T) {
	database, service, source, template := captureProductionTopologyTemplatePostgresFixture(t)
	operation := models.ProductionBOMBranchOperation{ProductID: source.Segments[0].ProductID, BOMOwnerType: "INTERNAL",
		BOMVersionLevel: "lightweight", Name: "轻量分支真实工序", Description: "真实说明", SortOrder: 5, IsActive: true}
	require.NoError(t, database.Create(&operation).Error)
	processLibrary := models.ProcessStep{Code: "LIGHTWEIGHT-BRANCH-OP", Name: operation.Name, Description: operation.Description, IsActive: true}
	require.NoError(t, database.Create(&processLibrary).Error)
	require.NoError(t, database.Create(&models.ProductionBOMBranchOperationProcessLibrarySelection{
		ProductID: operation.ProductID, BOMOwnerType: operation.BOMOwnerType, BOMVersionLevel: operation.BOMVersionLevel,
		BranchOperationID: operation.ID, ProcessLibraryID: processLibrary.ID,
	}).Error)
	actualFacts := snapshotProductionTopologyTemplateActualBranchFacts(t, database)
	newBranch := template.Snapshot.Branches[0]
	newBranch.BOMVersionLevel, newBranch.Name, newBranch.ProductSKU = "lightweight", "伪造分支名称", "FORGED-SKU"
	newBranch.OperationReferences = []ProductionTopologyTemplateOperationReferenceSnapshot{{Name: "伪造工序参考"}}
	request := SaveProductionTopologyTemplateSnapshotRequest{Name: template.Name, Version: template.Version, Snapshot: template.Snapshot}
	request.Snapshot.Branches = append(request.Snapshot.Branches, newBranch)
	saved, err := service.SaveProductionTopologyTemplateSnapshot(template.ID, request, "test", "")
	require.NoError(t, err)
	require.Len(t, saved.Snapshot.Branches, 2)
	actualReference := saved.Snapshot.Branches[1]
	require.Contains(t, actualReference.Name, "lightweight")
	require.Equal(t, "MBOM-TEST", actualReference.ProductSKU)
	require.Equal(t, []ProductionTopologyTemplateOperationReferenceSnapshot{{Name: operation.Name, Description: operation.Description,
		SortOrder: operation.SortOrder, IsActive: operation.IsActive}}, actualReference.OperationReferences)
	require.Equal(t, template.Snapshot.Branches[0].OperationReferences, saved.Snapshot.Branches[0].OperationReferences)
	requireProductionTopologyTemplateActualBranchFactsUnchanged(t, database, actualFacts)
}

func TestProductionTopologyTemplatePostgresRejectsNewInvalidBranchesAndKeepsExistingExpiredReferenceEditable(t *testing.T) {
	for _, condition := range []string{"missing_branch", "expired_new_branch", "unreleased_new_branch", "inactive_product"} {
		t.Run(condition, func(t *testing.T) {
			database, service, source, template := captureProductionTopologyTemplatePostgresFixture(t)
			newBranch := template.Snapshot.Branches[0]
			newBranch.BOMVersionLevel = "lightweight"
			switch condition {
			case "missing_branch":
				newBranch.ProductID = uuid.NewString()
			case "expired_new_branch":
				require.NoError(t, database.Exec(`UPDATE boms SET effective_to = CURRENT_TIMESTAMP - interval '1 day' WHERE version_level = 'lightweight'`).Error)
			case "unreleased_new_branch":
				require.NoError(t, database.Exec(`UPDATE boms SET status = 'DRAFT' WHERE version_level = 'lightweight'`).Error)
			case "inactive_product":
				require.NoError(t, database.Exec(`UPDATE products SET status = 'INACTIVE' WHERE id = ?`, source.Segments[0].ProductID).Error)
			}
			request := SaveProductionTopologyTemplateSnapshotRequest{Name: "拒绝非法分支", Version: template.Version, Snapshot: template.Snapshot}
			request.Snapshot.Branches = append(request.Snapshot.Branches, newBranch)
			_, err := service.SaveProductionTopologyTemplateSnapshot(template.ID, request, "test", "")
			require.ErrorIs(t, err, ErrInvalidProductionTopologyTemplate)
			items, err := service.ListProductionTopologyTemplateSnapshots()
			require.NoError(t, err)
			require.Len(t, items, 1)
			require.Equal(t, template, items[0])
			var auditCount int64
			require.NoError(t, database.Table("audit_logs").Count(&auditCount).Error)
			require.EqualValues(t, 3, auditCount)
		})
	}
	t.Run("existing_expired_branch_is_editable_and_removable", func(t *testing.T) {
		database, service, _, template := captureProductionTopologyTemplatePostgresFixture(t)
		require.NoError(t, database.Exec(`UPDATE boms SET effective_to = CURRENT_TIMESTAMP - interval '1 day'`).Error)
		request := SaveProductionTopologyTemplateSnapshotRequest{Name: template.Name, Version: template.Version, Snapshot: template.Snapshot}
		request.Snapshot.Branches[0].Description = "失效后仍可维护模板说明"
		saved, err := service.SaveProductionTopologyTemplateSnapshot(template.ID, request, "test", "")
		require.NoError(t, err)
		require.Equal(t, "失效后仍可维护模板说明", saved.Snapshot.Branches[0].Description)
		_, err = service.ApplyProductionTopologyTemplateToNewLine(saved.ID, ApplyProductionTopologyTemplateToNewLineRequest{Code: "EXPIRED-MUST-NOT-APPLY", Version: saved.Version}, "test", "")
		require.ErrorIs(t, err, ErrInvalidProductionLineBOMBranch)
		request.Version, request.Snapshot = saved.Version, saved.Snapshot
		request.Snapshot.Branches = nil
		saved, err = service.SaveProductionTopologyTemplateSnapshot(template.ID, request, "test", "")
		require.NoError(t, err)
		require.Empty(t, saved.Snapshot.Branches)
	})
}
