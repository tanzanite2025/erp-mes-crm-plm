package services

import (
	"testing"
	"xdfc-server/models"
	"xdfc-server/repositories"

	"github.com/glebarez/sqlite"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
)

type productionProcessLibraryReferenceProtectionTestTxManager struct {
	database *gorm.DB
}

func (manager productionProcessLibraryReferenceProtectionTestTxManager) DB() *gorm.DB {
	return manager.database
}

func (manager productionProcessLibraryReferenceProtectionTestTxManager) WithinTransaction(
	callback func(tx *gorm.DB) error,
) error {
	return manager.database.Transaction(callback)
}

func TestProductionProcessLibraryReferenceProtectionBlocksDeactivateAndDeleteUntilBranchSelectionIsRemoved(t *testing.T) {
	database, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	require.NoError(t, err)
	createProductionProcessStepTestSchema(t, database)

	service := NewProductionService(
		productionProcessLibraryReferenceProtectionTestTxManager{database: database},
		repositories.NewProductionRepository(),
		repositories.NewSystemConfigRepository(),
	)
	require.NoError(t, database.Create(&models.ProcessStep{
		BaseModel: models.BaseModel{ID: "library-cut"},
		Code:      "CUT",
		Name:      "裁切",
		IsActive:  true,
	}).Error)
	require.NoError(t, database.Exec(`
		INSERT INTO production_bom_branch_operation_process_library_selections
		(id, product_id, bom_owner_type, bom_owner_customer_id, bom_version_level,
		 branch_operation_id, process_library_id, sort_order)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?)
	`, "selection-cut", "product-rim", "INTERNAL", "", "standard", "operation-cut", "library-cut", 0).Error)

	_, err = service.SaveProcessStep(SaveProcessStepRequest{Step: ProcessStepDTO{
		ID: "library-cut", Code: "CUT", Name: "裁切", IsActive: false,
	}})
	require.ErrorIs(t, err, ErrProductionProcessLibraryReferenceConflict)

	require.NoError(t, serviceDatabaseProcessStepIsActive(database, "library-cut"))
	require.ErrorIs(t, service.DeleteProcessStep("library-cut", "operator", "127.0.0.1"), ErrProductionProcessLibraryReferenceConflict)
	require.NoError(t, serviceDatabaseProcessStepIsActive(database, "library-cut"))

	require.NoError(t, database.Exec(`DELETE FROM production_bom_branch_operation_process_library_selections WHERE id = ?`, "selection-cut").Error)
	updated, err := service.SaveProcessStep(SaveProcessStepRequest{Step: ProcessStepDTO{
		ID: "library-cut", Code: "CUT", Name: "裁切", IsActive: false,
	}})
	require.NoError(t, err)
	require.False(t, updated.IsActive)
	require.NoError(t, service.DeleteProcessStep("library-cut", "operator", "127.0.0.1"))
}

func serviceDatabaseProcessStepIsActive(database *gorm.DB, id string) error {
	var processLibrary models.ProcessStep
	if err := database.Where("id = ?", id).First(&processLibrary).Error; err != nil {
		return err
	}
	if !processLibrary.IsActive {
		return gorm.ErrInvalidData
	}
	return nil
}
