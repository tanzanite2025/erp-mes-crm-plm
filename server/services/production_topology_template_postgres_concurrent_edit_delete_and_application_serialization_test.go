package services

import (
	"fmt"
	"testing"

	"xdfc-server/models"

	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
)

func TestProductionTopologyTemplatePostgresConcurrentEditOrDeleteAndApplicationSerializeWithoutChangingCreatedLines(t *testing.T) {
	for _, change := range []string{"edit", "delete"} {
		for _, applyCommitsFirst := range []bool{true, false} {
			t.Run(fmt.Sprintf("%s_apply_commits_first=%t", change, applyCommitsFirst), func(t *testing.T) {
				database, _, _, template := captureProductionTopologyTemplatePostgresFixture(t)
				firstService, secondService, prepared, secondPID, releaseFirst := createProductionLinePostgresServicesWithHeldFirstCommitAndObservedSecondTransaction(t, database)
				executeTemplateApplicationOrChange := func(service *ProductionService, apply bool) error {
					if apply {
						_, err := service.ApplyProductionTopologyTemplateToNewLine(template.ID, ApplyProductionTopologyTemplateToNewLineRequest{Version: template.Version, Code: "CONCURRENT-APPLY"}, "test", "")
						return err
					}
					if change == "delete" {
						return service.DeleteProductionTopologyTemplateSnapshot(template.ID, template.Version, "test", "")
					}
					request := SaveProductionTopologyTemplateSnapshotRequest{Name: "并发模板修改", Version: template.Version, Snapshot: template.Snapshot}
					request.Snapshot.LineDescription = "只影响此后新建的 L1"
					_, err := service.SaveProductionTopologyTemplateSnapshot(template.ID, request, "test", "")
					return err
				}
				firstResult, secondResult := make(chan error, 1), make(chan error, 1)
				go func() { firstResult <- executeTemplateApplicationOrChange(firstService, applyCommitsFirst) }()
				requireProductionLinePostgresFirstTransactionPrepared(t, prepared, firstResult)
				go func() { secondResult <- executeTemplateApplicationOrChange(secondService, !applyCommitsFirst) }()
				requireProductionLinePostgresSecondTransactionBlocked(t, database, secondPID)
				releaseFirst()
				require.NoError(t, <-firstResult)
				secondError := <-secondResult
				if applyCommitsFirst {
					require.NoError(t, secondError)
				} else if change == "delete" {
					require.ErrorIs(t, secondError, gorm.ErrRecordNotFound)
				} else {
					require.ErrorIs(t, secondError, ErrProductionTopologyTemplateVersionConflict)
				}
				var created []models.ProductionLine
				require.NoError(t, database.Preload("Segments").Where("code = ?", "CONCURRENT-APPLY").Find(&created).Error)
				if applyCommitsFirst {
					require.Len(t, created, 1)
					require.Empty(t, created[0].Description, "later template changes cannot rewrite the already created line")
					require.Len(t, created[0].Segments, 1)
				} else {
					require.Empty(t, created)
				}
			})
		}
	}
}
