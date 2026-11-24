package services

import (
	"testing"
	"xdfc-server/models"

	"github.com/google/uuid"
	"github.com/stretchr/testify/require"
)

func TestProductionBOMBranchOperationsAreIndependentAndProjectedToMatchingLineSegments(t *testing.T) {
	service, database := newProductionTopologyL1TemplateTestService(t)
	manager := productionTopologyL1TemplateTestTransactionManager{database: database}
	template := models.ProductTemplate{
		BaseModel: models.BaseModel{ID: uuid.NewString()},
		Name:      "产品模板",
		Code:      "branch-operation-template-" + uuid.NewString(),
		Active:    true,
	}
	insertProductionTopologyProductTemplateForTest(t, manager, template)
	seedProductionTopologyBOMBranchForTest(
		t, manager, "branch-operation-product-a", "RIM-A", "A 车圈", "branch-operation-bom-a",
		"INTERNAL", "", "standard", models.BOMStatusReleased, nil,
	)
	seedProductionTopologyBOMBranchForTest(
		t, manager, "branch-operation-product-b", "RIM-B", "B 车圈", "branch-operation-bom-b",
		"INTERNAL", "", "standard", models.BOMStatusReleased, nil,
	)

	lineIDA := uuid.NewString()
	lineIDB := uuid.NewString()
	segmentIDA := uuid.NewString()
	segmentIDB := uuid.NewString()
	for _, line := range []struct {
		id        string
		code      string
		segmentID string
		productID string
	}{
		{id: lineIDA, code: "branch-operation-line-a", segmentID: segmentIDA, productID: "branch-operation-product-a"},
		{id: lineIDB, code: "branch-operation-line-b", segmentID: segmentIDB, productID: "branch-operation-product-b"},
	} {
		require.NoError(t, database.Exec(
			"INSERT INTO production_lines (id, code, name, product_template_id, version, is_active) VALUES (?, ?, ?, ?, ?, ?)",
			line.id, line.code, line.code, template.ID, 1, true,
		).Error)
		require.NoError(t, database.Exec(
			`INSERT INTO line_segments (id, line_id, name, product_id, bom_owner_type, bom_owner_customer_id, bom_version_level, sort_order)
			 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
			line.segmentID, line.id, line.code, line.productID, "INTERNAL", "", "standard", 0,
		).Error)
	}

	require.NoError(t, database.Create(&[]models.ProcessStep{
		{BaseModel: models.BaseModel{ID: "branch-operation-library-a"}, Code: "CUT-A", Name: "裁切", IsActive: true},
		{BaseModel: models.BaseModel{ID: "branch-operation-library-b"}, Code: "PREP-B", Name: "预浸", IsActive: true},
	}).Error)
	selectedA, err := service.SaveProductionBOMBranchOperationSelection(SaveProductionBOMBranchOperationSelectionRequest{
		ProductID: "branch-operation-product-a", BOMOwnerType: "INTERNAL", BOMVersionLevel: "standard",
		ProcessLibraryIDs: []string{"branch-operation-library-a"},
	})
	require.NoError(t, err)
	operationA := selectedA[0]
	selectedB, err := service.SaveProductionBOMBranchOperationSelection(SaveProductionBOMBranchOperationSelectionRequest{
		ProductID: "branch-operation-product-b", BOMOwnerType: "INTERNAL", BOMVersionLevel: "standard",
		ProcessLibraryIDs: []string{"branch-operation-library-b"},
	})
	require.NoError(t, err)
	operationB := selectedB[0]
	require.NotEqual(t, operationA.ID, operationB.ID)

	operationA.Name = "裁切复核"
	_, err = service.SaveProductionBOMBranchOperation(SaveProductionBOMBranchOperationRequest{Operation: operationA})
	require.NoError(t, err)

	lines, err := service.ListProductionLines()
	require.NoError(t, err)
	require.Len(t, lines, 2)
	require.Len(t, lines[0].Segments, 1)
	require.Len(t, lines[1].Segments, 1)
	operationsByProduct := map[string][]ProductionBOMBranchOperationDTO{
		lines[0].Segments[0].ProductID: lines[0].Segments[0].BranchOperations,
		lines[1].Segments[0].ProductID: lines[1].Segments[0].BranchOperations,
	}
	require.Equal(t, "裁切复核", operationsByProduct["branch-operation-product-a"][0].Name)
	require.Equal(t, "预浸", operationsByProduct["branch-operation-product-b"][0].Name)

	operationA.ProductID = "branch-operation-product-b"
	_, err = service.SaveProductionBOMBranchOperation(SaveProductionBOMBranchOperationRequest{Operation: operationA})
	require.ErrorIs(t, err, ErrInvalidProductionBOMBranchOperation)
}

func TestProductionBOMBranchOperationRejectsInactiveMBOMBranch(t *testing.T) {
	service, database := newProductionTopologyL1TemplateTestService(t)
	manager := productionTopologyL1TemplateTestTransactionManager{database: database}
	seedProductionTopologyBOMBranchForTest(
		t, manager, "inactive-operation-product", "RIM-X", "失效车圈", "inactive-operation-bom",
		"INTERNAL", "", "standard", models.BOMStatusDraft, nil,
	)

	_, err := service.SaveProductionBOMBranchOperation(SaveProductionBOMBranchOperationRequest{
		Operation: ProductionBOMBranchOperationDTO{
			ProductID: "inactive-operation-product", BOMOwnerType: "INTERNAL", BOMVersionLevel: "standard", Name: "不得保存", IsActive: true,
		},
	})
	require.ErrorIs(t, err, ErrInvalidProductionBOMBranchOperation)
}

func TestProductionBOMBranchOperationSelectionStoresLibraryIdentityAndReplacesOnlyOneBranch(t *testing.T) {
	service, database := newProductionTopologyL1TemplateTestService(t)
	manager := productionTopologyL1TemplateTestTransactionManager{database: database}
	seedProductionTopologyBOMBranchForTest(
		t, manager, "selection-product", "RIM-SELECTION", "选配车圈", "selection-bom",
		"INTERNAL", "", "standard", models.BOMStatusReleased, nil,
	)
	require.NoError(t, database.Exec(`INSERT INTO production_lines (id, code, name, version, is_active) VALUES (?, ?, ?, 1, 1)`, "selection-line", "selection-line", "selection-line").Error)
	require.NoError(t, database.Exec(`INSERT INTO line_segments (id, line_id, name, product_id, bom_owner_type, bom_owner_customer_id, bom_version_level, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, 0)`, "selection-segment", "selection-line", "选配分支", "selection-product", "INTERNAL", "", "standard").Error)
	require.NoError(t, database.Exec(`CREATE UNIQUE INDEX selection_branch_process_unique ON production_bom_branch_operation_process_library_selections (product_id, bom_owner_type, bom_owner_customer_id, bom_version_level, process_library_id) WHERE deleted_at IS NULL`).Error)
	libraryA := models.ProcessStep{BaseModel: models.BaseModel{ID: "library-a"}, Code: "CUT", Name: "裁切", IsActive: true}
	libraryB := models.ProcessStep{BaseModel: models.BaseModel{ID: "library-b"}, Code: "FORM", Name: "成型", IsActive: true}
	otherLibrary := models.ProcessStep{BaseModel: models.BaseModel{ID: "library-other"}, Code: "PACK", Name: "包装", IsActive: true}
	require.NoError(t, database.Create(&[]models.ProcessStep{libraryA, libraryB, otherLibrary}).Error)

	selected, err := service.SaveProductionBOMBranchOperationSelection(SaveProductionBOMBranchOperationSelectionRequest{
		ProductID: "selection-product", BOMOwnerType: "INTERNAL", BOMVersionLevel: "standard",
		ProcessLibraryIDs: []string{"library-a", "library-b"},
	})
	require.NoError(t, err)
	require.Len(t, selected, 2)
	require.Equal(t, []string{"library-a", "library-b"}, []string{selected[0].ProcessLibraryID, selected[1].ProcessLibraryID})
	require.NotEqual(t, selected[0].ID, selected[1].ID)

	lines, err := service.ListProductionLines()
	require.NoError(t, err)
	var operations []ProductionBOMBranchOperationDTO
	for _, line := range lines {
		for _, segment := range line.Segments {
			if segment.ProductID == "selection-product" {
				operations = segment.BranchOperations
			}
		}
	}
	require.Len(t, operations, 2)
	require.Equal(t, "library-a", operations[0].ProcessLibraryID)

	_, err = service.SaveProductionBOMBranchOperationSelection(SaveProductionBOMBranchOperationSelectionRequest{
		ProductID: "selection-product", BOMOwnerType: "INTERNAL", BOMVersionLevel: "standard",
		ProcessLibraryIDs: []string{"library-b"},
	})
	require.NoError(t, err)
	var activeSelectionCount int64
	require.NoError(t, database.Model(&models.ProductionBOMBranchOperationProcessLibrarySelection{}).
		Where("product_id = ? AND process_library_id = ?", "selection-product", "library-a").Count(&activeSelectionCount).Error)
	require.Zero(t, activeSelectionCount)
	var allSelectionCount int64
	require.NoError(t, database.Unscoped().Model(&models.ProductionBOMBranchOperationProcessLibrarySelection{}).
		Where("product_id = ?", "selection-product").Count(&allSelectionCount).Error)
	require.EqualValues(t, 2, allSelectionCount)

	selected, err = service.SaveProductionBOMBranchOperationSelection(SaveProductionBOMBranchOperationSelectionRequest{
		ProductID: "selection-product", BOMOwnerType: "INTERNAL", BOMVersionLevel: "standard",
		ProcessLibraryIDs: []string{"library-a", "library-b"},
	})
	require.NoError(t, err)
	require.Len(t, selected, 2)

	_, err = service.SaveProductionBOMBranchOperationSelection(SaveProductionBOMBranchOperationSelectionRequest{
		ProductID: "selection-product", BOMOwnerType: "INTERNAL", BOMVersionLevel: "standard",
		ProcessLibraryIDs: []string{"library-b", "library-b"},
	})
	require.ErrorIs(t, err, ErrInvalidProductionBOMBranchOperation)
}
