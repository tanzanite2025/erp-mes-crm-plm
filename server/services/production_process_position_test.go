package services

import (
	"testing"
	"xdfc-server/models"
	"xdfc-server/repositories"

	"github.com/glebarez/sqlite"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

type productionProcessPositionTestTxManager struct {
	db *gorm.DB
}

func (m productionProcessPositionTestTxManager) DB() *gorm.DB {
	return m.db
}

func (m productionProcessPositionTestTxManager) WithinTransaction(fn func(tx *gorm.DB) error) error {
	return m.db.Transaction(fn)
}

func newProductionProcessPositionTestService(t *testing.T) (*ProductionService, *gorm.DB) {
	t.Helper()

	database, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Silent),
	})
	require.NoError(t, err)
	require.NoError(
		t,
		database.SetupJoinTable(&models.ProcessStep{}, "AllowedPositions", &models.ProcessStepAllowedPosition{}),
	)
	createProductionProcessPositionTestSchema(t, database)

	return NewProductionService(
		productionProcessPositionTestTxManager{db: database},
		repositories.NewProductionRepository(),
		repositories.NewSystemConfigRepository(),
	), database
}

func createProductionProcessPositionTestSchema(t *testing.T, database *gorm.DB) {
	t.Helper()

	require.NoError(t, database.Exec(`
		CREATE TABLE positions (
			id TEXT PRIMARY KEY,
			created_at DATETIME,
			updated_at DATETIME,
			deleted_at DATETIME,
			name TEXT NOT NULL,
			code TEXT,
			org_unit_id TEXT,
			production_unit_id TEXT,
			category TEXT,
			level INTEGER,
			is_managerial BOOLEAN,
			status TEXT,
			sort_order INTEGER,
			metadata TEXT
		)
	`).Error)
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
		CREATE TABLE process_step_allowed_positions (
			process_step_id TEXT NOT NULL,
			position_id TEXT NOT NULL,
			PRIMARY KEY (process_step_id, position_id)
		)
	`).Error)
}

func TestNormalizeProcessStepDTODeduplicatesAllowedPositionIDs(t *testing.T) {
	step := normalizeProcessStepDTO(ProcessStepDTO{
		Code:               " PROC-01 ",
		Name:               " 打磨 ",
		AllowedPositionIDs: []string{" position-a ", "", "position-a", "position-b"},
		AllowedPositions: []ProcessStepAllowedPositionDTO{
			{ID: "position-b"},
			{ID: " position-c "},
		},
	})

	require.Equal(t, "PROC-01", step.Code)
	require.Equal(t, "打磨", step.Name)
	require.Equal(t, []string{"position-a", "position-b", "position-c"}, step.AllowedPositionIDs)
	require.Empty(t, step.AllowedPositions)
}

func TestSaveProcessStepPersistsAllowedPositions(t *testing.T) {
	service, database := newProductionProcessPositionTestService(t)
	positionA := models.Position{
		BaseModel: models.BaseModel{ID: "position-a"},
		Name:      "生产操作员",
		Code:      "OP",
		Status:    "active",
	}
	positionB := models.Position{
		BaseModel: models.BaseModel{ID: "position-b"},
		Name:      "质检员",
		Code:      "QC",
		Status:    "active",
	}
	require.NoError(t, database.Create(&positionA).Error)
	require.NoError(t, database.Create(&positionB).Error)

	saved, err := service.SaveProcessStep(SaveProcessStepRequest{
		Step: ProcessStepDTO{
			ID:                 "process-step-polish",
			Code:               "PROC-POLISH",
			Name:               "抛光",
			IsActive:           true,
			AllowedPositionIDs: []string{positionA.ID, positionB.ID, positionA.ID},
		},
	})
	require.NoError(t, err)
	require.ElementsMatch(t, []string{positionA.ID, positionB.ID}, saved.AllowedPositionIDs)

	steps, err := service.ListProcessSteps()
	require.NoError(t, err)
	require.Len(t, steps, 1)
	require.ElementsMatch(t, []string{positionA.ID, positionB.ID}, steps[0].AllowedPositionIDs)
	require.Len(t, steps[0].AllowedPositions, 2)
}

func TestSaveProcessStepRejectsMissingAllowedPosition(t *testing.T) {
	service, _ := newProductionProcessPositionTestService(t)

	_, err := service.SaveProcessStep(SaveProcessStepRequest{
		Step: ProcessStepDTO{
			ID:                 "process-step-missing-position",
			Code:               "PROC-MISSING",
			Name:               "不存在职位测试",
			IsActive:           true,
			AllowedPositionIDs: []string{"missing-position-id"},
		},
	})

	require.ErrorIs(t, err, ErrInvalidProcessStep)
}
