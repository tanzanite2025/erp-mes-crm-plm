package services

import (
	"fmt"
	"sync"
	"testing"
	"time"

	"xdfc-server/models"
	"xdfc-server/repositories"

	"github.com/google/uuid"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
)

func createProductionProcessLibraryBranchSelectionPostgresBranch(t *testing.T, database *gorm.DB) string {
	t.Helper()
	productID := uuid.NewString()
	require.NoError(t, database.Exec(`INSERT INTO products (id, sku, name, status) VALUES (?, ?, ?, 'ACTIVE')`, productID, "PROCESS-SELECTION-"+productID, "工序选配并发测试产品").Error)
	require.NoError(t, database.Exec(`INSERT INTO boms (id, product_id, bom_type, status, owner_type, owner_customer_id, version_level)
		VALUES (?, ?, 'MBOM', 'RELEASED', 'INTERNAL', '', 'standard')`, uuid.NewString(), productID).Error)
	return productID
}

func newProductionProcessLibraryBranchSelectionPostgresService(
	database *gorm.DB,
	manager productionBranchOperationReferenceObservedTransactionManager,
) *ProductionService {
	manager.database = database
	return NewProductionService(manager, repositories.NewProductionRepository(), repositories.NewSystemConfigRepository())
}

func TestProductionProcessLibraryBranchSelectionPostgresConcurrentReplacementsKeepLastCommittedSelection(t *testing.T) {
	fixture := createProductionPlanMBOMBranchPostgresFixture(t)
	database := fixture.database
	productID := createProductionProcessLibraryBranchSelectionPostgresBranch(t, database)
	processes := []models.ProcessStep{
		{Code: "CONCURRENT-SELECTION-A", Name: "并发工序 A", IsActive: true},
		{Code: "CONCURRENT-SELECTION-B", Name: "并发工序 B", IsActive: true},
	}
	require.NoError(t, database.Create(&processes).Error)

	firstPrepared, releaseFirstCommit := make(chan struct{}), make(chan struct{})
	var releaseOnce sync.Once
	releaseFirst := func() { releaseOnce.Do(func() { close(releaseFirstCommit) }) }
	defer releaseFirst()
	firstManager := productionBranchOperationReferenceObservedTransactionManager{database: database, beforeCommit: func() error {
		close(firstPrepared)
		select {
		case <-releaseFirstCommit:
			return nil
		case <-time.After(15 * time.Second):
			return fmt.Errorf("timed out waiting to commit first process selection")
		}
	}}
	secondPID := make(chan int, 1)
	firstService := newProductionProcessLibraryBranchSelectionPostgresService(database, firstManager)
	secondService := newProductionProcessLibraryBranchSelectionPostgresService(database, productionBranchOperationReferenceObservedTransactionManager{database: database, transactionPID: secondPID})
	selectionRequest := func(processID string) SaveProductionBOMBranchOperationSelectionRequest {
		return SaveProductionBOMBranchOperationSelectionRequest{ProductID: productID, BOMOwnerType: "INTERNAL", BOMVersionLevel: "standard", ProcessLibraryIDs: []string{processID}}
	}
	type selectionResult struct {
		operations []ProductionBOMBranchOperationDTO
		err        error
	}
	firstResult, secondResult := make(chan selectionResult, 1), make(chan selectionResult, 1)
	go func() {
		operations, err := firstService.SaveProductionBOMBranchOperationSelection(selectionRequest(processes[0].ID))
		firstResult <- selectionResult{operations: operations, err: err}
	}()
	select {
	case <-firstPrepared:
	case result := <-firstResult:
		t.Fatalf("first selection failed before commit: %v", result.err)
	case <-time.After(5 * time.Second):
		t.Fatal("first selection did not reach commit")
	}
	go func() {
		operations, err := secondService.SaveProductionBOMBranchOperationSelection(selectionRequest(processes[1].ID))
		secondResult <- selectionResult{operations: operations, err: err}
	}()
	select {
	case pid := <-secondPID:
		waitForProductionPlanPostgresTransactionToBlock(t, database, pid)
	case <-time.After(5 * time.Second):
		t.Fatal("second selection did not start")
	}
	releaseFirst()
	require.NoError(t, (<-firstResult).err)
	lastSelection := <-secondResult
	require.NoError(t, lastSelection.err)
	require.Len(t, lastSelection.operations, 1)
	require.Equal(t, processes[1].ID, lastSelection.operations[0].ProcessLibraryID)

	var activeSelectionCount int64
	require.NoError(t, database.Model(&models.ProductionBOMBranchOperationProcessLibrarySelection{}).
		Where("product_id = ?", productID).Count(&activeSelectionCount).Error)
	require.EqualValues(t, 1, activeSelectionCount)
	var activeOperationCount int64
	require.NoError(t, database.Model(&models.ProductionBOMBranchOperation{}).
		Where("product_id = ?", productID).Count(&activeOperationCount).Error)
	require.EqualValues(t, 1, activeOperationCount)
}

func TestProductionProcessLibraryPostgresSelectionAndDeactivationSerializeBothCommitOrders(t *testing.T) {
	for _, selectionCommitsFirst := range []bool{true, false} {
		t.Run(fmt.Sprintf("selection_commits_first=%t", selectionCommitsFirst), func(t *testing.T) {
			fixture := createProductionPlanMBOMBranchPostgresFixture(t)
			database := fixture.database
			productID := createProductionProcessLibraryBranchSelectionPostgresBranch(t, database)
			processLibrary := models.ProcessStep{Code: "SELECTION-DEACTIVATION-RACE", Name: "并发启停工序", IsActive: true}
			require.NoError(t, database.Create(&processLibrary).Error)

			firstPrepared, releaseFirstCommit := make(chan struct{}), make(chan struct{})
			var releaseOnce sync.Once
			releaseFirst := func() { releaseOnce.Do(func() { close(releaseFirstCommit) }) }
			defer releaseFirst()
			firstManager := productionBranchOperationReferenceObservedTransactionManager{database: database, beforeCommit: func() error {
				close(firstPrepared)
				select {
				case <-releaseFirstCommit:
					return nil
				case <-time.After(15 * time.Second):
					return fmt.Errorf("timed out waiting to commit first process library change")
				}
			}}
			secondPID := make(chan int, 1)
			firstService := newProductionProcessLibraryBranchSelectionPostgresService(database, firstManager)
			secondService := newProductionProcessLibraryBranchSelectionPostgresService(database, productionBranchOperationReferenceObservedTransactionManager{database: database, transactionPID: secondPID})
			selectionRequest := SaveProductionBOMBranchOperationSelectionRequest{ProductID: productID, BOMOwnerType: "INTERNAL", BOMVersionLevel: "standard", ProcessLibraryIDs: []string{processLibrary.ID}}
			deactivateRequest := SaveProcessStepRequest{Step: ProcessStepDTO{ID: processLibrary.ID, Code: processLibrary.Code, Name: processLibrary.Name, IsActive: false}}
			firstResult, secondResult := make(chan error, 1), make(chan error, 1)
			if selectionCommitsFirst {
				go func() {
					_, err := firstService.SaveProductionBOMBranchOperationSelection(selectionRequest)
					firstResult <- err
				}()
			} else {
				go func() {
					_, err := firstService.SaveProcessStep(deactivateRequest)
					firstResult <- err
				}()
			}
			select {
			case <-firstPrepared:
			case err := <-firstResult:
				t.Fatalf("first process library transaction failed before commit: %v", err)
			case <-time.After(5 * time.Second):
				t.Fatal("first process library transaction did not reach commit")
			}
			if selectionCommitsFirst {
				go func() { _, err := secondService.SaveProcessStep(deactivateRequest); secondResult <- err }()
			} else {
				go func() {
					_, err := secondService.SaveProductionBOMBranchOperationSelection(selectionRequest)
					secondResult <- err
				}()
			}
			select {
			case pid := <-secondPID:
				waitForProductionPlanPostgresTransactionToBlock(t, database, pid)
			case <-time.After(5 * time.Second):
				t.Fatal("second process library transaction did not start")
			}
			releaseFirst()
			require.NoError(t, <-firstResult)
			secondError := <-secondResult
			var selectedCount int64
			require.NoError(t, database.Model(&models.ProductionBOMBranchOperationProcessLibrarySelection{}).
				Where("process_library_id = ?", processLibrary.ID).Count(&selectedCount).Error)
			var savedLibrary models.ProcessStep
			require.NoError(t, database.First(&savedLibrary, "id = ?", processLibrary.ID).Error)
			if selectionCommitsFirst {
				require.ErrorIs(t, secondError, ErrProductionProcessLibraryReferenceConflict)
				require.EqualValues(t, 1, selectedCount)
				require.True(t, savedLibrary.IsActive)
			} else {
				require.ErrorIs(t, secondError, ErrInvalidProductionBOMBranchOperation)
				require.Zero(t, selectedCount)
				require.False(t, savedLibrary.IsActive)
			}
		})
	}
}
