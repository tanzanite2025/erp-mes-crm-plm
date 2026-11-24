package db

import (
	"fmt"
	"xdfc-server/models"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

func EnsureProductionBOMBranchOperationProcessLibraryIdentity(database *gorm.DB) error {
	if database == nil ||
		!database.Migrator().HasTable(&models.ProductionBOMBranchOperation{}) ||
		!database.Migrator().HasTable(&models.ProductionBOMBranchOperationProcessLibrarySelection{}) {
		return nil
	}

	return database.Transaction(func(tx *gorm.DB) error {
		if !tx.Migrator().HasColumn(&models.ProductionBOMBranchOperation{}, "ProcessLibraryID") {
			if err := tx.Migrator().AddColumn(&models.ProductionBOMBranchOperation{}, "ProcessLibraryID"); err != nil {
				return fmt.Errorf("failed to add branch operation process library identity: %w", err)
			}
		}

		err := tx.Exec(`UPDATE production_bom_branch_operations
		SET process_library_id = (
			SELECT selection.process_library_id
			FROM production_bom_branch_operation_process_library_selections AS selection
			WHERE selection.branch_operation_id = production_bom_branch_operations.id
				AND selection.deleted_at IS NULL
			ORDER BY selection.created_at ASC, selection.id ASC
			LIMIT 1
		)
		WHERE COALESCE(process_library_id, '') = ''
			AND EXISTS (
				SELECT 1
				FROM production_bom_branch_operation_process_library_selections AS selection
				WHERE selection.branch_operation_id = production_bom_branch_operations.id
					AND selection.deleted_at IS NULL
			)`).Error
		if err != nil {
			return fmt.Errorf("failed to backfill branch operation process library identities: %w", err)
		}
		if err := tx.Exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_production_bom_branch_operation_library_identity
		ON production_bom_branch_operations (product_id, bom_owner_type, bom_owner_customer_id, bom_version_level, process_library_id)
		WHERE process_library_id IS NOT NULL AND process_library_id <> ''`).Error; err != nil {
			return fmt.Errorf("failed to enforce unique process library identity per MBOM branch: %w", err)
		}

		var operations []models.ProductionBOMBranchOperation
		if err := tx.Where("COALESCE(process_library_id, '') <> ''").Find(&operations).Error; err != nil {
			return fmt.Errorf("failed to load branch operations with process library identities: %w", err)
		}
		for _, operation := range operations {
			var selection models.ProductionBOMBranchOperationProcessLibrarySelection
			err := tx.Where("branch_operation_id = ?", operation.ID).First(&selection).Error
			if err == nil {
				continue
			}
			if err != gorm.ErrRecordNotFound {
				return fmt.Errorf("failed to load process library selection for branch operation %s: %w", operation.ID, err)
			}
			selection = models.ProductionBOMBranchOperationProcessLibrarySelection{
				BaseModel:          models.BaseModel{ID: uuid.NewString()},
				ProductID:          operation.ProductID,
				BOMOwnerType:       operation.BOMOwnerType,
				BOMOwnerCustomerID: operation.BOMOwnerCustomerID,
				BOMVersionLevel:    operation.BOMVersionLevel,
				BranchOperationID:  operation.ID,
				ProcessLibraryID:   operation.ProcessLibraryID,
				SortOrder:          operation.SortOrder,
			}
			if err := tx.Create(&selection).Error; err != nil {
				return fmt.Errorf("failed to persist process library selection for branch operation %s: %w", operation.ID, err)
			}
		}
		return nil
	})
}
