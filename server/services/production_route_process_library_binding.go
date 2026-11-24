package services

import (
	"fmt"
	"strings"
	"xdfc-server/models"

	"github.com/google/uuid"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

func ensureProductionRouteBranchOperationIdentitiesTx(tx *gorm.DB, route *models.ProductionRoute) error {
	identity := productionRouteBOMBranchIdentityFromModel(*route)
	for index := range route.Steps {
		step := &route.Steps[index]
		processLibraryID := strings.TrimSpace(step.ProcessLibraryID)
		if processLibraryID == "" && step.BranchOperation != nil {
			processLibraryID = strings.TrimSpace(step.BranchOperation.ProcessLibraryID)
		}
		if processLibraryID == "" {
			return fmt.Errorf("%w: steps[%d].processLibraryId is required", ErrInvalidProductionRoute, index)
		}

		var process models.ProcessStep
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
			First(&process, "id = ? AND is_active = ?", processLibraryID, true).Error; err != nil {
			return fmt.Errorf("%w: steps[%d] references a missing or inactive process library entry", ErrInvalidProductionRoute, index)
		}

		var operation models.ProductionBOMBranchOperation
		err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).Where(
			"product_id = ? AND UPPER(bom_owner_type) = ? AND COALESCE(bom_owner_customer_id, '') = ? AND COALESCE(bom_version_level, '') = ? AND process_library_id = ?",
			identity.ProductID,
			identity.BOMOwnerType,
			identity.BOMOwnerCustomerID,
			identity.BOMVersionLevel,
			processLibraryID,
		).First(&operation).Error
		if err != nil && err != gorm.ErrRecordNotFound {
			return fmt.Errorf("%w: failed to resolve steps[%d] branch operation: %v", ErrInvalidProductionRoute, index, err)
		}
		if err == gorm.ErrRecordNotFound {
			operation = models.ProductionBOMBranchOperation{
				BaseModel:          models.BaseModel{ID: uuid.NewString()},
				ProductID:          identity.ProductID,
				BOMOwnerType:       identity.BOMOwnerType,
				BOMOwnerCustomerID: identity.BOMOwnerCustomerID,
				BOMVersionLevel:    identity.BOMVersionLevel,
				Name:               strings.TrimSpace(process.Name),
				Description:        process.Description,
				SortOrder:          step.Sequence,
				IsActive:           true,
				ProcessLibraryID:   processLibraryID,
			}
			if err := tx.Create(&operation).Error; err != nil {
				return fmt.Errorf("%w: failed to create steps[%d] branch operation: %v", ErrInvalidProductionRoute, index, err)
			}
		}
		if !operation.IsActive {
			return fmt.Errorf("%w: steps[%d] references an inactive MBOM branch operation", ErrInvalidProductionRoute, index)
		}
		if step.BranchOperationID != "" && strings.TrimSpace(step.BranchOperationID) != operation.ID {
			return fmt.Errorf("%w: steps[%d] branch operation does not match its process library entry", ErrInvalidProductionRoute, index)
		}
		var selection models.ProductionBOMBranchOperationProcessLibrarySelection
		err = tx.Clauses(clause.Locking{Strength: "UPDATE"}).
			Where("branch_operation_id = ?", operation.ID).First(&selection).Error
		if err != nil && err != gorm.ErrRecordNotFound {
			return fmt.Errorf("%w: failed to resolve steps[%d] branch operation selection: %v", ErrInvalidProductionRoute, index, err)
		}
		if err == gorm.ErrRecordNotFound {
			selection = models.ProductionBOMBranchOperationProcessLibrarySelection{
				BaseModel:          models.BaseModel{ID: uuid.NewString()},
				ProductID:          identity.ProductID,
				BOMOwnerType:       identity.BOMOwnerType,
				BOMOwnerCustomerID: identity.BOMOwnerCustomerID,
				BOMVersionLevel:    identity.BOMVersionLevel,
				BranchOperationID:  operation.ID,
				ProcessLibraryID:   processLibraryID,
				SortOrder:          step.Sequence,
			}
			if err := tx.Create(&selection).Error; err != nil {
				return fmt.Errorf("%w: failed to persist steps[%d] branch operation selection: %v", ErrInvalidProductionRoute, index, err)
			}
		} else if selection.ProcessLibraryID != processLibraryID ||
			selection.ProductID != identity.ProductID ||
			strings.ToUpper(strings.TrimSpace(selection.BOMOwnerType)) != identity.BOMOwnerType ||
			strings.TrimSpace(selection.BOMOwnerCustomerID) != identity.BOMOwnerCustomerID ||
			strings.TrimSpace(selection.BOMVersionLevel) != identity.BOMVersionLevel {
			return fmt.Errorf("%w: steps[%d] branch operation selection does not match its MBOM branch identity", ErrInvalidProductionRoute, index)
		}
		step.BranchOperationID = operation.ID
		step.ProcessLibraryID = processLibraryID
	}
	return nil
}
