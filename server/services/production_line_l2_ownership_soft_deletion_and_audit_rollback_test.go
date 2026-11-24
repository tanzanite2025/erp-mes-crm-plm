package services

import (
	"encoding/json"
	"testing"

	"xdfc-server/models"

	"github.com/google/uuid"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
)

func createProductionLineL2OwnershipTestFixture(t *testing.T) (*ProductionService, *gorm.DB, ProductionLineDTO, ProductionLineDTO) {
	t.Helper()
	service, database := newProductionTopologyL1TemplateTestService(t)
	manager := productionTopologyL1TemplateTestTransactionManager{database: database}
	template := models.ProductTemplate{BaseModel: models.BaseModel{ID: uuid.NewString()}, Code: "OWNERSHIP-TEMPLATE", Name: "归属测试模板", Active: true}
	insertProductionTopologyProductTemplateForTest(t, manager, template)
	productID := uuid.NewString()
	seedProductionTopologyBOMBranchForTest(t, manager, productID, "OWNERSHIP-SKU", "归属测试产品", uuid.NewString(), "INTERNAL", "", "standard", models.BOMStatusReleased, nil)
	require.NoError(t, database.Exec(`INSERT INTO boms (id, product_id, bom_type, status, owner_type, version_level)
		VALUES (?, ?, 'MBOM', 'RELEASED', 'INTERNAL', 'lightweight')`, uuid.NewString(), productID).Error)
	lines := make([]ProductionLineDTO, 2)
	for index := range lines {
		lineID, segmentID := uuid.NewString(), uuid.NewString()
		require.NoError(t, database.Exec(`INSERT INTO production_lines (id, code, name, product_template_id, version, is_active)
			VALUES (?, ?, ?, ?, 1, true)`, lineID, "LINE-"+lineID, template.Name, template.ID).Error)
		require.NoError(t, database.Exec(`INSERT INTO line_segments (id, line_id, name, product_id, bom_owner_type, bom_owner_customer_id, bom_version_level)
			VALUES (?, ?, '分支', ?, 'INTERNAL', '', 'standard')`, segmentID, lineID, productID).Error)
		line, err := service.repository.GetProductionLineByID(database, lineID)
		require.NoError(t, err)
		lines[index] = mapProductionLineToDTO(line)
	}
	return service, database, lines[0], lines[1]
}

func TestProductionLineRejectsForeignDuplicateDeletedAndForgedL2OwnershipWithoutWrites(t *testing.T) {
	for _, condition := range []string{"foreign_l2_on_update", "foreign_l2_on_create", "duplicate_l2_id", "duplicate_temporary_l2_id", "deleted_l2_id", "forged_parent_id", "invalid_l2_uuid"} {
		t.Run(condition, func(t *testing.T) {
			service, database, original, other := createProductionLineL2OwnershipTestFixture(t)
			requestLine := original
			requestLine.Segments = append([]LineSegmentDTO(nil), original.Segments...)
			switch condition {
			case "foreign_l2_on_update", "foreign_l2_on_create":
				requestLine.Segments = append([]LineSegmentDTO(nil), other.Segments...)
				requestLine.Segments[0].LineID = original.ID
				if condition == "foreign_l2_on_create" {
					requestLine.ID, requestLine.Code = "temp-borrowed-l2", "BORROWED-L2"
					requestLine.Segments[0].LineID = requestLine.ID
				}
			case "duplicate_l2_id", "duplicate_temporary_l2_id":
				if condition == "duplicate_temporary_l2_id" {
					requestLine.Segments[0].ID = "temp-duplicate-l2"
				}
				duplicate := requestLine.Segments[0]
				duplicate.BOMVersionLevel = "lightweight"
				requestLine.Segments = append(requestLine.Segments, duplicate)
			case "deleted_l2_id":
				require.NoError(t, database.Delete(&models.LineSegment{}, "id = ?", original.Segments[0].ID).Error)
			case "forged_parent_id":
				requestLine.Segments[0].LineID = other.ID
			case "invalid_l2_uuid":
				requestLine.Segments[0].ID = "invalid-client-id"
			}
			requestLine.Description = "失败请求不得保存"
			_, err := service.SaveProductionLine(SaveProductionLineRequest{Line: requestLine, AuthCode: "622575"})
			require.ErrorIs(t, err, ErrInvalidProductionLineSegmentOwnership)
			var persisted models.ProductionLine
			require.NoError(t, database.First(&persisted, "id = ?", original.ID).Error)
			require.EqualValues(t, 1, persisted.Version)
			require.Empty(t, persisted.Description)
			var foreign models.LineSegment
			require.NoError(t, database.First(&foreign, "id = ?", other.Segments[0].ID).Error)
			require.Equal(t, other.ID, foreign.LineID)
			var auditCount, lineCount int64
			require.NoError(t, database.Table("audit_logs").Count(&auditCount).Error)
			require.NoError(t, database.Model(&models.ProductionLine{}).Count(&lineCount).Error)
			require.Zero(t, auditCount)
			require.EqualValues(t, 2, lineCount)
		})
	}
}

func TestProductionLineConvertsTemporaryParentAndChildIDsAndKeepsSharedBranchesIndependent(t *testing.T) {
	service, database, original, other := createProductionLineL2OwnershipTestFixture(t)
	for _, temporarySegmentID := range []string{"", "temp-new-l2"} {
		request := original
		request.ID, request.Code = "temp-new-l1", "NEW-L1-"+uuid.NewString()
		request.Segments = append([]LineSegmentDTO(nil), original.Segments...)
		request.Segments[0].ID, request.Segments[0].LineID = temporarySegmentID, request.ID
		created, err := service.SaveProductionLine(SaveProductionLineRequest{Line: request})
		require.NoError(t, err)
		_, err = uuid.Parse(created.ID)
		require.NoError(t, err)
		_, err = uuid.Parse(created.Segments[0].ID)
		require.NoError(t, err)
		require.Equal(t, created.ID, created.Segments[0].LineID)
		require.NotEqual(t, original.Segments[0].ID, created.Segments[0].ID)
		created.Description = "可继续更新"
		updated, err := service.SaveProductionLine(SaveProductionLineRequest{Line: created, AuthCode: "622575"})
		require.NoError(t, err)
		require.EqualValues(t, 2, updated.Version)
		require.NoError(t, service.DeleteProductionLine(created.ID, "test", ""))
		var segment models.LineSegment
		require.NoError(t, database.Unscoped().First(&segment, "id = ?", created.Segments[0].ID).Error)
		require.True(t, segment.DeletedAt.Valid)
		_, err = service.SaveProductionLine(SaveProductionLineRequest{Line: updated, AuthCode: "622575"})
		require.ErrorIs(t, err, gorm.ErrRecordNotFound)
		require.ErrorIs(t, service.DeleteProductionLine(created.ID, "test", ""), gorm.ErrRecordNotFound)
	}
	for _, unchanged := range []ProductionLineDTO{original, other} {
		var count int64
		require.NoError(t, database.Model(&models.LineSegment{}).Where("line_id = ?", unchanged.ID).Count(&count).Error)
		require.EqualValues(t, 1, count)
	}
}

func TestProductionLineSaveAndDeleteRollBackChildrenVersionAndAuditTogether(t *testing.T) {
	for _, action := range []string{"remove_l2", "replace_l2", "delete_l1"} {
		t.Run(action, func(t *testing.T) {
			service, database, original, _ := createProductionLineL2OwnershipTestFixture(t)
			require.NoError(t, database.Exec(`CREATE TRIGGER reject_production_line_audit BEFORE INSERT ON audit_logs
				BEGIN SELECT RAISE(ABORT, 'injected audit failure'); END`).Error)
			var err error
			if action == "delete_l1" {
				err = service.DeleteProductionLine(original.ID, "test", "")
			} else {
				requestLine := original
				requestLine.Segments = nil
				if action == "replace_l2" {
					replacement := original.Segments[0]
					replacement.ID, replacement.BOMVersionLevel = uuid.NewString(), "lightweight"
					requestLine.Segments = []LineSegmentDTO{replacement}
				}
				_, err = service.SaveProductionLine(SaveProductionLineRequest{Line: requestLine, AuthCode: "622575"})
			}
			require.ErrorContains(t, err, "injected audit failure")
			persisted, err := service.repository.GetProductionLineByID(database, original.ID)
			require.NoError(t, err)
			require.EqualValues(t, 1, persisted.Version)
			require.Len(t, persisted.Segments, 1)
			require.Equal(t, original.Segments[0].ID, persisted.Segments[0].ID)
			var totalChildren int64
			require.NoError(t, database.Unscoped().Model(&models.LineSegment{}).Where("line_id = ?", original.ID).Count(&totalChildren).Error)
			require.EqualValues(t, 1, totalChildren)
		})
	}
}

func TestProductionLineRejectsUpdatesAndPatchesAfterDeletionWithoutResurrection(t *testing.T) {
	service, database, line, _ := createProductionLineL2OwnershipTestFixture(t)
	require.NoError(t, service.DeleteProductionLine(line.ID, "test", ""))
	_, err := service.SaveProductionLine(SaveProductionLineRequest{Line: line, AuthCode: "622575"})
	require.ErrorIs(t, err, gorm.ErrRecordNotFound)
	_, err = service.PatchProductionLine(PatchProductionLineRequest{ID: line.ID, Version: line.Version, AuthCode: "622575",
		Delta: map[string]json.RawMessage{"description": json.RawMessage(`"过期更新"`)}})
	require.ErrorIs(t, err, gorm.ErrRecordNotFound)
	var activeChildren int64
	require.NoError(t, database.Model(&models.LineSegment{}).Where("line_id = ?", line.ID).Count(&activeChildren).Error)
	require.Zero(t, activeChildren)
}
