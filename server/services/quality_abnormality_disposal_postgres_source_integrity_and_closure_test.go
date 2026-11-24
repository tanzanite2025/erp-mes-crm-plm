package services

import (
	"context"
	"encoding/json"
	"math"
	"sync"
	"testing"
	"time"
	"xdfc-server/models"

	"github.com/google/uuid"
	"github.com/stretchr/testify/require"
)

func createQualityAbnormalityDisposalPostgresFailedInspection(t *testing.T, fixture qualityStandardWorkflowPostgresFixture) (*QualityService, models.QualityAbnormality) {
	t.Helper()
	require.NoError(t, fixture.database.AutoMigrate(&models.InspectionTask{}, &models.QualityAbnormality{}))
	standard := models.InspectionStandard{BaseModel: models.BaseModel{ID: uuid.NewString()}, Code: uuid.NewString(), Name: "可配置重量标准", ProductID: uuid.NewString(), Type: "FQC", Status: "PUBLISHED", Version: 1, Items: json.RawMessage(configurableQualityInspectionTestRules)}
	require.NoError(t, fixture.database.Create(&standard).Error)
	service := NewQualityService(qualityQuantitySettlementTestTxManager{database: fixture.database})
	task := models.InspectionTask{StandardID: standard.ID, StandardVersion: 1, ProductID: standard.ProductID, BatchNo: "disposal-source-batch", InputData: json.RawMessage(`{"measurements":[{"itemId":"weight","value":470,"unit":"G"}]}`)}
	require.NoError(t, service.SaveInspectionTask(fixture.requestContext, &task))
	var abnormality models.QualityAbnormality
	require.NoError(t, fixture.database.Where("task_id = ?", task.ID).First(&abnormality).Error)
	return service, abnormality
}

func TestQualityAbnormalityDisposalRejectsNonfiniteScrapQuantities(t *testing.T) {
	for _, quantity := range []float64{math.NaN(), math.Inf(1), math.Inf(-1), 0, -1} {
		require.Error(t, ValidateQualityAbnormalityDisposal(&models.QualityAbnormality{DisposalMethod: "SCRAP", ScrapQuantity: &quantity, ScrapUnit: "G"}))
	}
}

func TestQualityAbnormalityDisposalPostgresPreservesManualSourceAndSupportsSafeRetry(t *testing.T) {
	fixture := createIsolatedQualityStandardWorkflowPostgresFixture(t)
	service, original := createQualityAbnormalityDisposalPostgresFailedInspection(t, fixture)
	_, err := service.RecordQualityAbnormalityDisposal(context.Background(), original.ID, &QualityAbnormalityDisposalCommand{DisposalMethod: "REWORK"})
	require.ErrorContains(t, err, "当前处置人员")
	for _, command := range []QualityAbnormalityDisposalCommand{
		{DisposalMethod: "REWORK", ProductID: uuid.NewString()},
		{DisposalMethod: "REWORK", BatchNo: "another-batch"},
		{DisposalMethod: "REWORK", ProductionPlanID: uuid.NewString()},
		{DisposalMethod: "REWORK", OrderID: uuid.NewString()},
		{DisposalMethod: "REWORK", OccurredAt: func() *time.Time { changed := original.OccurredAt.Add(time.Hour); return &changed }()},
	} {
		_, err = service.RecordQualityAbnormalityDisposal(fixture.requestContext, original.ID, &command)
		require.ErrorContains(t, err, "不能变更")
	}
	quantity := 5.0
	_, err = service.RecordQualityAbnormalityDisposal(fixture.requestContext, original.ID, &QualityAbnormalityDisposalCommand{DisposalMethod: "SCRAP", ScrapQuantity: &quantity, ScrapUnit: "UNKNOWN"})
	require.ErrorContains(t, err, "已启用")
	command := &QualityAbnormalityDisposalCommand{DisposalMethod: " rework ", ProductID: original.ProductID, BatchNo: original.BatchNo, OccurredAt: original.OccurredAt}
	closed, err := service.RecordQualityAbnormalityDisposal(fixture.requestContext, original.ID, command)
	require.NoError(t, err) // Empty optional UUID columns must persist as NULL in real PostgreSQL.
	require.Equal(t, "CLOSED", closed.Status)
	require.Equal(t, fixture.requester.Username, closed.Resolver)
	require.Equal(t, original.ProductID, closed.ProductID)
	require.Equal(t, original.BatchNo, closed.BatchNo)
	require.True(t, closed.OccurredAt.Equal(*original.OccurredAt))
	var nullableLinks struct{ ProductionPlanID, OrderID *string }
	require.NoError(t, fixture.database.Model(&models.QualityAbnormality{}).Select("production_plan_id, order_id").Where("id = ?", original.ID).Scan(&nullableLinks).Error)
	require.Nil(t, nullableLinks.ProductionPlanID)
	require.Nil(t, nullableLinks.OrderID)
	retry, err := service.RecordQualityAbnormalityDisposal(fixture.requestContext, original.ID, command)
	require.NoError(t, err)
	require.True(t, retry.UpdatedAt.Equal(closed.UpdatedAt))
	_, err = service.RecordQualityAbnormalityDisposal(fixture.requestContext, original.ID, &QualityAbnormalityDisposalCommand{DisposalMethod: "SCRAP", ScrapQuantity: &quantity, ScrapUnit: "G"})
	require.ErrorContains(t, err, "已关闭")
	var logs []models.AuditLog
	require.NoError(t, fixture.database.Where("target_id = ? AND action = ?", original.ID, "record_disposal").Find(&logs).Error)
	require.Len(t, logs, 1)
	require.Contains(t, string(logs[0].Diff), "REWORK")
	require.Contains(t, string(logs[0].Diff), "OPEN")
	require.Contains(t, string(logs[0].Diff), "CLOSED")
}

func TestQualityAbnormalityDisposalPostgresConcurrentDecisionsHaveOneWinner(t *testing.T) {
	fixture := createIsolatedQualityStandardWorkflowPostgresFixture(t)
	service, original := createQualityAbnormalityDisposalPostgresFailedInspection(t, fixture)
	start := make(chan struct{})
	results := make(chan error, 2)
	var workers sync.WaitGroup
	for _, method := range []string{"REWORK", "CONCESSION"} {
		workers.Add(1)
		go func(method string) {
			defer workers.Done()
			<-start
			_, err := service.RecordQualityAbnormalityDisposal(fixture.requestContext, original.ID, &QualityAbnormalityDisposalCommand{DisposalMethod: method})
			results <- err
		}(method)
	}
	close(start)
	workers.Wait()
	close(results)
	winners := 0
	for err := range results {
		if err == nil {
			winners++
		} else {
			require.ErrorContains(t, err, "已关闭")
		}
	}
	require.Equal(t, 1, winners)
	var count int64
	require.NoError(t, fixture.database.Model(&models.AuditLog{}).Where("target_id = ? AND action = ?", original.ID, "record_disposal").Count(&count).Error)
	require.EqualValues(t, 1, count)
}

func TestQualityAbnormalityDisposalPostgresRestoresOnlyOriginalTaskLinksAndRejectsUnavailableSources(t *testing.T) {
	fixture := createIsolatedQualityStandardWorkflowPostgresFixture(t)
	service, original := createQualityAbnormalityDisposalPostgresFailedInspection(t, fixture)
	command := &QualityAbnormalityDisposalCommand{DisposalMethod: "REWORK"}
	require.NoError(t, fixture.database.Model(&original).Update("product_id", uuid.NewString()).Error)
	_, err := service.RecordQualityAbnormalityDisposal(fixture.requestContext, original.ID, command)
	require.ErrorContains(t, err, "来源不一致")
	require.NoError(t, fixture.database.Model(&original).Updates(map[string]any{"product_id": nil, "batch_no": "", "occurred_at": nil}).Error)
	require.NoError(t, fixture.database.Model(&models.InspectionTask{}).Where("id = ?", original.TaskID).Update("deleted_at", time.Now()).Error)
	_, err = service.RecordQualityAbnormalityDisposal(fixture.requestContext, original.ID, command)
	require.ErrorContains(t, err, "原检验任务不可用")
	require.NoError(t, fixture.database.Unscoped().Model(&models.InspectionTask{}).Where("id = ?", original.TaskID).Update("deleted_at", nil).Error)
	closed, err := service.RecordQualityAbnormalityDisposal(fixture.requestContext, original.ID, command)
	require.NoError(t, err)
	require.Equal(t, closed.InspectionTask.ProductID, closed.ProductID)
	require.Equal(t, closed.InspectionTask.BatchNo, closed.BatchNo)
	require.True(t, closed.OccurredAt.Equal(*closed.InspectionTask.CompletedAt))
}

func TestQualityAbnormalityDisposalPostgresScrapUsesActiveUnitAndRejectedRecordsStayUnchanged(t *testing.T) {
	fixture := createIsolatedQualityStandardWorkflowPostgresFixture(t)
	service, original := createQualityAbnormalityDisposalPostgresFailedInspection(t, fixture)
	quantity := 2.5
	command := &QualityAbnormalityDisposalCommand{DisposalMethod: "SCRAP", ScrapQuantity: &quantity, ScrapUnit: "G"}
	require.NoError(t, fixture.database.Model(&models.Unit{}).Where("code = ?", "G").Update("status", "inactive").Error)
	_, err := service.RecordQualityAbnormalityDisposal(fixture.requestContext, original.ID, command)
	require.ErrorContains(t, err, "已启用")
	require.NoError(t, fixture.database.Model(&models.Unit{}).Where("code = ?", "G").Update("status", "active").Error)
	require.NoError(t, fixture.database.Model(&original).Update("status", "REJECTED").Error)
	_, err = service.RecordQualityAbnormalityDisposal(fixture.requestContext, original.ID, command)
	require.ErrorContains(t, err, "仅待处置")
	require.NoError(t, fixture.database.Model(&original).Update("status", "OPEN").Error)
	closed, err := service.RecordQualityAbnormalityDisposal(fixture.requestContext, original.ID, command)
	require.NoError(t, err)
	require.Equal(t, quantity, *closed.ScrapQuantity)
	require.Equal(t, "G", closed.ScrapUnit)
	// Retrying confirmed facts remains safe after a unit is later retired.
	require.NoError(t, fixture.database.Model(&models.Unit{}).Where("code = ?", "G").Update("status", "inactive").Error)
	_, err = service.RecordQualityAbnormalityDisposal(fixture.requestContext, original.ID, command)
	require.NoError(t, err)
}

func TestQualityAbnormalityDisposalPostgresAuditFailureRollsBackAndOutsourceFactsAreLocked(t *testing.T) {
	fixture := createIsolatedQualityStandardWorkflowPostgresFixture(t)
	service, original := createQualityAbnormalityDisposalPostgresFailedInspection(t, fixture)
	module := NormalizeAuditModule("QualityAbnormality")
	require.NoError(t, fixture.database.Exec("ALTER TABLE audit_logs ADD CONSTRAINT reject_disposal_audit CHECK (module <> '"+module+"') NOT VALID").Error)
	_, err := service.RecordQualityAbnormalityDisposal(fixture.requestContext, original.ID, &QualityAbnormalityDisposalCommand{DisposalMethod: "REWORK"})
	require.Error(t, err)
	var persisted models.QualityAbnormality
	require.NoError(t, fixture.database.First(&persisted, "id = ?", original.ID).Error)
	require.Equal(t, "OPEN", persisted.Status)
	require.Empty(t, persisted.DisposalMethod)
	require.Empty(t, persisted.Resolver)
	require.NoError(t, fixture.database.Exec("ALTER TABLE audit_logs DROP CONSTRAINT reject_disposal_audit").Error)
	quantity := 3.0
	require.NoError(t, fixture.database.Model(&models.InspectionTask{}).Where("id = ?", original.TaskID).Update("source_type", QualityInspectionTaskSourceProductionOutsource).Error)
	require.NoError(t, fixture.database.Model(&persisted).Updates(map[string]any{"disposal_method": "SCRAP", "scrap_quantity": quantity, "scrap_unit": "HISTORICAL_UNIT"}).Error)
	for _, command := range []QualityAbnormalityDisposalCommand{{DisposalMethod: "REWORK"}, {DisposalMethod: "SCRAP", ScrapQuantity: &quantity, ScrapUnit: "G"}} {
		_, err = service.RecordQualityAbnormalityDisposal(fixture.requestContext, original.ID, &command)
		require.ErrorContains(t, err, "已联动库存")
	}
	closed, err := service.RecordQualityAbnormalityDisposal(fixture.requestContext, original.ID, &QualityAbnormalityDisposalCommand{DisposalMethod: "SCRAP", ScrapQuantity: &quantity, ScrapUnit: "HISTORICAL_UNIT"})
	require.NoError(t, err)
	require.Equal(t, "CLOSED", closed.Status)
	require.Equal(t, quantity, *closed.ScrapQuantity)
}
