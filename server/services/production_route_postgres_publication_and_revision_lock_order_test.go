package services

import (
	"testing"
	"time"

	"xdfc-server/models"
	"xdfc-server/repositories"

	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type productionObservedPostgresTransactionManager struct {
	database       *gorm.DB
	transactionPID chan<- int
	beforeCommit   func() error
}

func TestProductionRoutePostgresPublicationLocksRouteBeforeProcessStepsToAvoidLockInversion(t *testing.T) {
	fixture := createProductionPlanMBOMBranchPostgresFixture(t)
	database := fixture.database
	require.NoError(t, database.Model(&models.ProductionRoute{}).Where("id = ?", fixture.route.ID).Update("status", "DRAFT").Error)
	locked := database.Begin()
	require.NoError(t, locked.Error)
	defer locked.Rollback()
	var route models.ProductionRoute
	require.NoError(t, locked.Clauses(clause.Locking{Strength: "UPDATE"}).First(&route, "id = ?", fixture.route.ID).Error)
	publicationPID := make(chan int, 1)
	manager := productionObservedPostgresTransactionManager{database: database, transactionPID: publicationPID}
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
	var processStep models.ProcessStep
	require.NoError(t, locked.Clauses(clause.Locking{Strength: "UPDATE", Options: "NOWAIT"}).
		First(&processStep, "id = ?", fixture.route.Steps[0].ProcessStepID).Error,
		"publication waiting for a route must not hold its process locks ahead of the route writer")
	require.NoError(t, locked.Commit().Error)
	require.NoError(t, <-publicationResult)
}

func TestProductionRoutePostgresDraftSaveLocksFamilyBeforeRevision(t *testing.T) {
	fixture := createProductionPlanMBOMBranchPostgresFixture(t)
	database := fixture.database
	require.NoError(t, database.Model(&models.ProductionRoute{}).Where("id = ?", fixture.route.ID).Update("status", "DRAFT").Error)

	var route models.ProductionRoute
	require.NoError(t, database.Preload("Steps").Preload("Steps.ProcessStep").First(&route, "id = ?", fixture.route.ID).Error)
	request := SaveProductionRouteRequest{Route: mapProductionRouteToDTO(route), Operator: "test"}
	locked := database.Begin()
	require.NoError(t, locked.Error)
	defer locked.Rollback()
	var family models.ProductionRouteFamily
	require.NoError(t, locked.Clauses(clause.Locking{Strength: "UPDATE"}).First(&family, "id = ?", route.RouteFamilyID).Error)

	savePID := make(chan int, 1)
	manager := productionObservedPostgresTransactionManager{database: database, transactionPID: savePID}
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

func (manager productionObservedPostgresTransactionManager) DB() *gorm.DB {
	return manager.database
}

func (manager productionObservedPostgresTransactionManager) WithinTransaction(execute func(*gorm.DB) error) error {
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
