package services

import (
	"encoding/json"
	"testing"
	"xdfc-server/models"

	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
)

type fakeTransactionManager struct {
	db *gorm.DB
}

func (m fakeTransactionManager) DB() *gorm.DB {
	return m.db
}

func (m fakeTransactionManager) WithinTransaction(fn func(tx *gorm.DB) error) error {
	return fn(m.db)
}

type fakeProductionRepository struct {
	existingLine          models.ProductionLine
	lines                 []models.ProductionLine
	saveProductionLineHit bool
	savedLine             models.ProductionLine
	saveProcessStepHit    bool
	savedStep             models.ProcessStep
	appendedJobCategoryID string
	appendedProcessID     string
	deletedLineID         string
	bumpVersionResult     bool
}

func (r *fakeProductionRepository) ListProductionLines(database *gorm.DB) ([]models.ProductionLine, error) {
	return r.lines, nil
}

func (r *fakeProductionRepository) GetProductionLineByID(database *gorm.DB, id string) (models.ProductionLine, error) {
	return r.existingLine, nil
}

func (r *fakeProductionRepository) DeleteJobCategoryProcessMappingsNotIn(database *gorm.DB, lineID string, processIDs []string) error {
	return nil
}

func (r *fakeProductionRepository) DeleteJobCategoriesNotIn(database *gorm.DB, lineID string, categoryIDs []string) error {
	return nil
}

func (r *fakeProductionRepository) DeleteLineSegmentsNotIn(database *gorm.DB, lineID string, segmentIDs []string) error {
	return nil
}

func (r *fakeProductionRepository) BumpProductionLineVersion(database *gorm.DB, id string, version int64) (bool, error) {
	if !r.bumpVersionResult {
		return false, nil
	}
	return true, nil
}

func (r *fakeProductionRepository) SaveProductionLine(database *gorm.DB, line *models.ProductionLine) error {
	r.saveProductionLineHit = true
	r.savedLine = *line
	return nil
}

func (r *fakeProductionRepository) DeleteProductionLine(database *gorm.DB, id string) error {
	r.deletedLineID = id
	return nil
}

func (r *fakeProductionRepository) ListProcessSteps(database *gorm.DB) ([]models.ProcessStep, error) {
	return nil, nil
}

func (r *fakeProductionRepository) SaveProcessStep(database *gorm.DB, step *models.ProcessStep) error {
	r.saveProcessStepHit = true
	r.savedStep = *step
	if r.savedStep.ID == "" {
		r.savedStep.ID = "step-1"
	}
	step.ID = r.savedStep.ID
	return nil
}

func (r *fakeProductionRepository) DeleteProcessStep(database *gorm.DB, id string) error {
	return nil
}

func (r *fakeProductionRepository) AppendProcessToJobCategory(database *gorm.DB, jobCategoryID string, processID string) error {
	r.appendedJobCategoryID = jobCategoryID
	r.appendedProcessID = processID
	return nil
}

func (r *fakeProductionRepository) RemoveProcessFromJobCategory(database *gorm.DB, jobCategoryID string, processID string) error {
	return nil
}

type fakeSystemConfigRepository struct {
	value string
}

func (r fakeSystemConfigRepository) GetSystemConfigValue(database *gorm.DB, key string, defaultValue string) (string, error) {
	if r.value == "" {
		return defaultValue, nil
	}
	return r.value, nil
}

func TestProductionServiceSaveProductionLineRejectsUnauthorizedAuthCode(t *testing.T) {
	repo := &fakeProductionRepository{
		existingLine:      models.ProductionLine{BaseModel: models.BaseModel{ID: "line-1"}, Version: 3},
		bumpVersionResult: true,
	}
	service := NewProductionService(
		fakeTransactionManager{},
		repo,
		fakeSystemConfigRepository{value: "expected"},
	)

	_, err := service.SaveProductionLine(SaveProductionLineRequest{
		Line: ProductionLineDTO{
			ID:      "line-1",
			Version: 3,
			Name:    "Line A",
		},
		AuthCode: "wrong",
	})

	require.ErrorIs(t, err, ErrProductionTopologyUnauthorized)
	require.False(t, repo.saveProductionLineHit)
}

func TestProductionServiceSaveProductionLineRejectsVersionConflict(t *testing.T) {
	repo := &fakeProductionRepository{
		existingLine:      models.ProductionLine{BaseModel: models.BaseModel{ID: "line-1"}, Version: 4},
		bumpVersionResult: true,
	}
	service := NewProductionService(
		fakeTransactionManager{},
		repo,
		fakeSystemConfigRepository{value: "expected"},
	)

	_, err := service.SaveProductionLine(SaveProductionLineRequest{
		Line: ProductionLineDTO{
			ID:      "line-1",
			Version: 3,
			Name:    "Line A",
		},
		AuthCode: "expected",
	})

	require.ErrorIs(t, err, ErrProductionLineVersionConflict)
	require.False(t, repo.saveProductionLineHit)
}

func TestProductionServiceSaveProductionLineSetsInitialVersionForNewLine(t *testing.T) {
	repo := &fakeProductionRepository{}
	service := NewProductionService(
		fakeTransactionManager{},
		repo,
		fakeSystemConfigRepository{},
	)

	line, err := service.SaveProductionLine(SaveProductionLineRequest{
		Line: ProductionLineDTO{
			ID:   "temp-1",
			Name: "Line B",
		},
		Operator: "tester",
		IP:       "127.0.0.1",
	})

	require.NoError(t, err)
	require.Equal(t, int64(1), line.Version)
	require.True(t, repo.saveProductionLineHit)
	require.Equal(t, int64(1), repo.savedLine.Version)
}

func TestProductionServicePatchProductionLineAppliesSegmentsDeltaAndReusesSaveChain(t *testing.T) {
	repo := &fakeProductionRepository{
		existingLine: models.ProductionLine{
			BaseModel: models.BaseModel{ID: "line-1"},
			Code:      "LINE-A",
			Name:      "Line A",
			Version:   3,
			Segments: []models.LineSegment{
				{
					BaseModel: models.BaseModel{ID: "segment-1"},
					LineID:    "line-1",
					Name:      "Old Segment",
					SortOrder: 0,
				},
			},
		},
		bumpVersionResult: true,
	}
	service := NewProductionService(
		fakeTransactionManager{},
		repo,
		fakeSystemConfigRepository{value: "expected"},
	)

	segmentsRaw, err := json.Marshal([]LineSegmentDTO{
		{
			ID:        "segment-2",
			LineID:    "line-1",
			Name:      "New Segment",
			SortOrder: 0,
		},
	})
	require.NoError(t, err)

	line, err := service.PatchProductionLine(PatchProductionLineRequest{
		ID: "line-1",
		Delta: map[string]json.RawMessage{
			"segments": json.RawMessage(`{"o":[{"id":"segment-1","lineId":"line-1","name":"Old Segment","sortOrder":0,"jobCategories":[]}],"n":` + string(segmentsRaw) + `}`),
		},
		Version:  3,
		AuthCode: "expected",
		Operator: "tester",
		IP:       "127.0.0.1",
	})

	require.NoError(t, err)
	require.True(t, repo.saveProductionLineHit)
	require.Equal(t, int64(4), line.Version)
	require.Len(t, repo.savedLine.Segments, 1)
	require.Equal(t, "segment-2", repo.savedLine.Segments[0].ID)
	require.Equal(t, "New Segment", repo.savedLine.Segments[0].Name)
}

func TestProductionServiceSaveProcessStepPersistsProcess(t *testing.T) {
	repo := &fakeProductionRepository{}
	service := NewProductionService(
		fakeTransactionManager{},
		repo,
		fakeSystemConfigRepository{},
	)

	step, err := service.SaveProcessStep(SaveProcessStepRequest{
		Step: ProcessStepDTO{
			ID:   "step-1",
			Name: "Polish",
		},
		Operator: "tester",
		IP:       "127.0.0.1",
	})

	require.NoError(t, err)
	require.True(t, repo.saveProcessStepHit)
	require.Equal(t, "step-1", step.ID)
}

func TestProductionServiceAssignProcessToJobCategory(t *testing.T) {
	repo := &fakeProductionRepository{}
	service := NewProductionService(
		fakeTransactionManager{},
		repo,
		fakeSystemConfigRepository{},
	)

	err := service.AssignProcessToJobCategory(JobCategoryProcessMappingRequest{
		JobCategoryID: "job-1",
		ProcessID:     "step-1",
		Operator:      "tester",
		IP:            "127.0.0.1",
	})

	require.NoError(t, err)
	require.Equal(t, "job-1", repo.appendedJobCategoryID)
	require.Equal(t, "step-1", repo.appendedProcessID)
}

func TestProductionServiceDeleteProductionLineWritesAudit(t *testing.T) {
	testDB := setupAuditServiceSQLiteDB(t)
	repo := &fakeProductionRepository{}
	service := NewProductionService(
		fakeTransactionManager{db: testDB},
		repo,
		fakeSystemConfigRepository{},
	)

	err := service.DeleteProductionLine("line-9", "tester", "127.0.0.1")

	require.NoError(t, err)
	require.Equal(t, "line-9", repo.deletedLineID)
	var logs []models.AuditLog
	require.NoError(t, testDB.Find(&logs).Error)
	require.Len(t, logs, 1)
	require.Equal(t, "production-line", logs[0].Module)
	require.Equal(t, "line-9", logs[0].TargetID)
	require.Equal(t, "Delete", logs[0].Action)
	require.Equal(t, "tester", logs[0].Operator)
	require.Equal(t, "127.0.0.1", logs[0].IP)
}
