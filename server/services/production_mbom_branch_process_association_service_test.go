package services

import (
	"encoding/json"
	"testing"
	"xdfc-server/models"

	"github.com/stretchr/testify/require"
)

func TestMBOMBranchProcessSelectionIsIndependentFromProductionLineMasterData(t *testing.T) {
	service, database := newProductionServiceTestHarness(t)
	manager := productionServiceTestTransactionManager{database: database}
	seedProductionServiceMBOMBranchForTest(t, manager, "process-product-a", "RIM-A", "A 车圈", "process-bom-a",
		"INTERNAL", "", "standard", models.BOMStatusReleased, nil)
	seedProductionServiceMBOMBranchForTest(t, manager, "process-product-b", "RIM-B", "B 车圈", "process-bom-b",
		"INTERNAL", "", "standard", models.BOMStatusReleased, nil)

	processes := []models.ProcessStep{
		{BaseModel: models.BaseModel{ID: "process-step-cut"}, Code: "CUT", Name: "裁切", IsActive: true},
		{BaseModel: models.BaseModel{ID: "process-step-form"}, Code: "FORM", Name: "成型", IsActive: true},
		{BaseModel: models.BaseModel{ID: "process-step-pack"}, Code: "PACK", Name: "包装", IsActive: true},
	}
	require.NoError(t, database.Create(&processes).Error)

	selectedA, err := service.SaveProductionMBOMBranchProcessSelection(SaveProductionMBOMBranchProcessSelectionRequest{
		ProductID: "process-product-a", BOMOwnerType: "INTERNAL", BOMVersionLevel: "standard",
		ProcessStepIDs: []string{"process-step-cut", "process-step-form"},
	})
	require.NoError(t, err)
	selectedB, err := service.SaveProductionMBOMBranchProcessSelection(SaveProductionMBOMBranchProcessSelectionRequest{
		ProductID: "process-product-b", BOMOwnerType: "INTERNAL", BOMVersionLevel: "standard",
		ProcessStepIDs: []string{"process-step-pack"},
	})
	require.NoError(t, err)
	require.Equal(t, []string{"process-step-cut", "process-step-form"}, []string{selectedA[0].ID, selectedA[1].ID})
	require.Equal(t, []string{"process-step-pack"}, []string{selectedB[0].ID})

	lines, err := service.ListProductionLines()
	require.NoError(t, err)
	lineJSON, err := json.Marshal(lines)
	require.NoError(t, err)
	require.NotContains(t, string(lineJSON), "processes")
	require.NotContains(t, string(lineJSON), "process-step-cut")
	branches, err := service.ListProductionRouteBOMBranches()
	require.NoError(t, err)
	for _, branch := range branches {
		require.Equal(t, "车圈", branch.ProductTypeName)
	}
	processesByProduct := make(map[string][]ProcessStepDTO)
	for _, branch := range branches {
		processesByProduct[branch.ProductID] = branch.Processes
	}
	require.Equal(t, []string{"裁切", "成型"}, []string{processesByProduct["process-product-a"][0].Name, processesByProduct["process-product-a"][1].Name})
	require.Equal(t, []string{"包装"}, []string{processesByProduct["process-product-b"][0].Name})
	require.Equal(t, []string{"process-step-cut", "process-step-form"}, []string{processesByProduct["process-product-a"][0].ID, processesByProduct["process-product-a"][1].ID})

	selectedA[0].Name = "伪造名称不得写入关联"
	updatedProcess, err := service.SaveProcessStep(SaveProcessStepRequest{Step: ProcessStepDTO{
		ID: "process-step-cut", Code: "CUT", Name: "裁切复核", IsActive: true,
	}})
	require.NoError(t, err)
	require.Equal(t, "裁切复核", updatedProcess.Name)

	_, err = service.SaveProductionMBOMBranchProcessSelection(SaveProductionMBOMBranchProcessSelectionRequest{
		ProductID: "process-product-a", BOMOwnerType: "INTERNAL", BOMVersionLevel: "standard",
		ProcessStepIDs: []string{"process-step-form"},
	})
	require.NoError(t, err)
	lines, err = service.ListProductionLines()
	require.NoError(t, err)
	lineJSON, err = json.Marshal(lines)
	require.NoError(t, err)
	require.NotContains(t, string(lineJSON), "processes")
	branches, err = service.ListProductionRouteBOMBranches()
	require.NoError(t, err)
	processesByProduct = make(map[string][]ProcessStepDTO)
	for _, branch := range branches {
		processesByProduct[branch.ProductID] = branch.Processes
	}
	require.Equal(t, []string{"成型"}, []string{processesByProduct["process-product-a"][0].Name})
	require.Equal(t, []string{"包装"}, []string{processesByProduct["process-product-b"][0].Name})

	var activeAssociations int64
	require.NoError(t, database.Model(&models.ProductionMBOMBranchProcessAssociation{}).
		Where("product_id = ?", "process-product-a").Count(&activeAssociations).Error)
	require.EqualValues(t, 1, activeAssociations)
}

func TestMBOMBranchProcessSelectionRejectsInactiveProcessAndUnreleasedBranch(t *testing.T) {
	service, database := newProductionServiceTestHarness(t)
	manager := productionServiceTestTransactionManager{database: database}
	seedProductionServiceMBOMBranchForTest(t, manager, "inactive-process-product", "RIM-X", "待发布产品", "inactive-process-bom",
		"INTERNAL", "", "standard", models.BOMStatusDraft, nil)
	require.NoError(t, database.Create(&models.ProcessStep{
		BaseModel: models.BaseModel{ID: "process-step-inactive"}, Code: "INACTIVE", Name: "停用工序", IsActive: false,
	}).Error)

	_, err := service.SaveProductionMBOMBranchProcessSelection(SaveProductionMBOMBranchProcessSelectionRequest{
		ProductID: "inactive-process-product", BOMOwnerType: "INTERNAL", BOMVersionLevel: "standard",
		ProcessStepIDs: []string{"process-step-inactive"},
	})
	require.ErrorIs(t, err, ErrInvalidProductionMBOMBranchProcessSelection)

	_, err = service.SaveProductionMBOMBranchProcessSelection(SaveProductionMBOMBranchProcessSelectionRequest{
		ProductID: "inactive-process-product", BOMOwnerType: "INTERNAL", BOMVersionLevel: "standard",
	})
	require.ErrorIs(t, err, ErrInvalidProductionMBOMBranchProcessSelection)
	var associationCount int64
	require.NoError(t, database.Model(&models.ProductionMBOMBranchProcessAssociation{}).Count(&associationCount).Error)
	require.Zero(t, associationCount)
}
