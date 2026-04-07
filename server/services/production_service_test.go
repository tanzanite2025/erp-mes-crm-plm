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
	stations              []models.Station
	saveProductionLineHit bool
	savedLine             models.ProductionLine
	saveProcessStepHit    bool
	savedStep             models.ProcessStep
	appendedStationID     string
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

func (r *fakeProductionRepository) DeleteSegmentProcessMappingsNotIn(database *gorm.DB, lineID string, processIDs []string) error {
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

func (r *fakeProductionRepository) AppendProcessToStation(database *gorm.DB, stationID string, processID string) error {
	r.appendedStationID = stationID
	r.appendedProcessID = processID
	return nil
}

func (r *fakeProductionRepository) RemoveProcessFromStation(database *gorm.DB, stationID string, processID string) error {
	return nil
}

func (r *fakeProductionRepository) ListStationsWithProcesses(database *gorm.DB) ([]models.Station, error) {
	return r.stations, nil
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

type fakeAuditLogger struct {
	entries []AuditEntry
}

func (l *fakeAuditLogger) Write(tx *gorm.DB, entry AuditEntry) error {
	cloned := entry
	if len(entry.Diff) > 0 {
		cloned.Diff = append(json.RawMessage(nil), entry.Diff...)
	}
	l.entries = append(l.entries, cloned)
	return nil
}

func TestProductionServiceSaveProductionLineRejectsUnauthorizedAuthCode(t *testing.T) {
	repo := &fakeProductionRepository{
		existingLine:      models.ProductionLine{BaseModel: models.BaseModel{ID: "line-1"}, Version: 3},
		bumpVersionResult: true,
	}
	service := NewProductionService(
		fakeTransactionManager{},
		&fakeAuditLogger{},
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
		&fakeAuditLogger{},
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
		&fakeAuditLogger{},
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
					Name:      "旧工段",
					SortOrder: 0,
				},
			},
		},
		bumpVersionResult: true,
	}
	service := NewProductionService(
		fakeTransactionManager{},
		&fakeAuditLogger{},
		repo,
		fakeSystemConfigRepository{value: "expected"},
	)

	segmentsRaw, err := json.Marshal([]LineSegmentDTO{
		{
			ID:        "segment-2",
			LineID:    "line-1",
			Name:      "新工段",
			SortOrder: 0,
			Processes: []ProcessStepDTO{},
		},
	})
	require.NoError(t, err)

	line, err := service.PatchProductionLine(PatchProductionLineRequest{
		ID: "line-1",
		Delta: map[string]json.RawMessage{
			"segments": json.RawMessage(`{"o":[{"id":"segment-1","lineId":"line-1","name":"旧工段","sortOrder":0,"processes":[]}],"n":` + string(segmentsRaw) + `}`),
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
	require.Equal(t, "新工段", repo.savedLine.Segments[0].Name)
}

func TestProductionServiceSaveProcessStepAppendsStationMapping(t *testing.T) {
	repo := &fakeProductionRepository{}
	service := NewProductionService(
		fakeTransactionManager{},
		&fakeAuditLogger{},
		repo,
		fakeSystemConfigRepository{},
	)

	step, err := service.SaveProcessStep(SaveProcessStepRequest{
		Step: ProcessStepDTO{
			ID:   "step-1",
			Name: "Polish",
		},
		StationID: "station-1",
		Operator:  "tester",
		IP:        "127.0.0.1",
	})

	require.NoError(t, err)
	require.True(t, repo.saveProcessStepHit)
	require.Equal(t, "station-1", repo.appendedStationID)
	require.Equal(t, step.ID, repo.appendedProcessID)
}

func TestProductionServiceListStationMappingsBuildsMap(t *testing.T) {
	repo := &fakeProductionRepository{
		stations: []models.Station{
			{
				BaseModel: models.BaseModel{ID: "station-1"},
				Processes: []models.ProcessStep{
					{BaseModel: models.BaseModel{ID: "step-1"}},
					{BaseModel: models.BaseModel{ID: "step-2"}},
				},
			},
			{
				BaseModel: models.BaseModel{ID: "station-2"},
				Processes: []models.ProcessStep{},
			},
		},
	}
	service := NewProductionService(
		fakeTransactionManager{},
		&fakeAuditLogger{},
		repo,
		fakeSystemConfigRepository{},
	)

	mappings, err := service.ListStationMappings()

	require.NoError(t, err)
	require.Equal(t, []string{"step-1", "step-2"}, mappings["station-1"])
	require.Empty(t, mappings["station-2"])
}

func TestProductionServiceDeleteProductionLineWritesAudit(t *testing.T) {
	repo := &fakeProductionRepository{}
	auditLogger := &fakeAuditLogger{}
	service := NewProductionService(
		fakeTransactionManager{},
		auditLogger,
		repo,
		fakeSystemConfigRepository{},
	)

	err := service.DeleteProductionLine("line-9", "tester", "127.0.0.1")

	require.NoError(t, err)
	require.Equal(t, "line-9", repo.deletedLineID)
	require.Len(t, auditLogger.entries, 1)
	require.Equal(t, AuditEntry{
		Module:   "ProductionLine",
		TargetID: "line-9",
		Action:   "Delete",
		Operator: "tester",
		IP:       "127.0.0.1",
	}, auditLogger.entries[0])
}
