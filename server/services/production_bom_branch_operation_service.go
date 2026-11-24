package services

import (
	"fmt"
	"strings"
	"xdfc-server/models"

	"github.com/google/uuid"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

func SaveProductionBOMBranchOperation(
	request SaveProductionBOMBranchOperationRequest,
) (ProductionBOMBranchOperationDTO, error) {
	return defaultProductionService.SaveProductionBOMBranchOperation(request)
}

func SaveProductionBOMBranchOperationSelection(
	request SaveProductionBOMBranchOperationSelectionRequest,
) ([]ProductionBOMBranchOperationDTO, error) {
	return defaultProductionService.SaveProductionBOMBranchOperationSelection(request)
}

// SaveProductionBOMBranchOperationSelection atomically replaces the process
// library selection for one stable MBOM branch. Each selected library record
// receives its own branch operation execution identity.
func (service *ProductionService) SaveProductionBOMBranchOperationSelection(
	request SaveProductionBOMBranchOperationSelectionRequest,
) ([]ProductionBOMBranchOperationDTO, error) {
	identity := productionRouteBOMBranchIdentity{
		ProductID:          strings.TrimSpace(request.ProductID),
		BOMOwnerType:       strings.ToUpper(strings.TrimSpace(request.BOMOwnerType)),
		BOMOwnerCustomerID: strings.TrimSpace(request.BOMOwnerCustomerID),
		BOMVersionLevel:    strings.TrimSpace(request.BOMVersionLevel),
	}
	if identity.ProductID == "" {
		return nil, fmt.Errorf("%w: productId is required", ErrInvalidProductionBOMBranchOperation)
	}
	processLibraryIDs := make([]string, 0, len(request.ProcessLibraryIDs))
	seenLibraryIDs := make(map[string]struct{}, len(request.ProcessLibraryIDs))
	for _, rawID := range request.ProcessLibraryIDs {
		id := strings.TrimSpace(rawID)
		if id == "" {
			return nil, fmt.Errorf("%w: processLibraryIds cannot contain an empty ID", ErrInvalidProductionBOMBranchOperation)
		}
		if _, exists := seenLibraryIDs[id]; exists {
			return nil, fmt.Errorf("%w: process library entry %s is duplicated", ErrInvalidProductionBOMBranchOperation, id)
		}
		seenLibraryIDs[id] = struct{}{}
		processLibraryIDs = append(processLibraryIDs, id)
	}

	var selected []ProductionBOMBranchOperationDTO
	err := service.txManager.WithinTransaction(func(tx *gorm.DB) error {
		var productLock struct {
			ID string
		}
		if err := tx.Table("products").Select("id").Clauses(clause.Locking{Strength: "UPDATE"}).
			Where("id = ? AND deleted_at IS NULL", identity.ProductID).Take(&productLock).Error; err != nil {
			return fmt.Errorf("%w: product for MBOM branch does not exist", ErrInvalidProductionBOMBranchOperation)
		}
		branch := models.ProductionRoute{
			ProductID:          identity.ProductID,
			BOMOwnerType:       identity.BOMOwnerType,
			BOMOwnerCustomerID: identity.BOMOwnerCustomerID,
			BOMVersionLevel:    identity.BOMVersionLevel,
		}
		if err := validateProductionRouteBOMBranchIdentity(branch); err != nil {
			return fmt.Errorf("%w: %v", ErrInvalidProductionBOMBranchOperation, err)
		}
		if err := hydrateProductionRouteBOMBranch(tx, &branch); err != nil {
			return fmt.Errorf("%w: %v", ErrInvalidProductionBOMBranchOperation, err)
		}
		identity = productionRouteBOMBranchIdentityFromModel(branch)

		var librarySteps []models.ProcessStep
		if len(processLibraryIDs) > 0 {
			if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
				Where("id IN ?", processLibraryIDs).Order("id asc").Find(&librarySteps).Error; err != nil {
				return err
			}
		}
		libraryByID := make(map[string]models.ProcessStep, len(librarySteps))
		for _, step := range librarySteps {
			libraryByID[step.ID] = step
		}
		for _, id := range processLibraryIDs {
			step, exists := libraryByID[id]
			if !exists || !step.IsActive {
				return fmt.Errorf("%w: process library entry %s is missing or inactive", ErrInvalidProductionBOMBranchOperation, id)
			}
		}

		var currentOperations []models.ProductionBOMBranchOperation
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
			Where("product_id = ? AND UPPER(bom_owner_type) = ? AND COALESCE(bom_owner_customer_id, '') = ? AND COALESCE(bom_version_level, '') = ?", identity.ProductID, identity.BOMOwnerType, identity.BOMOwnerCustomerID, identity.BOMVersionLevel).
			Order("sort_order asc, created_at asc, id asc").Find(&currentOperations).Error; err != nil {
			return err
		}

		var currentSelections []models.ProductionBOMBranchOperationProcessLibrarySelection
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
			Where("product_id = ? AND UPPER(bom_owner_type) = ? AND COALESCE(bom_owner_customer_id, '') = ? AND COALESCE(bom_version_level, '') = ?", identity.ProductID, identity.BOMOwnerType, identity.BOMOwnerCustomerID, identity.BOMVersionLevel).
			Find(&currentSelections).Error; err != nil {
			return err
		}
		operationByID := make(map[string]models.ProductionBOMBranchOperation, len(currentOperations))
		for _, operation := range currentOperations {
			operationByID[operation.ID] = operation
		}
		selectionByLibraryID := make(map[string]models.ProductionBOMBranchOperationProcessLibrarySelection, len(currentSelections))
		for _, selection := range currentSelections {
			selectionByLibraryID[selection.ProcessLibraryID] = selection
		}

		for sortOrder, libraryID := range processLibraryIDs {
			libraryStep := libraryByID[libraryID]
			selection, exists := selectionByLibraryID[libraryID]
			if !exists {
				operation := models.ProductionBOMBranchOperation{
					BaseModel: models.BaseModel{ID: uuid.NewString()},
					ProductID: identity.ProductID, BOMOwnerType: identity.BOMOwnerType,
					BOMOwnerCustomerID: identity.BOMOwnerCustomerID, BOMVersionLevel: identity.BOMVersionLevel,
					Name: libraryStep.Name, Description: libraryStep.Description, SortOrder: sortOrder, IsActive: true,
				}
				if err := tx.Create(&operation).Error; err != nil {
					return err
				}
				selection = models.ProductionBOMBranchOperationProcessLibrarySelection{
					BaseModel: models.BaseModel{ID: uuid.NewString()},
					ProductID: identity.ProductID, BOMOwnerType: identity.BOMOwnerType,
					BOMOwnerCustomerID: identity.BOMOwnerCustomerID, BOMVersionLevel: identity.BOMVersionLevel,
					BranchOperationID: operation.ID, ProcessLibraryID: libraryID, SortOrder: sortOrder,
				}
				if err := tx.Create(&selection).Error; err != nil {
					return err
				}
				operationByID[operation.ID] = operation
			} else {
				if err := tx.Model(&selection).Update("sort_order", sortOrder).Error; err != nil {
					return err
				}
				operation := operationByID[selection.BranchOperationID]
				if err := tx.Model(&operation).Updates(map[string]any{"sort_order": sortOrder, "is_active": true}).Error; err != nil {
					return err
				}
				operation.SortOrder = sortOrder
				operation.IsActive = true
				operationByID[operation.ID] = operation
			}
		}

		for _, selection := range currentSelections {
			if _, keep := seenLibraryIDs[selection.ProcessLibraryID]; keep {
				continue
			}
			if err := validateProductionBOMBranchOperationSelectionRemovalReferencesTx(tx, selection.BranchOperationID); err != nil {
				return err
			}
			if err := tx.Delete(&models.ProductionBOMBranchOperationProcessLibrarySelection{}, "id = ?", selection.ID).Error; err != nil {
				return err
			}
			if _, exists := operationByID[selection.BranchOperationID]; exists {
				if err := tx.Delete(&models.ProductionBOMBranchOperation{}, "id = ?", selection.BranchOperationID).Error; err != nil {
					return err
				}
			}
		}

		selected = make([]ProductionBOMBranchOperationDTO, 0, len(processLibraryIDs))
		for _, libraryID := range processLibraryIDs {
			selection := selectionByLibraryID[libraryID]
			if selection.ID == "" {
				var created models.ProductionBOMBranchOperationProcessLibrarySelection
				if err := tx.Where("product_id = ? AND UPPER(bom_owner_type) = ? AND COALESCE(bom_owner_customer_id, '') = ? AND COALESCE(bom_version_level, '') = ? AND process_library_id = ?", identity.ProductID, identity.BOMOwnerType, identity.BOMOwnerCustomerID, identity.BOMVersionLevel, libraryID).First(&created).Error; err != nil {
					return err
				}
				selection = created
			}
			operation := operationByID[selection.BranchOperationID]
			operation.ProcessLibraryID = libraryID
			selected = append(selected, mapProductionBOMBranchOperationToDTO(operation))
		}
		return nil
	})
	return selected, err
}

func (service *ProductionService) SaveProductionBOMBranchOperation(
	request SaveProductionBOMBranchOperationRequest,
) (ProductionBOMBranchOperationDTO, error) {
	operation := mapProductionBOMBranchOperationDTOToModel(request.Operation)
	operation.ProductID = strings.TrimSpace(operation.ProductID)
	operation.BOMOwnerType = strings.ToUpper(strings.TrimSpace(operation.BOMOwnerType))
	operation.BOMOwnerCustomerID = strings.TrimSpace(operation.BOMOwnerCustomerID)
	operation.BOMVersionLevel = strings.TrimSpace(operation.BOMVersionLevel)
	operation.Name = strings.TrimSpace(operation.Name)
	operation.Description = strings.TrimSpace(operation.Description)
	if operation.Name == "" {
		return ProductionBOMBranchOperationDTO{}, fmt.Errorf("%w: name is required", ErrInvalidProductionBOMBranchOperation)
	}
	isUpdate := operation.ID != ""
	if operation.ID == "" {
		operation.ID = uuid.NewString()
	}

	err := service.txManager.WithinTransaction(func(tx *gorm.DB) error {
		var productLock struct {
			ID string
		}
		if err := tx.Table("products").Select("id").Clauses(clause.Locking{Strength: "UPDATE"}).
			Where("id = ? AND deleted_at IS NULL", operation.ProductID).Take(&productLock).Error; err != nil {
			return fmt.Errorf("%w: product for MBOM branch does not exist", ErrInvalidProductionBOMBranchOperation)
		}
		branch := models.ProductionRoute{
			ProductID:          operation.ProductID,
			BOMOwnerType:       operation.BOMOwnerType,
			BOMOwnerCustomerID: operation.BOMOwnerCustomerID,
			BOMVersionLevel:    operation.BOMVersionLevel,
		}
		if err := validateProductionRouteBOMBranchIdentity(branch); err != nil {
			return fmt.Errorf("%w: %v", ErrInvalidProductionBOMBranchOperation, err)
		}
		if err := hydrateProductionRouteBOMBranch(tx, &branch); err != nil {
			return fmt.Errorf("%w: %v", ErrInvalidProductionBOMBranchOperation, err)
		}
		operation.ProductID = branch.ProductID
		operation.BOMOwnerType = branch.BOMOwnerType
		operation.BOMOwnerCustomerID = branch.BOMOwnerCustomerID
		operation.BOMVersionLevel = branch.BOMVersionLevel
		if !isUpdate && operation.ProcessLibraryID == "" {
			return fmt.Errorf("%w: processLibraryId is required for a new L3", ErrInvalidProductionBOMBranchOperation)
		}

		if isUpdate {
			var existing models.ProductionBOMBranchOperation
			if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&existing, "id = ?", operation.ID).Error; err != nil {
				return fmt.Errorf("%w: branch operation does not exist", ErrInvalidProductionBOMBranchOperation)
			}
			if productionBOMBranchOperationIdentity(existing) != productionBOMBranchOperationIdentity(operation) {
				return fmt.Errorf("%w: branch operation ownership cannot be changed", ErrInvalidProductionBOMBranchOperation)
			}
			var selection models.ProductionBOMBranchOperationProcessLibrarySelection
			if err := tx.Where("branch_operation_id = ?", operation.ID).First(&selection).Error; err != nil {
				return fmt.Errorf("%w: branch operation selection is missing", ErrInvalidProductionBOMBranchOperation)
			}
			if operation.ProcessLibraryID != "" && selection.ProcessLibraryID != operation.ProcessLibraryID {
				return fmt.Errorf("%w: process library source cannot be changed on an existing L3", ErrInvalidProductionBOMBranchOperation)
			}
			operation.ProcessLibraryID = selection.ProcessLibraryID
			if !operation.IsActive {
				if err := validateProductionBOMBranchOperationDeactivationReferencesTx(tx, operation.ID); err != nil {
					return err
				}
			}
		}

		if err := tx.Save(&operation).Error; err != nil {
			return err
		}
		if !isUpdate {
			var processLibrary models.ProcessStep
			if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
				Where("id = ?", operation.ProcessLibraryID).First(&processLibrary).Error; err != nil || !processLibrary.IsActive {
				return fmt.Errorf("%w: process library entry is missing or inactive", ErrInvalidProductionBOMBranchOperation)
			}
			selection := models.ProductionBOMBranchOperationProcessLibrarySelection{
				BaseModel: models.BaseModel{ID: uuid.NewString()},
				ProductID: operation.ProductID, BOMOwnerType: operation.BOMOwnerType,
				BOMOwnerCustomerID: operation.BOMOwnerCustomerID, BOMVersionLevel: operation.BOMVersionLevel,
				BranchOperationID: operation.ID, ProcessLibraryID: operation.ProcessLibraryID, SortOrder: operation.SortOrder,
			}
			if err := tx.Create(&selection).Error; err != nil {
				return err
			}
		}
		return tx.First(&operation, "id = ?", operation.ID).Error
	})
	return mapProductionBOMBranchOperationToDTO(operation), err
}

func productionBOMBranchOperationIdentity(
	operation models.ProductionBOMBranchOperation,
) productionRouteBOMBranchIdentity {
	return productionRouteBOMBranchIdentity{
		ProductID:          strings.TrimSpace(operation.ProductID),
		BOMOwnerType:       strings.ToUpper(strings.TrimSpace(operation.BOMOwnerType)),
		BOMOwnerCustomerID: strings.TrimSpace(operation.BOMOwnerCustomerID),
		BOMVersionLevel:    strings.TrimSpace(operation.BOMVersionLevel),
	}
}

func attachProductionBOMBranchOperations(
	database *gorm.DB,
	lines []models.ProductionLine,
) error {
	productIDs := make([]string, 0)
	seenProductIDs := make(map[string]struct{})
	for lineIndex := range lines {
		for segmentIndex := range lines[lineIndex].Segments {
			productID := strings.TrimSpace(lines[lineIndex].Segments[segmentIndex].ProductID)
			if productID == "" {
				continue
			}
			if _, exists := seenProductIDs[productID]; exists {
				continue
			}
			seenProductIDs[productID] = struct{}{}
			productIDs = append(productIDs, productID)
		}
	}
	if len(productIDs) == 0 {
		return nil
	}

	var operations []models.ProductionBOMBranchOperation
	if err := database.Where("product_id IN ?", productIDs).
		Order("sort_order asc, created_at asc, id asc").
		Find(&operations).Error; err != nil {
		return err
	}
	if err := filterProductionBOMBranchOperationsToLibrarySelections(database, &operations); err != nil {
		return err
	}
	operationsByBranch := make(map[productionRouteBOMBranchIdentity][]models.ProductionBOMBranchOperation)
	for _, operation := range operations {
		identity := productionBOMBranchOperationIdentity(operation)
		operationsByBranch[identity] = append(operationsByBranch[identity], operation)
	}
	for lineIndex := range lines {
		for segmentIndex := range lines[lineIndex].Segments {
			segment := &lines[lineIndex].Segments[segmentIndex]
			identity := productionLineSegmentBOMBranchIdentity(*segment)
			segment.BranchOperations = append(
				[]models.ProductionBOMBranchOperation{},
				operationsByBranch[identity]...,
			)
		}
	}
	return nil
}

func filterProductionBOMBranchOperationsToLibrarySelections(
	database *gorm.DB,
	operations *[]models.ProductionBOMBranchOperation,
) error {
	if database == nil || operations == nil {
		return nil
	}
	operationIDs := make([]string, 0, len(*operations))
	for _, operation := range *operations {
		operationIDs = append(operationIDs, operation.ID)
	}
	if len(operationIDs) == 0 {
		return nil
	}
	var selections []models.ProductionBOMBranchOperationProcessLibrarySelection
	if err := database.Table("production_bom_branch_operation_process_library_selections AS selection").
		Select("selection.*").
		Joins("JOIN process_steps AS process_library ON process_library.id = selection.process_library_id AND process_library.deleted_at IS NULL").
		Where("selection.branch_operation_id IN ?", operationIDs).
		Where("process_library.is_active = ?", true).
		Find(&selections).Error; err != nil {
		return err
	}
	selectedByOperationID := make(map[string]string, len(selections))
	for _, selection := range selections {
		selectedByOperationID[selection.BranchOperationID] = selection.ProcessLibraryID
	}
	filtered := make([]models.ProductionBOMBranchOperation, 0, len(*operations))
	for _, operation := range *operations {
		processLibraryID, selected := selectedByOperationID[operation.ID]
		if !selected {
			continue
		}
		operation.ProcessLibraryID = processLibraryID
		filtered = append(filtered, operation)
	}
	*operations = filtered
	return nil
}

func validateProductionBOMBranchOperationProcessLibrarySelection(
	database *gorm.DB,
	operation models.ProductionBOMBranchOperation,
) error {
	if database == nil {
		return nil
	}

	var selection models.ProductionBOMBranchOperationProcessLibrarySelection
	if err := database.Where("branch_operation_id = ?", operation.ID).First(&selection).Error; err != nil {
		return err
	}
	if selection.ProductID != operation.ProductID ||
		strings.ToUpper(strings.TrimSpace(selection.BOMOwnerType)) != strings.ToUpper(strings.TrimSpace(operation.BOMOwnerType)) ||
		strings.TrimSpace(selection.BOMOwnerCustomerID) != strings.TrimSpace(operation.BOMOwnerCustomerID) ||
		strings.TrimSpace(selection.BOMVersionLevel) != strings.TrimSpace(operation.BOMVersionLevel) {
		return fmt.Errorf("selection branch identity does not match branch operation")
	}

	var processLibrary models.ProcessStep
	if err := database.Where("id = ? AND is_active = ?", selection.ProcessLibraryID, true).First(&processLibrary).Error; err != nil {
		return err
	}
	return nil
}
