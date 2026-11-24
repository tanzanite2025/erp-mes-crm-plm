package services

import (
	"encoding/json"
	"fmt"
	"testing"

	"xdfc-server/models"

	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
)

func captureProductionTopologyTemplatePostgresFixture(t *testing.T) (*gorm.DB, *ProductionService, ProductionLineDTO, ProductionTopologyTemplateDTO) {
	t.Helper()
	database, service, source, _ := createProductionLinePostgresL2OwnershipFixture(t)
	require.NoError(t, database.AutoMigrate(&models.ProductionTopologyTemplate{}))
	template, err := service.CaptureProductionTopologyTemplateFromLine(CaptureProductionTopologyTemplateFromLineRequest{
		SourceLineID: source.ID, SourceLineVersion: source.Version, Name: "独立模板", Description: "复制而不关联"}, "test", "")
	require.NoError(t, err)
	require.Len(t, template.Snapshot.Branches, 1)
	require.Len(t, template.Snapshot.Branches[0].OperationReferences, 1)
	return database, service, source, template
}

func requireProductionTopologyTemplateActualBranchFactsUnchanged(t *testing.T, database *gorm.DB, before map[string]string) {
	t.Helper()
	for table, content := range before {
		var current string
		require.NoError(t, database.Raw("SELECT COALESCE(jsonb_agg(to_jsonb(facts) ORDER BY id)::text, '[]') FROM "+table+" facts").Scan(&current).Error)
		require.Equal(t, content, current, table+" must not be changed by template writes or application")
	}
}

func snapshotProductionTopologyTemplateActualBranchFacts(t *testing.T, database *gorm.DB) map[string]string {
	t.Helper()
	result := make(map[string]string)
	for _, table := range []string{"production_bom_branch_operations", "production_routes", "production_route_steps", "production_operation_executions", "product_barcode_states"} {
		var content string
		require.NoError(t, database.Raw("SELECT COALESCE(jsonb_agg(to_jsonb(facts) ORDER BY id)::text, '[]') FROM "+table+" facts").Scan(&content).Error)
		result[table] = content
	}
	return result
}

func TestProductionTopologyTemplatePostgresSnapshotAndActualStructuresRemainIndependentBothDirections(t *testing.T) {
	database, service, source, template := captureProductionTopologyTemplatePostgresFixture(t)
	serialized, err := json.Marshal(template.Snapshot)
	require.NoError(t, err)
	require.NotContains(t, string(serialized), source.ID)
	require.NotContains(t, string(serialized), source.Segments[0].ID)
	var operation models.ProductionBOMBranchOperation
	require.NoError(t, database.First(&operation).Error)
	require.NotContains(t, string(serialized), operation.ID)
	operation.Name = "实际工序已更新"
	_, err = service.SaveProductionBOMBranchOperation(SaveProductionBOMBranchOperationRequest{Operation: mapProductionBOMBranchOperationToDTO(operation)})
	require.NoError(t, err)
	require.NoError(t, database.Exec(`UPDATE products SET sku = 'CURRENT-SKU', name = '当前产品名称' WHERE id = ?`, source.Segments[0].ProductID).Error)
	require.NoError(t, database.Model(&models.ProductTemplate{}).Where("id = ?", source.ProductTemplateID).Update("name", "当前产品模板名称").Error)
	actualFacts := snapshotProductionTopologyTemplateActualBranchFacts(t, database)
	applied := make([]ProductionLineDTO, 2)
	for index := range applied {
		applied[index], err = service.ApplyProductionTopologyTemplateToNewLine(template.ID, ApplyProductionTopologyTemplateToNewLineRequest{Version: template.Version, Code: fmt.Sprintf("APPLIED-%d", index)}, "test", "")
		require.NoError(t, err)
		require.NotEqual(t, source.ID, applied[index].ID)
		require.NotEqual(t, source.Segments[0].ID, applied[index].Segments[0].ID)
		require.Equal(t, "实际工序已更新", applied[index].Segments[0].BranchOperations[0].Name)
		require.Equal(t, "CURRENT-SKU", applied[index].Segments[0].ProductSKU)
		require.Equal(t, "当前产品模板名称", applied[index].Name)
	}
	require.NotEqual(t, applied[0].ID, applied[1].ID)
	require.NotEqual(t, applied[0].Segments[0].ID, applied[1].Segments[0].ID)
	request := SaveProductionTopologyTemplateSnapshotRequest{Name: "修改模板不会改实际", Description: "模板新说明", Version: template.Version, Snapshot: template.Snapshot}
	require.NotEqual(t, "CURRENT-SKU", template.Snapshot.Branches[0].ProductSKU, "captured product names stay independent of current master data")
	request.Snapshot.LineDescription = "模板新 L1 说明"
	request.Snapshot.Branches[0].Description = "模板新分支说明"
	request.Snapshot.Branches[0].OperationReferences[0].Name = "模板参考被修改也不得回写实际"
	template, err = service.SaveProductionTopologyTemplateSnapshot(template.ID, request, "test", "")
	require.NoError(t, err)
	requireProductionTopologyTemplateActualBranchFactsUnchanged(t, database, actualFacts)
	for _, unchanged := range append(applied, source) {
		persisted, err := service.repository.GetProductionLineByID(database, unchanged.ID)
		require.NoError(t, err)
		require.Empty(t, persisted.Description)
		require.Empty(t, persisted.Segments[0].Description)
		require.EqualValues(t, 1, persisted.Version)
	}
	updated := applied[0]
	updated.Description = "实际结构独立编辑"
	updated.Segments[0].Description = "实际分支独立编辑"
	_, err = service.SaveProductionLine(SaveProductionLineRequest{Line: updated, AuthCode: "622575"})
	require.NoError(t, err)
	require.NoError(t, service.DeleteProductionLine(source.ID, "test", ""))
	items, err := service.ListProductionTopologyTemplateSnapshots()
	require.NoError(t, err)
	require.Len(t, items, 1)
	require.Equal(t, template, items[0])
	newLine, err := service.ApplyProductionTopologyTemplateToNewLine(template.ID, ApplyProductionTopologyTemplateToNewLineRequest{Version: template.Version, Code: "APPLIED-AFTER-SOURCE-DELETE"}, "test", "")
	require.NoError(t, err)
	require.Equal(t, "模板新 L1 说明", newLine.Description)
	require.Equal(t, "模板新分支说明", newLine.Segments[0].Description)
	require.Equal(t, "实际工序已更新", newLine.Segments[0].BranchOperations[0].Name)
	require.NoError(t, service.DeleteProductionTopologyTemplateSnapshot(template.ID, template.Version, "test", ""))
	for _, lineID := range []string{applied[0].ID, applied[1].ID, newLine.ID} {
		_, err := service.repository.GetProductionLineByID(database, lineID)
		require.NoError(t, err)
	}
	requireProductionTopologyTemplateActualBranchFactsUnchanged(t, database, actualFacts)
}

func TestProductionTopologyTemplatePostgresRejectsInvalidApplicationWithoutPartialTopologyOrAudit(t *testing.T) {
	for _, condition := range []string{"stale_template", "stale_source", "inactive_product_template", "expired_mbom", "duplicate_line_code", "deleted_template", "duplicate_branch"} {
		t.Run(condition, func(t *testing.T) {
			database, service, source, template := captureProductionTopologyTemplatePostgresFixture(t)
			request := ApplyProductionTopologyTemplateToNewLineRequest{Version: template.Version, Code: "REJECTED-APPLICATION"}
			switch condition {
			case "stale_template":
				request.Version++
			case "inactive_product_template":
				require.NoError(t, database.Model(&models.ProductTemplate{}).Where("id = ?", source.ProductTemplateID).Update("active", false).Error)
			case "expired_mbom":
				require.NoError(t, database.Exec("UPDATE boms SET effective_to = CURRENT_TIMESTAMP - interval '1 day'").Error)
			case "duplicate_line_code":
				request.Code = source.Code
			case "deleted_template":
				require.NoError(t, service.DeleteProductionTopologyTemplateSnapshot(template.ID, template.Version, "test", ""))
			}
			var previousLines, previousChildren, previousAudit int64
			require.NoError(t, database.Unscoped().Model(&models.ProductionLine{}).Count(&previousLines).Error)
			require.NoError(t, database.Unscoped().Model(&models.LineSegment{}).Count(&previousChildren).Error)
			require.NoError(t, database.Table("audit_logs").Count(&previousAudit).Error)
			var err error
			if condition == "stale_source" {
				_, err = service.CaptureProductionTopologyTemplateFromLine(CaptureProductionTopologyTemplateFromLineRequest{SourceLineID: source.ID, SourceLineVersion: source.Version + 1, Name: "过期来源"}, "test", "")
				require.ErrorIs(t, err, ErrProductionLineVersionConflict)
			} else if condition == "duplicate_branch" {
				snapshot := template.Snapshot
				snapshot.Branches = append(snapshot.Branches, snapshot.Branches[0])
				_, err = service.SaveProductionTopologyTemplateSnapshot(template.ID, SaveProductionTopologyTemplateSnapshotRequest{Name: template.Name, Version: template.Version, Snapshot: snapshot}, "test", "")
				require.ErrorIs(t, err, ErrInvalidProductionTopologyTemplate)
			} else {
				_, err = service.ApplyProductionTopologyTemplateToNewLine(template.ID, request, "test", "")
				require.Error(t, err)
			}
			for table, count := range map[string]int64{"production_lines": previousLines, "line_segments": previousChildren, "audit_logs": previousAudit} {
				var after int64
				require.NoError(t, database.Table(table).Count(&after).Error)
				require.Equal(t, count, after, table)
			}
		})
	}
}

func TestProductionTopologyTemplatePostgresAuditFailureRollsBackCaptureEditApplicationAndDeletion(t *testing.T) {
	for _, action := range []string{"capture", "edit", "apply", "delete"} {
		t.Run(action, func(t *testing.T) {
			database, service, source, template := captureProductionTopologyTemplatePostgresFixture(t)
			// Reject only the template audit: applying must also roll back the already-written L1 audit and topology.
			require.NoError(t, database.Exec(`CREATE FUNCTION reject_topology_template_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
				IF NEW.module = 'production-topology-template' THEN RAISE EXCEPTION 'injected template audit failure'; END IF; RETURN NEW; END $$`).Error)
			require.NoError(t, database.Exec(`CREATE TRIGGER reject_template_audit BEFORE INSERT ON audit_logs FOR EACH ROW EXECUTE FUNCTION reject_topology_template_audit()`).Error)
			var err error
			switch action {
			case "capture":
				_, err = service.CaptureProductionTopologyTemplateFromLine(CaptureProductionTopologyTemplateFromLineRequest{SourceLineID: source.ID, SourceLineVersion: source.Version, Name: "失败模板"}, "test", "")
			case "edit":
				_, err = service.SaveProductionTopologyTemplateSnapshot(template.ID, SaveProductionTopologyTemplateSnapshotRequest{Name: "失败编辑", Version: template.Version, Snapshot: template.Snapshot}, "test", "")
			case "apply":
				_, err = service.ApplyProductionTopologyTemplateToNewLine(template.ID, ApplyProductionTopologyTemplateToNewLineRequest{Version: template.Version, Code: "FAILED-APPLY"}, "test", "")
			case "delete":
				err = service.DeleteProductionTopologyTemplateSnapshot(template.ID, template.Version, "test", "")
			}
			require.ErrorContains(t, err, "injected template audit failure")
			items, err := service.ListProductionTopologyTemplateSnapshots()
			require.NoError(t, err)
			require.Len(t, items, 1)
			require.Equal(t, template, items[0])
			for table, expected := range map[string]int64{"production_lines": 2, "line_segments": 2, "audit_logs": 3} {
				var count int64
				require.NoError(t, database.Table(table).Count(&count).Error)
				require.Equal(t, expected, count, table)
			}
		})
	}
}

func TestProductionTopologyTemplatePostgresSnapshotRetainsNoActualTopologyForeignKeys(t *testing.T) {
	database, _, _, _ := captureProductionTopologyTemplatePostgresFixture(t)
	var foreignKeyCount int64
	require.NoError(t, database.Raw(`SELECT count(*) FROM pg_constraint WHERE conrelid = 'production_topology_templates'::regclass AND contype = 'f'`).Scan(&foreignKeyCount).Error)
	require.Zero(t, foreignKeyCount)
}
