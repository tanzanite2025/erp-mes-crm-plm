package services

import (
	"fmt"

	"xdfc-server/models"

	"gorm.io/gorm"
)

func productionTopologyTemplateBranchSnapshotIdentity(branch ProductionTopologyTemplateBranchSnapshot) productionRouteBOMBranchIdentity {
	return productionRouteBOMBranchIdentity{ProductID: branch.ProductID, BOMOwnerType: branch.BOMOwnerType,
		BOMOwnerCustomerID: branch.BOMOwnerCustomerID, BOMVersionLevel: branch.BOMVersionLevel}
}

func captureProductionTopologyTemplateBranchReferenceSnapshot(segment models.LineSegment) ProductionTopologyTemplateBranchSnapshot {
	branch := ProductionTopologyTemplateBranchSnapshot{ProductID: segment.ProductID, BOMOwnerType: segment.BOMOwnerType,
		BOMOwnerCustomerID: segment.BOMOwnerCustomerID, BOMVersionLevel: segment.BOMVersionLevel, Name: segment.Name,
		ProductSKU: segment.ProductSKU, Description: segment.Description, Attributes: cloneRawMessage(segment.Attributes),
		OperationReferences: make([]ProductionTopologyTemplateOperationReferenceSnapshot, 0, len(segment.BranchOperations))}
	for _, operation := range segment.BranchOperations {
		branch.OperationReferences = append(branch.OperationReferences, ProductionTopologyTemplateOperationReferenceSnapshot{
			Name: operation.Name, Description: operation.Description, SortOrder: operation.SortOrder, IsActive: operation.IsActive})
	}
	return branch
}

func preserveExistingAndCaptureNewProductionTopologyTemplateBranchReferencesTx(
	transaction *gorm.DB,
	previous ProductionTopologyTemplateSnapshot,
	requested *ProductionTopologyTemplateSnapshot,
) error {
	previousBranches := make(map[productionRouteBOMBranchIdentity]ProductionTopologyTemplateBranchSnapshot, len(previous.Branches))
	for _, branch := range previous.Branches {
		previousBranches[productionTopologyTemplateBranchSnapshotIdentity(branch)] = branch
	}
	newBranchIndexes := make([]int, 0)
	newSegments := make([]models.LineSegment, 0)
	for index := range requested.Branches {
		branch := &requested.Branches[index]
		if original, exists := previousBranches[productionTopologyTemplateBranchSnapshotIdentity(*branch)]; exists {
			branch.Name, branch.ProductSKU = original.Name, original.ProductSKU
			branch.OperationReferences = append([]ProductionTopologyTemplateOperationReferenceSnapshot{}, original.OperationReferences...)
			continue
		}
		segment := models.LineSegment{ProductID: branch.ProductID, BOMOwnerType: branch.BOMOwnerType,
			BOMOwnerCustomerID: branch.BOMOwnerCustomerID, BOMVersionLevel: branch.BOMVersionLevel,
			Description: branch.Description, Attributes: cloneRawMessage(branch.Attributes)}
		if err := hydrateProductionLineSegmentBOMBranch(transaction, &segment); err != nil {
			return fmt.Errorf("%w: 新增分支必须为当前有效生产 MBOM 分支: %v", ErrInvalidProductionTopologyTemplate, err)
		}
		newSegments = append(newSegments, segment)
		newBranchIndexes = append(newBranchIndexes, index)
	}
	if len(newSegments) == 0 {
		return nil
	}
	newBranchLines := []models.ProductionLine{{Segments: newSegments}}
	if err := attachProductionBOMBranchOperations(transaction, newBranchLines); err != nil {
		return err
	}
	for index, segment := range newBranchLines[0].Segments {
		requested.Branches[newBranchIndexes[index]] = captureProductionTopologyTemplateBranchReferenceSnapshot(segment)
	}
	return nil
}
