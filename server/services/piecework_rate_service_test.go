package services

import (
	"context"
	"encoding/json"
	"errors"
	"testing"
	"time"
	"xdfc-server/audit"
	"xdfc-server/models"

	"github.com/glebarez/sqlite"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

type pieceworkRateTestTxManager struct {
	db *gorm.DB
}

func (m pieceworkRateTestTxManager) DB() *gorm.DB {
	return m.db
}

func (m pieceworkRateTestTxManager) WithinTransaction(fn func(tx *gorm.DB) error) error {
	return m.db.Transaction(fn)
}

func newPieceworkRateTestService(t *testing.T) (*PieceworkService, *gorm.DB) {
	t.Helper()

	database, err := gorm.Open(sqlite.Open("file:"+t.Name()+"?mode=memory&cache=shared"), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Silent),
	})
	require.NoError(t, err)

	sqlDB, err := database.DB()
	require.NoError(t, err)
	sqlDB.SetMaxOpenConns(1)
	t.Cleanup(func() {
		require.NoError(t, sqlDB.Close())
	})

	require.NoError(t, database.Exec(`
		CREATE TABLE process_steps (
			id TEXT PRIMARY KEY,
			created_at DATETIME,
			updated_at DATETIME,
			deleted_at DATETIME,
			code TEXT NOT NULL,
			name TEXT NOT NULL,
			description TEXT,
			sort_order INTEGER,
			is_active BOOLEAN
		)
	`).Error)
	require.NoError(t, database.Exec(`
		CREATE TABLE production_routes (
			id TEXT PRIMARY KEY,
			created_at DATETIME,
			updated_at DATETIME,
			deleted_at DATETIME,
			code TEXT NOT NULL,
			name TEXT NOT NULL,
			product_id TEXT,
			product_name TEXT,
			product_template_id TEXT,
			description TEXT,
			version INTEGER,
			status TEXT
		)
	`).Error)
	require.NoError(t, database.Exec(`
		CREATE TABLE production_route_steps (
			id TEXT PRIMARY KEY,
			created_at DATETIME,
			updated_at DATETIME,
			deleted_at DATETIME,
			route_id TEXT NOT NULL,
			sequence INTEGER NOT NULL,
			segment_id TEXT NOT NULL,
			process_step_id TEXT,
			execution_mode TEXT,
			quality_gate TEXT,
			quality_routing TEXT,
			estimated_minutes INTEGER,
			transfer_required BOOLEAN,
			description TEXT
		)
	`).Error)
	require.NoError(t, database.Exec(`
		CREATE TABLE piecework_rates (
			id TEXT PRIMARY KEY,
			created_at DATETIME,
			updated_at DATETIME,
			deleted_at DATETIME,
			product_id TEXT NOT NULL,
			process_step_id TEXT,
			route_step_id TEXT,
			process_code TEXT,
			process_name TEXT,
			unit TEXT,
			unit_price REAL,
			currency TEXT,
			effective_at DATETIME,
			effective_from DATETIME,
			effective_to DATETIME,
			status TEXT,
			remarks TEXT,
			version INTEGER,
			operator TEXT
		)
	`).Error)
	require.NoError(t, database.Exec(`
		CREATE TABLE audit_logs (
			id TEXT PRIMARY KEY,
			module TEXT,
			target_id TEXT,
			action TEXT,
			diff TEXT,
			operator TEXT,
			ip TEXT,
			created_at DATETIME
		)
	`).Error)

	return NewPieceworkService(pieceworkRateTestTxManager{db: database}), database
}

func pieceworkRateTestContext() context.Context {
	return audit.NewContextWithActor(context.Background(), audit.AuditActor{
		UserID:   "user-1",
		Username: "tester",
		IP:       "127.0.0.1",
		Source:   "test",
	})
}

func seedPieceworkRateProcess(t *testing.T, database *gorm.DB, id, code, name string) {
	t.Helper()
	require.NoError(t, database.Create(&models.ProcessStep{
		BaseModel: models.BaseModel{ID: id},
		Code:      code,
		Name:      name,
		IsActive:  true,
	}).Error)
}

func TestPieceworkRateServiceSupportsStableContractAndLegacyProjection(t *testing.T) {
	service, database := newPieceworkRateTestService(t)
	seedPieceworkRateProcess(t, database, "process-outer", "ROLL-OUTER", "外圈卷制")

	start := time.Date(2026, 8, 13, 0, 0, 0, 0, time.UTC)
	saved, err := service.SavePieceworkRateDTO(pieceworkRateTestContext(), PieceworkRateWriteDTO{
		ProductID:     "product-g24",
		ProcessStepID: "process-outer",
		RouteStepID:   "",
		Unit:          "PCS",
		UnitPrice:     pointerFloat(1.25),
		EffectiveFrom: start.Format(time.RFC3339),
		Remarks:       "stable contract",
	})
	require.NoError(t, err)
	require.Equal(t, "process-outer", saved.ProcessStepID)
	require.Equal(t, "ROLL-OUTER", saved.ProcessCode)
	require.Equal(t, 1.25, saved.UnitPrice)
	require.Equal(t, 1.25, saved.PiecePrice)
	require.Equal(t, start, saved.EffectiveFrom.UTC())
	require.Equal(t, start, saved.EffectiveAt.UTC())
	require.Equal(t, int64(1), saved.Version)
}

func TestPieceworkRateCompatibilityRejectsConflictingAliases(t *testing.T) {
	service, database := newPieceworkRateTestService(t)
	seedPieceworkRateProcess(t, database, "process-conflict", "PROC-CONFLICT", "冲突测试")

	_, err := service.SavePieceworkRateDTO(pieceworkRateTestContext(), PieceworkRateWriteDTO{
		ProductID:     "product-g24",
		ProcessStepID: "process-conflict",
		UnitPrice:     pointerFloat(1),
		PiecePrice:    pointerFloat(2),
	})
	require.ErrorIs(t, err, ErrInvalidPieceworkRate)

	effectiveFrom := time.Date(2026, 8, 14, 0, 0, 0, 0, time.UTC)
	_, err = service.SavePieceworkRateDTO(pieceworkRateTestContext(), PieceworkRateWriteDTO{
		ProductID:     "product-g24",
		ProcessStepID: "process-conflict",
		UnitPrice:     pointerFloat(1),
		EffectiveFrom: effectiveFrom.Format(time.RFC3339),
		EffectiveAt:   effectiveFrom.Add(time.Hour).Format(time.RFC3339),
	})
	require.ErrorIs(t, err, ErrInvalidPieceworkRate)
}

func TestPieceworkRatePatchRequiresCompleteSDRTSDeltaAndRejectsLegacyFields(t *testing.T) {
	incomplete, err := json.Marshal(map[string]any{"n": 1.5})
	require.NoError(t, err)
	_, err = DecodePieceworkRatePatchDelta(map[string]json.RawMessage{
		"unitPrice": incomplete,
	})
	require.Error(t, err)

	complete, err := json.Marshal(map[string]any{"o": 1, "n": 1.5})
	require.NoError(t, err)
	command, err := DecodePieceworkRatePatchDelta(map[string]json.RawMessage{
		"unitPrice": complete,
	})
	require.NoError(t, err)
	require.True(t, command.UnitPrice.Set)
	require.NotNil(t, command.UnitPrice.Value)
	require.Equal(t, 1.5, *command.UnitPrice.Value)

	require.Error(t, ValidatePieceworkRateDelta(map[string]json.RawMessage{
		"piecePrice": complete,
	}))
	require.Error(t, ValidatePieceworkRateDelta(map[string]json.RawMessage{
		"effectiveAt": complete,
	}))
}

func TestPieceworkRateCanonicalUpdateRequiresExpectedVersion(t *testing.T) {
	service, database := newPieceworkRateTestService(t)
	seedPieceworkRateProcess(t, database, "process-update", "PROC-UPDATE", "更新测试")

	created, err := service.CreatePieceworkRate(pieceworkRateTestContext(), PieceworkRateCommand{
		ProductID:     "product-g24",
		ProcessStepID: "process-update",
		UnitPrice:     1,
	})
	require.NoError(t, err)

	_, err = service.UpdatePieceworkRate(
		pieceworkRateTestContext(),
		created.ID,
		PieceworkRateCommand{
			ProductID:     "product-g24",
			ProcessStepID: "process-update",
			UnitPrice:     2,
		},
		0,
	)
	require.ErrorIs(t, err, ErrPieceworkRateVersionConflict)

	updated, err := service.UpdatePieceworkRate(
		pieceworkRateTestContext(),
		created.ID,
		PieceworkRateCommand{
			ProductID:     "product-g24",
			ProcessStepID: "process-update",
			UnitPrice:     2,
		},
		created.Version,
	)
	require.NoError(t, err)
	require.Equal(t, int64(2), updated.Version)

	_, err = service.UpdatePieceworkRate(
		pieceworkRateTestContext(),
		created.ID,
		PieceworkRateCommand{
			ProductID:     "product-g24",
			ProcessStepID: "process-update",
			UnitPrice:     3,
		},
		created.Version,
	)
	require.ErrorIs(t, err, ErrPieceworkRateVersionConflict)

	var persisted models.PieceworkRate
	require.NoError(t, database.First(&persisted, "id = ?", created.ID).Error)
	require.Equal(t, 2.0, persisted.UnitPrice)
}

func TestPieceworkRateCoreRequiresStableProcessStepIdentity(t *testing.T) {
	_, database := newPieceworkRateTestService(t)
	rate := models.PieceworkRate{
		ProductID:   "product-g24",
		ProcessCode: "PROC-LEGACY",
		UnitPrice:   1,
	}

	err := normalizeAndValidatePieceworkRate(database, &rate)
	require.ErrorIs(t, err, ErrInvalidPieceworkRate)
}

func TestPieceworkRateServiceBackfillsUniqueProcessCodeAndRejectsOverlaps(t *testing.T) {
	service, database := newPieceworkRateTestService(t)
	seedPieceworkRateProcess(t, database, "process-forming", "FORMING", "成型")

	legacyAt := time.Date(2026, 8, 13, 8, 0, 0, 0, time.UTC)
	legacy := models.PieceworkRate{
		ProductID:   "product-g24",
		ProcessCode: "FORMING",
		UnitPrice:   2,
		EffectiveAt: legacyAt,
	}
	require.NoError(t, service.SavePieceworkRate(pieceworkRateTestContext(), &legacy))

	var loaded models.PieceworkRate
	require.NoError(t, database.First(&loaded, "id = ?", legacy.ID).Error)
	require.NotNil(t, loaded.ProcessStepID)
	require.Equal(t, "process-forming", *loaded.ProcessStepID)
	require.Equal(t, legacyAt, loaded.EffectiveFrom.UTC())

	_, err := service.SavePieceworkRateDTO(pieceworkRateTestContext(), PieceworkRateWriteDTO{
		ProductID:     "product-g24",
		ProcessStepID: "process-forming",
		UnitPrice:     pointerFloat(3),
		EffectiveFrom: legacyAt.Add(30 * time.Minute).Format(time.RFC3339),
	})
	require.ErrorIs(t, err, ErrInvalidPieceworkRate)
}

func TestPieceworkRateServiceRejectsStaleVersion(t *testing.T) {
	service, database := newPieceworkRateTestService(t)
	seedPieceworkRateProcess(t, database, "process-a", "PROC-A", "作业 A")

	saved, err := service.SavePieceworkRateDTO(pieceworkRateTestContext(), PieceworkRateWriteDTO{
		ProductID:     "product-g24",
		ProcessStepID: "process-a",
		UnitPrice:     pointerFloat(1),
	})
	require.NoError(t, err)
	require.Equal(t, int64(1), saved.Version)

	updated, err := service.PatchPieceworkRate(
		pieceworkRateTestContext(),
		saved.ID,
		PieceworkRatePatchCommand{
			UnitPrice: PieceworkRatePatchField[float64]{
				Set:   true,
				Value: pointerFloat(2),
			},
		},
		1,
	)
	require.NoError(t, err)
	require.Equal(t, int64(2), updated.Version)

	_, err = service.PatchPieceworkRate(
		pieceworkRateTestContext(),
		saved.ID,
		PieceworkRatePatchCommand{
			UnitPrice: PieceworkRatePatchField[float64]{
				Set:   true,
				Value: pointerFloat(3),
			},
		},
		1,
	)
	require.True(t, errors.Is(err, ErrPieceworkRateVersionConflict))

	var persisted models.PieceworkRate
	require.NoError(t, database.First(&persisted, "id = ?", saved.ID).Error)
	require.Equal(t, 2.0, persisted.UnitPrice)
}

func TestPieceworkRateResolverPrefersRouteStepAndFallsBackToProcessStep(t *testing.T) {
	service, database := newPieceworkRateTestService(t)
	seedPieceworkRateProcess(t, database, "process-forming", "FORMING", "成型")

	require.NoError(t, database.Create(&models.ProductionRoute{
		BaseModel: models.BaseModel{ID: "route-g24"},
		Code:      "G24-ROUTE-V1",
		Name:      "G24 工艺路线",
		ProductID: "product-g24",
		Status:    "PUBLISHED",
	}).Error)
	require.NoError(t, database.Create(&models.ProductionRouteStep{
		BaseModel:     models.BaseModel{ID: "route-step-forming"},
		RouteID:       "route-g24",
		Sequence:      10,
		SegmentID:     "segment-forming",
		ProcessStepID: "process-forming",
	}).Error)

	start := time.Date(2026, 8, 1, 0, 0, 0, 0, time.UTC)
	generic, err := service.SavePieceworkRateDTO(pieceworkRateTestContext(), PieceworkRateWriteDTO{
		ProductID:     "product-g24",
		ProcessStepID: "process-forming",
		UnitPrice:     pointerFloat(1),
		EffectiveFrom: start.Format(time.RFC3339),
	})
	require.NoError(t, err)

	routeSpecific, err := service.SavePieceworkRateDTO(pieceworkRateTestContext(), PieceworkRateWriteDTO{
		ProductID:     "product-g24",
		ProcessStepID: "process-forming",
		RouteStepID:   "route-step-forming",
		UnitPrice:     pointerFloat(2),
		EffectiveFrom: start.Add(24 * time.Hour).Format(time.RFC3339),
	})
	require.NoError(t, err)

	resolver := NewPieceworkRateResolver(pieceworkRateTestTxManager{db: database})

	match, err := resolver.Resolve(pieceworkRateTestContext(), PieceworkRateLookup{
		ProductID:     "product-g24",
		RouteStepID:   "route-step-forming",
		ProcessStepID: "process-forming",
		At:            start.Add(48 * time.Hour),
	})
	require.NoError(t, err)
	require.Equal(t, PieceworkRateMatchByRouteStep, match.Kind)
	require.Equal(t, routeSpecific.ID, match.Rate.ID)

	match, err = resolver.Resolve(pieceworkRateTestContext(), PieceworkRateLookup{
		ProductID:     "product-g24",
		ProcessStepID: "process-forming",
		At:            start.Add(48 * time.Hour),
	})
	require.NoError(t, err)
	require.Equal(t, PieceworkRateMatchByProcessStep, match.Kind)
	require.Equal(t, generic.ID, match.Rate.ID)

	match, err = resolver.Resolve(pieceworkRateTestContext(), PieceworkRateLookup{
		ProductID:     "product-g24",
		RouteStepID:   "route-step-forming",
		ProcessStepID: "process-forming",
		At:            start,
	})
	require.NoError(t, err)
	require.Equal(t, PieceworkRateMatchByProcessStep, match.Kind)
	require.Equal(t, generic.ID, match.Rate.ID)
}

func TestPieceworkRateServiceDeleteRequiresExpectedVersion(t *testing.T) {
	service, database := newPieceworkRateTestService(t)
	seedPieceworkRateProcess(t, database, "process-delete", "PROC-DELETE", "删除测试")

	saved, err := service.SavePieceworkRateDTO(pieceworkRateTestContext(), PieceworkRateWriteDTO{
		ProductID:     "product-g24",
		ProcessStepID: "process-delete",
		UnitPrice:     pointerFloat(1),
	})
	require.NoError(t, err)

	require.ErrorIs(t,
		service.DeletePieceworkRate(pieceworkRateTestContext(), saved.ID, saved.Version-1),
		ErrPieceworkRateVersionConflict,
	)
	require.NoError(t, service.DeletePieceworkRate(pieceworkRateTestContext(), saved.ID, saved.Version))

	var deleted models.PieceworkRate
	require.ErrorIs(t, database.First(&deleted, "id = ?", saved.ID).Error, gorm.ErrRecordNotFound)
}

func pointerFloat(value float64) *float64 {
	return &value
}
