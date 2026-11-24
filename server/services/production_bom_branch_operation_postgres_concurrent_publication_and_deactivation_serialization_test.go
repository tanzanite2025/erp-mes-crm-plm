package services

import (
	"fmt"
	"sync"
	"testing"
	"time"

	"xdfc-server/models"
	"xdfc-server/repositories"

	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type productionBranchOperationReferenceObservedTransactionManager struct {
	database       *gorm.DB
	transactionPID chan<- int
	beforeCommit   func() error
}

func TestProductionBOMBranchOperationPostgresPublicationLocksRouteBeforeOperationsToAvoidSaveLockInversion(t *testing.T) {
	fixture := createProductionPlanMBOMBranchPostgresFixture(t)
	database := fixture.database
	require.NoError(t, database.Model(&models.ProductionRoute{}).Where("id = ?", fixture.route.ID).Update("status", "DRAFT").Error)
	locked := database.Begin()
	require.NoError(t, locked.Error)
	defer locked.Rollback()
	var route models.ProductionRoute
	require.NoError(t, locked.Clauses(clause.Locking{Strength: "UPDATE"}).First(&route, "id = ?", fixture.route.ID).Error)
	publicationPID := make(chan int, 1)
	manager := productionBranchOperationReferenceObservedTransactionManager{database: database, transactionPID: publicationPID}
	service := NewProductionService(manager, repositories.NewProductionRepository(), repositories.NewSystemConfigRepository())
	publicationResult := make(chan error, 1)
	go func() {
		_, err := service.PublishProductionRoute(route.ID, route.Version, "test", "")
		publicationResult <- err
	}()
	select {
	case pid := <-publicationPID:
		waitForProductionPlanPostgresTransactionToBlock(t, database, pid)
	case <-time.After(5 * time.Second):
		t.Fatal("publication transaction did not start")
	}
	var operation models.ProductionBOMBranchOperation
	require.NoError(t, locked.Clauses(clause.Locking{Strength: "UPDATE", Options: "NOWAIT"}).
		First(&operation, "id = ?", fixture.route.Steps[0].BranchOperationID).Error,
		"publication waiting for a route must not hold its operation locks ahead of the route writer")
	require.NoError(t, locked.Commit().Error)
	require.NoError(t, <-publicationResult)
}

func TestProductionRoutePostgresDraftSaveLocksFamilyBeforeRevision(t *testing.T) {
	fixture := createProductionPlanMBOMBranchPostgresFixture(t)
	database := fixture.database
	require.NoError(t, database.Model(&models.ProductionRoute{}).Where("id = ?", fixture.route.ID).Update("status", "DRAFT").Error)

	var route models.ProductionRoute
	require.NoError(t, database.Preload("Steps").Preload("Steps.BranchOperation").First(&route, "id = ?", fixture.route.ID).Error)
	request := SaveProductionRouteRequest{Route: mapProductionRouteToDTO(route), Operator: "test"}
	locked := database.Begin()
	require.NoError(t, locked.Error)
	defer locked.Rollback()
	var family models.ProductionRouteFamily
	require.NoError(t, locked.Clauses(clause.Locking{Strength: "UPDATE"}).First(&family, "id = ?", route.RouteFamilyID).Error)

	savePID := make(chan int, 1)
	manager := productionBranchOperationReferenceObservedTransactionManager{database: database, transactionPID: savePID}
	service := NewProductionService(manager, repositories.NewProductionRepository(), repositories.NewSystemConfigRepository())
	saveResult := make(chan error, 1)
	go func() {
		_, err := service.SaveProductionRoute(request)
		saveResult <- err
	}()
	var blockedPID int
	select {
	case blockedPID = <-savePID:
	case <-time.After(5 * time.Second):
		t.Fatal("draft save transaction did not start")
	}
	require.Eventually(t, func() bool {
		var isBlocked bool
		err := database.Raw("SELECT cardinality(pg_blocking_pids(?)) > 0", blockedPID).Scan(&isBlocked).Error
		return err == nil && isBlocked
	}, 5*time.Second, 10*time.Millisecond, "draft save must wait on the route family lock")

	var routeRevision models.ProductionRoute
	require.NoError(t, locked.Clauses(clause.Locking{Strength: "UPDATE", Options: "NOWAIT"}).
		First(&routeRevision, "id = ?", route.ID).Error,
		"draft save waiting for its family must not lock the route revision first")
	require.NoError(t, locked.Commit().Error)
	require.NoError(t, <-saveResult)
}

func (manager productionBranchOperationReferenceObservedTransactionManager) DB() *gorm.DB {
	return manager.database
}

func (manager productionBranchOperationReferenceObservedTransactionManager) WithinTransaction(execute func(*gorm.DB) error) error {
	return manager.database.Transaction(func(transaction *gorm.DB) error {
		if manager.transactionPID != nil {
			var pid int
			if err := transaction.Raw("SELECT pg_backend_pid()").Scan(&pid).Error; err != nil {
				return err
			}
			manager.transactionPID <- pid
		}
		if err := execute(transaction); err != nil {
			return err
		}
		if manager.beforeCommit != nil {
			return manager.beforeCommit()
		}
		return nil
	})
}

func TestProductionBOMBranchOperationPostgresConcurrentPublicationAndDeactivationSerializeBothCommitOrders(t *testing.T) {
	for _, publicationCommitsFirst := range []bool{true, false} {
		t.Run(fmt.Sprintf("publication_commits_first=%t", publicationCommitsFirst), func(t *testing.T) {
			fixture := createProductionPlanMBOMBranchPostgresFixture(t)
			database := fixture.database
			require.NoError(t, database.Model(&models.ProductionRoute{}).Where("id = ?", fixture.route.ID).Update("status", "DRAFT").Error)
			var operation models.ProductionBOMBranchOperation
			require.NoError(t, database.First(&operation, "id = ?", fixture.route.Steps[0].BranchOperationID).Error)
			request := SaveProductionBOMBranchOperationRequest{Operation: mapProductionBOMBranchOperationToDTO(operation)}
			request.Operation.IsActive = false
			firstChangePrepared := make(chan struct{})
			releaseFirstCommit := make(chan struct{})
			var releaseFirstCommitOnce sync.Once
			releaseFirstTransaction := func() { releaseFirstCommitOnce.Do(func() { close(releaseFirstCommit) }) }
			defer releaseFirstTransaction()
			firstManager := productionBranchOperationReferenceObservedTransactionManager{
				database: database,
				beforeCommit: func() error {
					close(firstChangePrepared)
					select {
					case <-releaseFirstCommit:
						return nil
					case <-time.After(15 * time.Second):
						return fmt.Errorf("timed out waiting to commit the first operation reference transaction")
					}
				},
			}
			secondPID := make(chan int, 1)
			secondManager := productionBranchOperationReferenceObservedTransactionManager{database: database, transactionPID: secondPID}
			firstService := NewProductionService(firstManager, repositories.NewProductionRepository(), repositories.NewSystemConfigRepository())
			secondService := NewProductionService(secondManager, repositories.NewProductionRepository(), repositories.NewSystemConfigRepository())
			firstResult, secondResult := make(chan error, 1), make(chan error, 1)
			executePublicationOrDeactivation := func(service *ProductionService, publish bool) error {
				if publish {
					_, err := service.PublishProductionRoute(fixture.route.ID, fixture.route.Version, "test", "")
					return err
				}
				_, err := service.SaveProductionBOMBranchOperation(request)
				return err
			}
			go func() { firstResult <- executePublicationOrDeactivation(firstService, publicationCommitsFirst) }()
			select {
			case <-firstChangePrepared:
			case err := <-firstResult:
				t.Fatalf("first transaction failed before reaching commit: %v", err)
			case <-time.After(5 * time.Second):
				t.Fatal("first transaction did not reach commit")
			}
			go func() { secondResult <- executePublicationOrDeactivation(secondService, !publicationCommitsFirst) }()
			select {
			case pid := <-secondPID:
				waitForProductionPlanPostgresTransactionToBlock(t, database, pid)
			case <-time.After(5 * time.Second):
				t.Fatal("second transaction did not start")
			}
			releaseFirstTransaction()
			require.NoError(t, <-firstResult)
			secondError := <-secondResult
			if publicationCommitsFirst {
				require.ErrorIs(t, secondError, ErrProductionBOMBranchOperationDeactivationBlocked)
			} else {
				require.ErrorIs(t, secondError, ErrInvalidProductionRoute)
			}
			var route models.ProductionRoute
			require.NoError(t, database.First(&route, "id = ?", fixture.route.ID).Error)
			require.NoError(t, database.First(&operation, "id = ?", operation.ID).Error)
			if publicationCommitsFirst {
				require.Equal(t, "PUBLISHED", route.Status)
				require.True(t, operation.IsActive)
			} else {
				require.Equal(t, "DRAFT", route.Status)
				require.False(t, operation.IsActive)
			}
		})
	}
}
