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

func createProductionLinePostgresL2OwnershipFixture(t *testing.T) (*gorm.DB, *ProductionService, ProductionLineDTO, ProductionLineDTO) {
	t.Helper()
	fixture := createProductionPlanMBOMBranchPostgresFixture(t)
	database := fixture.database
	require.NoError(t, database.AutoMigrate(&models.ProductTemplate{}, &models.ProductionLine{}, &models.LineSegment{}, &models.SystemConfig{}))
	for _, statement := range []string{
		`ALTER TABLE production_lines ADD FOREIGN KEY (product_template_id) REFERENCES product_templates(id)`,
		`ALTER TABLE line_segments ADD FOREIGN KEY (line_id) REFERENCES production_lines(id)`,
		`ALTER TABLE line_segments ADD FOREIGN KEY (product_id) REFERENCES products(id)`,
	} {
		require.NoError(t, database.Exec(statement).Error)
	}
	template := models.ProductTemplate{Code: "POSTGRES-L1-TEMPLATE", Name: "PostgreSQL 归属测试模板", Active: true}
	require.NoError(t, database.Create(&template).Error)
	service := NewProductionService(productionTopologyL1TemplateTestTransactionManager{database: database}, repositories.NewProductionRepository(), repositories.NewSystemConfigRepository())
	lines := make([]ProductionLineDTO, 2)
	for index := range lines {
		request := productionTopologyLineWithBOMBranch(template.ID, fmt.Sprintf("POSTGRES-LINE-%d", index), "temp-new-l2", fixture.plan.ProductID, "INTERNAL", "", "standard")
		request.Segments[0].LineID = request.ID
		line, err := service.SaveProductionLine(SaveProductionLineRequest{Line: request})
		require.NoError(t, err, "temporary IDs must be converted before writing real PostgreSQL UUID columns")
		_, err = uuid.Parse(line.ID)
		require.NoError(t, err)
		_, err = uuid.Parse(line.Segments[0].ID)
		require.NoError(t, err)
		require.Equal(t, line.ID, line.Segments[0].LineID)
		lines[index] = line
	}
	return database, service, lines[0], lines[1]
}

func createProductionLinePostgresServicesWithHeldFirstCommitAndObservedSecondTransaction(t *testing.T, database *gorm.DB) (*ProductionService, *ProductionService, <-chan struct{}, <-chan int, func()) {
	t.Helper()
	firstPrepared, releaseCommit := make(chan struct{}), make(chan struct{})
	var releaseOnce sync.Once
	releaseFirstTransaction := func() { releaseOnce.Do(func() { close(releaseCommit) }) }
	t.Cleanup(releaseFirstTransaction)
	firstManager := productionBranchOperationReferenceObservedTransactionManager{database: database, beforeCommit: func() error {
		close(firstPrepared)
		select {
		case <-releaseCommit:
			return nil
		case <-time.After(15 * time.Second):
			return fmt.Errorf("timed out waiting to commit the first L1/L2 transaction")
		}
	}}
	secondPID := make(chan int, 1)
	secondManager := productionBranchOperationReferenceObservedTransactionManager{database: database, transactionPID: secondPID}
	return NewProductionService(firstManager, repositories.NewProductionRepository(), repositories.NewSystemConfigRepository()),
		NewProductionService(secondManager, repositories.NewProductionRepository(), repositories.NewSystemConfigRepository()),
		firstPrepared, secondPID, releaseFirstTransaction
}

func requireProductionLinePostgresFirstTransactionPrepared(t *testing.T, prepared <-chan struct{}, result <-chan error) {
	t.Helper()
	select {
	case <-prepared:
	case err := <-result:
		t.Fatalf("first L1/L2 transaction failed before commit: %v", err)
	case <-time.After(5 * time.Second):
		t.Fatal("first L1/L2 transaction did not reach commit")
	}
}

func requireProductionLinePostgresSecondTransactionBlocked(t *testing.T, database *gorm.DB, secondPID <-chan int) {
	t.Helper()
	select {
	case pid := <-secondPID:
		waitForProductionPlanPostgresTransactionToBlock(t, database, pid)
	case <-time.After(5 * time.Second):
		t.Fatal("second L1/L2 transaction did not start")
	}
}

func TestProductionLinePostgresConcurrentSaveAndDeleteSerializeBothCommitOrdersWithoutOrphanedChildren(t *testing.T) {
	for _, saveCommitsFirst := range []bool{true, false} {
		t.Run(fmt.Sprintf("save_commits_first=%t", saveCommitsFirst), func(t *testing.T) {
			database, _, line, other := createProductionLinePostgresL2OwnershipFixture(t)
			firstService, secondService, prepared, secondPID, releaseFirst := createProductionLinePostgresServicesWithHeldFirstCommitAndObservedSecondTransaction(t, database)
			newSegment := line.Segments[0]
			newSegment.ID, newSegment.BOMVersionLevel = uuid.NewString(), "lightweight"
			line.Segments = append(line.Segments, newSegment)
			executeSaveOrDelete := func(service *ProductionService, save bool) error {
				if save {
					_, err := service.SaveProductionLine(SaveProductionLineRequest{Line: line, AuthCode: "622575"})
					return err
				}
				return service.DeleteProductionLine(line.ID, "test", "")
			}
			firstResult, secondResult := make(chan error, 1), make(chan error, 1)
			go func() { firstResult <- executeSaveOrDelete(firstService, saveCommitsFirst) }()
			requireProductionLinePostgresFirstTransactionPrepared(t, prepared, firstResult)
			go func() { secondResult <- executeSaveOrDelete(secondService, !saveCommitsFirst) }()
			requireProductionLinePostgresSecondTransactionBlocked(t, database, secondPID)
			releaseFirst()
			require.NoError(t, <-firstResult)
			if saveCommitsFirst {
				require.NoError(t, <-secondResult)
			} else {
				require.ErrorIs(t, <-secondResult, gorm.ErrRecordNotFound)
			}
			var lineCount, childCount int64
			require.NoError(t, database.Model(&models.ProductionLine{}).Where("id = ?", line.ID).Count(&lineCount).Error)
			require.NoError(t, database.Model(&models.LineSegment{}).Where("line_id = ?", line.ID).Count(&childCount).Error)
			require.Zero(t, lineCount)
			require.Zero(t, childCount)
			var otherLine models.ProductionLine
			require.NoError(t, database.Preload("Segments").First(&otherLine, "id = ?", other.ID).Error)
			require.EqualValues(t, 1, otherLine.Version)
			require.Len(t, otherLine.Segments, 1)
			require.Equal(t, other.Segments[0].ID, otherLine.Segments[0].ID)
		})
	}
}

func TestProductionLinePostgresConcurrentSavesRejectStaleVersionBeforeRemovingChildren(t *testing.T) {
	database, _, line, _ := createProductionLinePostgresL2OwnershipFixture(t)
	firstService, secondService, prepared, secondPID, releaseFirst := createProductionLinePostgresServicesWithHeldFirstCommitAndObservedSecondTransaction(t, database)
	firstRequest := line
	firstRequest.Segments = append([]LineSegmentDTO(nil), line.Segments...)
	firstRequest.Segments[0].Description = "先提交的有效内容"
	staleRequest := line
	staleRequest.Segments = nil
	firstResult, secondResult := make(chan error, 1), make(chan error, 1)
	go func() {
		_, err := firstService.SaveProductionLine(SaveProductionLineRequest{Line: firstRequest, AuthCode: "622575"})
		firstResult <- err
	}()
	requireProductionLinePostgresFirstTransactionPrepared(t, prepared, firstResult)
	go func() {
		_, err := secondService.SaveProductionLine(SaveProductionLineRequest{Line: staleRequest, AuthCode: "622575"})
		secondResult <- err
	}()
	requireProductionLinePostgresSecondTransactionBlocked(t, database, secondPID)
	releaseFirst()
	require.NoError(t, <-firstResult)
	require.ErrorIs(t, <-secondResult, ErrProductionLineVersionConflict)
	var persisted models.ProductionLine
	require.NoError(t, database.Preload("Segments").First(&persisted, "id = ?", line.ID).Error)
	require.EqualValues(t, 2, persisted.Version)
	require.Len(t, persisted.Segments, 1)
	require.Equal(t, "先提交的有效内容", persisted.Segments[0].Description)
}

func TestProductionLinePostgresConcurrentL2IDCreationCannotStealOtherParentAndRollsBackLoser(t *testing.T) {
	database, _, firstLine, secondLine := createProductionLinePostgresL2OwnershipFixture(t)
	firstService, secondService, prepared, secondPID, releaseFirst := createProductionLinePostgresServicesWithHeldFirstCommitAndObservedSecondTransaction(t, database)
	sharedNewID := uuid.NewString()
	for _, line := range []*ProductionLineDTO{&firstLine, &secondLine} {
		newSegment := line.Segments[0]
		newSegment.ID, newSegment.BOMVersionLevel = sharedNewID, "lightweight"
		line.Segments = append(line.Segments, newSegment)
	}
	firstResult, secondResult := make(chan error, 1), make(chan error, 1)
	go func() {
		_, err := firstService.SaveProductionLine(SaveProductionLineRequest{Line: firstLine, AuthCode: "622575"})
		firstResult <- err
	}()
	requireProductionLinePostgresFirstTransactionPrepared(t, prepared, firstResult)
	go func() {
		_, err := secondService.SaveProductionLine(SaveProductionLineRequest{Line: secondLine, AuthCode: "622575"})
		secondResult <- err
	}()
	requireProductionLinePostgresSecondTransactionBlocked(t, database, secondPID)
	releaseFirst()
	require.NoError(t, <-firstResult)
	require.ErrorIs(t, <-secondResult, ErrInvalidProductionLineSegmentOwnership)
	var createdSegment models.LineSegment
	require.NoError(t, database.First(&createdSegment, "id = ?", sharedNewID).Error)
	require.Equal(t, firstLine.ID, createdSegment.LineID)
	var loser models.ProductionLine
	require.NoError(t, database.Preload("Segments").First(&loser, "id = ?", secondLine.ID).Error)
	require.EqualValues(t, 1, loser.Version)
	require.Len(t, loser.Segments, 1)
	var auditCount int64
	require.NoError(t, database.Table("audit_logs").Count(&auditCount).Error)
	require.EqualValues(t, 3, auditCount, "only the two initial creations and winning update may write audit events")
}
