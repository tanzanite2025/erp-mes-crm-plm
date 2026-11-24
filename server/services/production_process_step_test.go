package services

import (
	"testing"
	"xdfc-server/repositories"

	"github.com/glebarez/sqlite"
	"github.com/google/uuid"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

type productionProcessStepTestTxManager struct {
	db *gorm.DB
}

func (m productionProcessStepTestTxManager) DB() *gorm.DB {
	return m.db
}

func (m productionProcessStepTestTxManager) WithinTransaction(fn func(tx *gorm.DB) error) error {
	return m.db.Transaction(fn)
}

func newProductionProcessStepTestService(t *testing.T) *ProductionService {
	t.Helper()

	database, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Silent),
	})
	require.NoError(t, err)
	createProductionProcessStepTestSchema(t, database)

	return NewProductionService(
		productionProcessStepTestTxManager{db: database},
		repositories.NewProductionRepository(),
		repositories.NewSystemConfigRepository(),
	)
}

func createProductionProcessStepTestSchema(t *testing.T, database *gorm.DB) {
	t.Helper()

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
		CREATE TABLE production_bom_branch_operation_process_library_selections (
			id TEXT PRIMARY KEY,
			created_at DATETIME,
			updated_at DATETIME,
			deleted_at DATETIME,
			product_id TEXT NOT NULL,
			bom_owner_type TEXT NOT NULL,
			bom_owner_customer_id TEXT NOT NULL DEFAULT '',
			bom_version_level TEXT NOT NULL DEFAULT '',
			branch_operation_id TEXT NOT NULL UNIQUE,
			process_library_id TEXT NOT NULL,
			sort_order INTEGER NOT NULL DEFAULT 0
		)
	`).Error)
}

func TestNormalizeProcessStepDTOTrimsCoreFields(t *testing.T) {
	step := normalizeProcessStepDTO(ProcessStepDTO{
		Code:        " PROC-01 ",
		Name:        " 打磨 ",
		Description: " 标准打磨工序 ",
	})

	require.Equal(t, "PROC-01", step.Code)
	require.Equal(t, "打磨", step.Name)
	require.Equal(t, "标准打磨工序", step.Description)
}

func TestSaveProcessStepPersistsProcessOnly(t *testing.T) {
	service := newProductionProcessStepTestService(t)

	saved, err := service.SaveProcessStep(SaveProcessStepRequest{
		Step: ProcessStepDTO{
			ID:          "process-step-polish",
			Code:        "PROC-POLISH",
			Name:        "抛光",
			Description: "标准抛光",
			SortOrder:   20,
			IsActive:    true,
		},
	})

	require.NoError(t, err)
	require.Equal(t, "process-step-polish", saved.ID)
	require.Equal(t, "PROC-POLISH", saved.Code)
	require.Equal(t, "抛光", saved.Name)

	steps, err := service.ListProcessSteps()
	require.NoError(t, err)
	require.Len(t, steps, 1)
	require.Equal(t, "process-step-polish", steps[0].ID)
	require.Equal(t, "标准抛光", steps[0].Description)
}

func TestProductionProcessLibraryCreatesInactiveEntryAndPersistsExplicitEnableDisableChanges(t *testing.T) {
	service := newProductionProcessStepTestService(t)
	saved, err := service.SaveProcessStep(SaveProcessStepRequest{Step: ProcessStepDTO{
		ID: uuid.NewString(), Code: "INACTIVE-PROCESS", Name: "待启用工序", IsActive: false,
	}})
	require.NoError(t, err)
	require.False(t, saved.IsActive, "an explicit inactive creation must not be replaced by the model default")
	for _, active := range []bool{true, false} {
		saved.IsActive = active
		saved, err = service.SaveProcessStep(SaveProcessStepRequest{Step: saved})
		require.NoError(t, err)
		require.Equal(t, active, saved.IsActive)
		listed, err := service.ListProcessSteps()
		require.NoError(t, err)
		require.Len(t, listed, 1)
		require.Equal(t, active, listed[0].IsActive)
	}
}
