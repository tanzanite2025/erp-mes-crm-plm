package services

import (
	"context"
	"encoding/json"
	"fmt"
	"github.com/glebarez/sqlite"
	"github.com/google/uuid"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
	"gorm.io/gorm/schema"
	"strings"
	"sync"
	"testing"
	"xdfc-server/audit"
	"xdfc-server/models"
)

const configurableQualityInspectionTestRules = `[{"id":"weight","name":"轮圈重量","centerValue":450,"unit":"G","gradingMode":"DEVIATION_BANDS","levels":[{"level":"优","lowerTolerance":1,"upperTolerance":2,"result":"PASS"},{"level":"可接受","lowerTolerance":5,"upperTolerance":8,"result":"PASS"},{"level":"隔离","lowerTolerance":10,"upperTolerance":12,"result":"FAIL"}]}]`

func TestConfigurableQualityInspectionGradesRespectAsymmetricBoundariesAndDispositionIndependence(t *testing.T) {
	for _, test := range []struct {
		value         float64
		grade, result string
	}{{449, "优", "PASS"}, {452, "优", "PASS"}, {448.99, "可接受", "PASS"}, {458, "可接受", "PASS"}, {445, "可接受", "PASS"}, {440, "隔离", "FAIL"}, {462, "隔离", "FAIL"}, {462.01, "", "FAIL"}, {439.99, "", "FAIL"}} {
		t.Run(fmt.Sprint(test.value), func(t *testing.T) {
			result, evaluations, err := evaluateQualityInspectionMeasurements(json.RawMessage(configurableQualityInspectionTestRules), json.RawMessage(fmt.Sprintf(`{"measurements":[{"itemId":"weight","value":%v,"unit":"G"}],"result":"PASS"}`, test.value)))
			require.NoError(t, err)
			require.Equal(t, test.result, result)
			var decoded []qualityInspectionItemEvaluation
			require.NoError(t, json.Unmarshal(evaluations, &decoded))
			require.Equal(t, test.grade, decoded[0].Grade)
			require.NotContains(t, string(evaluations), "SCRAP")
		})
	}
}

func TestQualityInspectionDecimalBoundariesRemainDeterministicAndUnsupportedFormatIsRejected(t *testing.T) {
	rules := json.RawMessage(`[{"id":"length","name":"长度","centerValue":0.1,"unit":"MM","gradingMode":"DEVIATION_BANDS","levels":[{"level":"合格","lowerTolerance":0.2,"upperTolerance":0.2,"result":"PASS"}]}]`)
	result, _, err := evaluateQualityInspectionMeasurements(rules, json.RawMessage(`{"measurements":[{"itemId":"length","value":0.3,"unit":"MM"}]}`))
	require.NoError(t, err)
	require.Equal(t, "PASS", result)
	legacy := json.RawMessage(`[{"id":"weight","name":"重量","unit":"G","centerValue":450,"levels":[{"level":"S","tolerance":0,"min":450,"max":450},{"level":"A","deviationMinExclusive":0,"tolerance":5,"min":445,"max":455},{"level":"B","deviationMinExclusive":5,"tolerance":8,"min":442,"max":458,"errorCodeLower":"CONTROLLED_PROTOCOL_SCRAP_BELOW"}]}]`)
	_, _, err = evaluateQualityInspectionMeasurements(legacy, json.RawMessage(`{"measurements":[{"itemId":"weight","value":450,"unit":"G"}]}`))
	require.ErrorContains(t, err, "格式无效")
}

func TestQualityInspectionRejectsUnsupportedFieldsInOtherwiseValidWeightRules(t *testing.T) {
	for _, replacement := range []struct{ old, next string }{
		{`"lowerTolerance":1`, `"lowerTolerance":1,"tolerance":1`},
		{`"centerValue":450`, `"centerValue":450,"formula":"measuredWeight"`},
		{`"id":"weight"`, `"ID":"weight"`},
		{`"centerValue":450`, `"CenterValue":450`},
		{`"lowerTolerance":1`, `"LowerTolerance":1`},
		{`"centerValue":450`, `"centerValue":450,"Remarks":null`},
	} {
		rules := json.RawMessage(strings.Replace(configurableQualityInspectionTestRules, replacement.old, replacement.next, 1))
		_, _, err := evaluateQualityInspectionMeasurements(rules, json.RawMessage(`{"measurements":[{"itemId":"weight","value":450,"unit":"G"}]}`))
		require.ErrorContains(t, err, "格式无效")
	}
}

func TestQualityInspectionRejectsExplicitNullFieldsThatCannotBeReadByTheStandardEditor(t *testing.T) {
	for _, field := range []string{"order", "isRequired", "remarks"} {
		t.Run(field, func(t *testing.T) {
			rules := json.RawMessage(strings.Replace(configurableQualityInspectionTestRules, `"centerValue":450`, fmt.Sprintf(`"centerValue":450,"%s":null`, field), 1))
			_, err := decodeQualityStandardWeightInspectionCriteria(rules)
			require.ErrorContains(t, err, "不能为空值")
		})
	}
}

func TestQualityInspectionGradeNamesUseUnicodeCharacterLengthLimit(t *testing.T) {
	items, err := decodeQualityStandardWeightInspectionCriteria(json.RawMessage(configurableQualityInspectionTestRules))
	require.NoError(t, err)
	items[0].Levels[0].Level = strings.Repeat("𠮷", 40)
	require.NoError(t, validateQualityInspectionCriterionGrading(items[0]))
	items[0].Levels[0].Level = strings.Repeat("𠮷", 41)
	require.ErrorContains(t, validateQualityInspectionCriterionGrading(items[0]), "40 个字符")
}

func TestQualityInspectionRejectsMissingUnknownDuplicateAndWrongUnitMeasurements(t *testing.T) {
	for _, input := range []string{`{}`, `{"measurements":[]}`, `{"measurements":[{"itemId":"weight","unit":"G"}]}`, `{"measurements":[{"itemId":"unknown","value":450,"unit":"G"}]}`, `{"measurements":[{"itemId":"weight","value":450,"unit":"KG"}]}`, `{"measurements":[{"itemId":"weight","value":450,"unit":"G"},{"itemId":"weight","value":450,"unit":"G"}]}`} {
		_, _, err := evaluateQualityInspectionMeasurements(json.RawMessage(configurableQualityInspectionTestRules), json.RawMessage(input))
		require.Error(t, err)
	}
	for _, replacement := range []struct{ old, next string }{{`"lowerTolerance":5`, `"lowerTolerance":0`}, {`"level":"可接受"`, `"level":"优"`}, {`"upperTolerance":2`, `"upperTolerance":-1`}, {`"result":"PASS"`, `"result":"SCRAP"`}, {`"gradingMode":"DEVIATION_BANDS"`, `"gradingMode":"UNKNOWN"`}, {`"centerValue":450`, `"centerValue":null`}, {`"result":"PASS"`, `"result":""`}} {
		var items []qualityStandardInspectionCriterion
		require.NoError(t, json.Unmarshal(json.RawMessage(strings.Replace(configurableQualityInspectionTestRules, replacement.old, replacement.next, 1)), &items))
		require.Error(t, validateQualityInspectionCriterionGrading(items[0]))
	}
}

func TestQualityInspectionSubmissionPersistsServerResultSnapshotAndImmutableHistory(t *testing.T) {
	database, err := gorm.Open(sqlite.Open("file:"+t.Name()+"?mode=memory&cache=shared"), &gorm.Config{})
	require.NoError(t, err)
	connection, err := database.DB()
	require.NoError(t, err)
	t.Cleanup(func() { require.NoError(t, connection.Close()) })
	for _, model := range []any{&models.InspectionStandard{}, &models.InspectionTask{}, &models.QualityAbnormality{}, &models.AuditLog{}} {
		definition, parseErr := schema.Parse(model, &sync.Map{}, schema.NamingStrategy{})
		require.NoError(t, parseErr)
		columns := []string{}
		for _, field := range definition.Fields {
			if field.DBName == "" {
				continue
			}
			columnType := "TEXT"
			if field.DataType == schema.Float || field.DataType == schema.Int || field.DataType == schema.Uint {
				columnType = "REAL"
			}
			if field.DataType == schema.Time {
				columnType = "DATETIME"
			}
			columns = append(columns, field.DBName+" "+columnType)
		}
		require.NoError(t, database.Exec("CREATE TABLE "+definition.Table+" ("+strings.Join(columns, ",")+")").Error)
	}
	standard := models.InspectionStandard{BaseModel: models.BaseModel{ID: "standard"}, Code: "WEIGHT-1", Name: "轮圈重量", ProductID: "product", Type: "FQC", Status: "PUBLISHED", Version: 1.4, Items: json.RawMessage(configurableQualityInspectionTestRules)}
	require.NoError(t, database.Create(&standard).Error)
	service := NewQualityService(qualityQuantitySettlementTestTxManager{database: database})
	ctx := audit.NewContextWithActor(context.Background(), audit.AuditActor{UserID: "inspector", Username: "inspector"})
	task := models.InspectionTask{StandardID: standard.ID, StandardVersion: standard.Version, ProductID: "product", BatchNo: "batch", Result: "PASS", InputData: json.RawMessage(`{"measurements":[{"itemId":"weight","value":470,"unit":"G"}],"grade":"S"}`)}
	require.NoError(t, service.SaveInspectionTask(ctx, &task))
	require.Equal(t, "FAIL", task.Result)
	require.Equal(t, QualityInspectionTaskStatusCompleted, task.Status)
	require.NotEmpty(t, task.EvaluationData)
	require.NotEmpty(t, task.StandardSnapshot)
	require.NotContains(t, string(task.InputData), "grade")
	var abnormality models.QualityAbnormality
	require.NoError(t, database.Where("task_id = ?", task.ID).First(&abnormality).Error)
	require.Empty(t, abnormality.DisposalMethod)
	require.Nil(t, abnormality.ScrapQuantity)
	originalSnapshot := string(task.StandardSnapshot)
	require.ErrorContains(t, service.SaveInspectionTask(ctx, &task), "不能覆盖")
	require.NoError(t, database.Model(&standard).Update("status", "ARCHIVED").Error)
	var persisted models.InspectionTask
	require.NoError(t, database.First(&persisted, "id = ?", task.ID).Error)
	require.JSONEq(t, originalSnapshot, string(persisted.StandardSnapshot))
	fresh := models.InspectionTask{StandardID: standard.ID, StandardVersion: standard.Version, ProductID: "product", BatchNo: "batch", InputData: json.RawMessage(`{"measurements":[{"itemId":"weight","value":450,"unit":"G"}]}`)}
	require.ErrorContains(t, service.SaveInspectionTask(ctx, &fresh), "已发布")
	require.NoError(t, database.Model(&standard).Update("status", "PUBLISHED").Error)
	fresh.ProductID = "other-product"
	require.ErrorContains(t, service.SaveInspectionTask(ctx, &fresh), "产品一致")
	fresh.ProductID = "product"
	fresh.StandardVersion = 1
	require.ErrorContains(t, service.SaveInspectionTask(ctx, &fresh), "版本已变化")
	fresh.StandardVersion = standard.Version
	fresh.InputData = nil
	require.ErrorContains(t, service.SaveInspectionTask(ctx, &fresh), "实测值")
	var count int64
	require.NoError(t, database.Model(&models.InspectionTask{}).Count(&count).Error)
	require.EqualValues(t, 1, count)
}

func TestQualityInspectionPostgresConcurrentRetriesPreserveSourceClaimsAndRollbackAuditFailures(t *testing.T) {
	fixture := createIsolatedQualityStandardWorkflowPostgresFixture(t)
	database := fixture.database
	require.NoError(t, database.AutoMigrate(&models.InspectionTask{}, &models.QualityAbnormality{}))
	standard := models.InspectionStandard{BaseModel: models.BaseModel{ID: uuid.NewString()}, Code: "CONFIGURABLE-WEIGHT", Name: "独立重量规则", ProductID: uuid.NewString(), Status: "PUBLISHED", Version: 1.3, Items: json.RawMessage(configurableQualityInspectionTestRules)}
	require.NoError(t, database.Create(&standard).Error)
	service := NewQualityService(qualityQuantitySettlementTestTxManager{database: database})
	key := uuid.NewString()
	request := models.InspectionTask{SubmissionKey: &key, StandardID: standard.ID, StandardVersion: standard.Version, ProductID: standard.ProductID, BatchNo: "retry-batch", InputData: json.RawMessage(`{"measurements":[{"itemId":"weight","value":470,"unit":"G"}]}`)}
	var submissions sync.WaitGroup
	results := make(chan models.InspectionTask, 2)
	errors := make(chan error, 2)
	for index := 0; index < 2; index++ {
		submissions.Add(1)
		go func() {
			defer submissions.Done()
			attempt := request
			errors <- service.SaveInspectionTask(fixture.requestContext, &attempt)
			results <- attempt
		}()
	}
	submissions.Wait()
	first, second := <-results, <-results
	require.NoError(t, <-errors)
	require.NoError(t, <-errors)
	require.Equal(t, first.ID, second.ID)
	require.Equal(t, "FAIL", first.Result)
	for _, table := range []string{"inspection_tasks", "quality_abnormalities"} {
		var count int64
		require.NoError(t, database.Table(table).Count(&count).Error)
		require.EqualValues(t, 1, count)
	}
	require.NoError(t, database.Model(&standard).Update("status", "ARCHIVED").Error)
	retry := request
	require.NoError(t, service.SaveInspectionTask(fixture.requestContext, &retry))
	require.Equal(t, first.ID, retry.ID)
	reused := request
	reused.InputData = json.RawMessage(`{"measurements":[{"itemId":"weight","value":450,"unit":"G"}]}`)
	require.ErrorContains(t, service.SaveInspectionTask(fixture.requestContext, &reused), "其他实测内容")
	require.NoError(t, database.Model(&standard).Update("status", "PUBLISHED").Error)
	pending := models.InspectionTask{BaseModel: models.BaseModel{ID: uuid.NewString()}, StandardID: standard.ID, ProductID: standard.ProductID, BatchNo: "source-batch", ProductionPlanID: uuid.NewString(), OrderID: uuid.NewString(), Result: "PENDING", Status: QualityInspectionTaskStatusClaimed, ClaimedBy: fixture.reviewer.Username}
	require.NoError(t, database.Create(&pending).Error)
	claimedAttempt := models.InspectionTask{BaseModel: models.BaseModel{ID: pending.ID}, StandardID: standard.ID, StandardVersion: standard.Version, ProductID: standard.ProductID, InputData: request.InputData, BatchNo: "forged-batch", ProductionPlanID: uuid.NewString()}
	require.ErrorIs(t, service.SaveInspectionTask(fixture.requestContext, &claimedAttempt), ErrQualityInspectionTaskClaimed)
	require.NoError(t, database.Model(&pending).Update("claimed_by", fixture.requester.Username).Error)
	claimedAttempt.ID = pending.ID
	require.NoError(t, service.SaveInspectionTask(fixture.requestContext, &claimedAttempt))
	require.Equal(t, pending.ProductionPlanID, claimedAttempt.ProductionPlanID)
	require.Equal(t, pending.OrderID, claimedAttempt.OrderID)
	require.Equal(t, pending.BatchNo, claimedAttempt.BatchNo)
	// Force the final audit write to fail after task and abnormality creation.
	require.NoError(t, database.Exec("ALTER TABLE audit_logs ADD CONSTRAINT reject_measurement_audit CHECK (module <> 'inspection-task') NOT VALID").Error)
	rollbackKey := uuid.NewString()
	rollback := request
	rollback.SubmissionKey = &rollbackKey
	require.Error(t, service.SaveInspectionTask(fixture.requestContext, &rollback))
	var count int64
	require.NoError(t, database.Model(&models.InspectionTask{}).Where("submission_key = ?", rollbackKey).Count(&count).Error)
	require.Zero(t, count)
	require.NoError(t, database.Model(&models.QualityAbnormality{}).Where("task_id = ?", rollback.ID).Count(&count).Error)
	require.Zero(t, count)
}
