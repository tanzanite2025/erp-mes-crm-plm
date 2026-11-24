package services

import (
	"fmt"
	"strings"

	"xdfc-server/models"

	"gorm.io/gorm"
)

func validateAndHydrateProductionLineBOMBranches(
	tx *gorm.DB,
	line *models.ProductionLine,
) error {
	seenBranches := make(map[productionRouteBOMBranchIdentity]string)
	for index := range line.Segments {
		segment := &line.Segments[index]
		segment.ProductID = strings.TrimSpace(segment.ProductID)
		if segment.ProductID == "" {
			return fmt.Errorf("%w: segments[%d].productId is required", ErrInvalidProductionLineBOMBranch, index)
		}
		if err := hydrateProductionLineSegmentBOMBranch(tx, segment); err != nil {
			return fmt.Errorf("%w: segments[%d]: %v", ErrInvalidProductionLineBOMBranch, index, err)
		}
		identity := productionLineSegmentBOMBranchIdentity(*segment)

		if otherSegmentID, exists := seenBranches[identity]; exists {
			return fmt.Errorf("%w: branch is already selected by L2 %s", ErrInvalidProductionLineBOMBranch, otherSegmentID)
		}
		seenBranches[identity] = segment.ID
	}

	return nil
}

func hydrateProductionLineSegmentBOMBranch(tx *gorm.DB, segment *models.LineSegment) error {
	selectedRouteBranch := models.ProductionRoute{
		ProductID:          segment.ProductID,
		BOMOwnerType:       strings.ToUpper(strings.TrimSpace(segment.BOMOwnerType)),
		BOMOwnerCustomerID: strings.TrimSpace(segment.BOMOwnerCustomerID),
		BOMVersionLevel:    strings.TrimSpace(segment.BOMVersionLevel),
	}
	if err := validateProductionRouteBOMBranchIdentity(selectedRouteBranch); err != nil {
		return err
	}
	if err := hydrateProductionRouteBOMBranch(tx, &selectedRouteBranch); err != nil {
		return err
	}

	segment.ProductID = selectedRouteBranch.ProductID
	segment.ProductSKU = selectedRouteBranch.ProductSKU
	segment.ProductName = selectedRouteBranch.ProductName
	segment.BOMOwnerType = selectedRouteBranch.BOMOwnerType
	segment.BOMOwnerCustomerID = selectedRouteBranch.BOMOwnerCustomerID
	segment.BOMOwnerCustomerName = selectedRouteBranch.BOMOwnerCustomerName
	segment.BOMVersionLevel = selectedRouteBranch.BOMVersionLevel
	segment.Name = productionLineBOMBranchDisplayName(selectedRouteBranch)
	return nil
}

func productionLineSegmentBOMBranchIdentity(segment models.LineSegment) productionRouteBOMBranchIdentity {
	return productionRouteBOMBranchIdentity{
		ProductID:          strings.TrimSpace(segment.ProductID),
		BOMOwnerType:       strings.ToUpper(strings.TrimSpace(segment.BOMOwnerType)),
		BOMOwnerCustomerID: strings.TrimSpace(segment.BOMOwnerCustomerID),
		BOMVersionLevel:    strings.TrimSpace(segment.BOMVersionLevel),
	}
}

func productionLineBOMBranchDisplayName(branch models.ProductionRoute) string {
	productLabel := strings.TrimSpace(branch.ProductSKU)
	if productLabel == "" {
		productLabel = strings.TrimSpace(branch.ProductName)
	} else if productName := strings.TrimSpace(branch.ProductName); productName != "" {
		productLabel += " · " + productName
	}
	versionLabel := strings.TrimSpace(branch.BOMVersionLevel)
	if versionLabel == "" {
		versionLabel = "未指定性能版本"
	}
	ownerLabel := "内部"
	if branch.BOMOwnerType == "CUSTOMER" {
		ownerLabel = "客户 · " + strings.TrimSpace(branch.BOMOwnerCustomerName)
		if strings.TrimSpace(branch.BOMOwnerCustomerName) == "" {
			ownerLabel += strings.TrimSpace(branch.BOMOwnerCustomerID)
		}
	}

	return strings.Join([]string{productLabel, versionLabel, ownerLabel}, " · ")
}
