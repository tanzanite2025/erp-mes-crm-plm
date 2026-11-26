package services

import (
	"fmt"
	"strings"
	"xdfc-server/models"

	"github.com/google/uuid"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

func SaveProductionMBOMBranchProcessSelection(
	request SaveProductionMBOMBranchProcessSelectionRequest,
) ([]ProcessStepDTO, error) {
	return defaultProductionService.SaveProductionMBOMBranchProcessSelection(request)
}

func (service *ProductionService) SaveProductionMBOMBranchProcessSelection(
	request SaveProductionMBOMBranchProcessSelectionRequest,
) ([]ProcessStepDTO, error) {
	identity := productionRouteBOMBranchIdentity{
		ProductID:          strings.TrimSpace(request.ProductID),
		BOMOwnerType:       strings.ToUpper(strings.TrimSpace(request.BOMOwnerType)),
		BOMOwnerCustomerID: strings.TrimSpace(request.BOMOwnerCustomerID),
		BOMVersionLevel:    strings.TrimSpace(request.BOMVersionLevel),
	}
	if identity.ProductID == "" {
		return nil, fmt.Errorf("%w: productId is required", ErrInvalidProductionMBOMBranchProcessSelection)
	}
	processStepIDs := make([]string, 0, len(request.ProcessStepIDs))
	seenProcessStepIDs := make(map[string]struct{}, len(request.ProcessStepIDs))
	for _, rawID := range request.ProcessStepIDs {
		id := strings.TrimSpace(rawID)
		if id == "" {
			return nil, fmt.Errorf("%w: processStepIds cannot contain an empty ID", ErrInvalidProductionMBOMBranchProcessSelection)
		}
		if _, exists := seenProcessStepIDs[id]; exists {
			return nil, fmt.Errorf("%w: process step %s is duplicated", ErrInvalidProductionMBOMBranchProcessSelection, id)
		}
		seenProcessStepIDs[id] = struct{}{}
		processStepIDs = append(processStepIDs, id)
	}

	var selected []ProcessStepDTO
	err := service.txManager.WithinTransaction(func(tx *gorm.DB) error {
		var productLock struct{ ID string }
		if err := tx.Table("products").Select("id").Clauses(clause.Locking{Strength: "UPDATE"}).
			Where("id = ? AND deleted_at IS NULL", identity.ProductID).Take(&productLock).Error; err != nil {
			return fmt.Errorf("%w: product for MBOM branch does not exist", ErrInvalidProductionMBOMBranchProcessSelection)
		}

		branch := models.ProductionRoute{
			ProductID: identity.ProductID, BOMOwnerType: identity.BOMOwnerType,
			BOMOwnerCustomerID: identity.BOMOwnerCustomerID, BOMVersionLevel: identity.BOMVersionLevel,
		}
		if err := validateProductionRouteBOMBranchIdentity(branch); err != nil {
			return fmt.Errorf("%w: %v", ErrInvalidProductionMBOMBranchProcessSelection, err)
		}
		if err := hydrateProductionRouteBOMBranch(tx, &branch); err != nil {
			return fmt.Errorf("%w: %v", ErrInvalidProductionMBOMBranchProcessSelection, err)
		}
		identity = productionRouteBOMBranchIdentityFromModel(branch)

		var processSteps []models.ProcessStep
		if len(processStepIDs) > 0 {
			if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
				Where("id IN ?", processStepIDs).Order("id asc").Find(&processSteps).Error; err != nil {
				return err
			}
		}
		processStepsByID := make(map[string]models.ProcessStep, len(processSteps))
		for _, step := range processSteps {
			processStepsByID[step.ID] = step
		}
		for _, id := range processStepIDs {
			step, exists := processStepsByID[id]
			if !exists || !step.IsActive {
				return fmt.Errorf("%w: process step %s is missing or inactive", ErrInvalidProductionMBOMBranchProcessSelection, id)
			}
		}

		var current []models.ProductionMBOMBranchProcessAssociation
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
			Where("product_id = ? AND UPPER(bom_owner_type) = ? AND COALESCE(bom_owner_customer_id, '') = ? AND COALESCE(bom_version_level, '') = ?",
				identity.ProductID, identity.BOMOwnerType, identity.BOMOwnerCustomerID, identity.BOMVersionLevel).
			Order("sort_order asc, created_at asc, id asc").Find(&current).Error; err != nil {
			return err
		}
		currentByProcessStepID := make(map[string]models.ProductionMBOMBranchProcessAssociation, len(current))
		for _, association := range current {
			currentByProcessStepID[association.ProcessStepID] = association
		}

		for sortOrder, processStepID := range processStepIDs {
			association, exists := currentByProcessStepID[processStepID]
			if exists {
				if err := tx.Model(&association).Update("sort_order", sortOrder).Error; err != nil {
					return err
				}
				continue
			}
			association = models.ProductionMBOMBranchProcessAssociation{
				BaseModel: models.BaseModel{ID: uuid.NewString()},
				ProductID: identity.ProductID, BOMOwnerType: identity.BOMOwnerType,
				BOMOwnerCustomerID: identity.BOMOwnerCustomerID, BOMVersionLevel: identity.BOMVersionLevel,
				ProcessStepID: processStepID, SortOrder: sortOrder,
			}
			if err := tx.Create(&association).Error; err != nil {
				return err
			}
		}

		for _, association := range current {
			if _, keep := seenProcessStepIDs[association.ProcessStepID]; keep {
				continue
			}
			if err := tx.Delete(&models.ProductionMBOMBranchProcessAssociation{}, "id = ?", association.ID).Error; err != nil {
				return err
			}
		}

		selected = make([]ProcessStepDTO, 0, len(processStepIDs))
		for sortOrder, id := range processStepIDs {
			step := processStepsByID[id]
			step.SortOrder = sortOrder
			selected = append(selected, mapProcessStepToDTO(step))
		}
		return nil
	})
	return selected, err
}
