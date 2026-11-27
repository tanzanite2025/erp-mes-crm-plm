package services

import (
	"encoding/json"
	"testing"
	"xdfc-server/models"
	"xdfc-server/repositories"

	"github.com/glebarez/sqlite"
	"github.com/google/uuid"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

type productionServiceTestTransactionManager struct {
	database *gorm.DB
}

func (manager productionServiceTestTransactionManager) DB() *gorm.DB {
	return manager.database
}

func (manager productionServiceTestTransactionManager) WithinTransaction(fn func(tx *gorm.DB) error) error {
	return manager.database.Transaction(fn)
}

func newProductionServiceTestHarness(t *testing.T) (*ProductionService, *gorm.DB) {
	t.Helper()

	database, err := gorm.Open(sqlite.Open("file:"+uuid.NewString()+"?mode=memory&cache=shared"), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Silent),
	})
	require.NoError(t, err)
	statements := []string{
		`CREATE TABLE production_lines (
			id TEXT PRIMARY KEY,
			created_at DATETIME,
			updated_at DATETIME,
			deleted_at DATETIME,
			code TEXT NOT NULL UNIQUE,
			name TEXT NOT NULL,
			description TEXT,
			version INTEGER,
			is_active BOOLEAN
		)`,
		`CREATE TABLE process_steps (
			id TEXT PRIMARY KEY,
			created_at DATETIME,
			updated_at DATETIME,
			deleted_at DATETIME,
			code TEXT NOT NULL,
			name TEXT NOT NULL,
			description TEXT,
			sort_order INTEGER,
			is_active BOOLEAN
		)`,
		`CREATE TABLE production_mbom_branch_process_associations (
			id TEXT PRIMARY KEY,
			created_at DATETIME,
			updated_at DATETIME,
			deleted_at DATETIME,
			product_id TEXT NOT NULL,
			bom_owner_type TEXT NOT NULL,
			bom_owner_customer_id TEXT NOT NULL DEFAULT '',
			bom_version_level TEXT NOT NULL DEFAULT '',
			process_step_id TEXT NOT NULL,
			sort_order INTEGER NOT NULL DEFAULT 0
		)`,
		`CREATE TABLE production_routes (id TEXT PRIMARY KEY, product_id TEXT, bom_owner_type TEXT, bom_owner_customer_id TEXT, bom_version_level TEXT, deleted_at DATETIME)`,
		`CREATE TABLE production_route_steps (id TEXT PRIMARY KEY, route_id TEXT, process_step_id TEXT, deleted_at DATETIME)`,
		`CREATE TABLE products (
			id TEXT PRIMARY KEY,
		sku TEXT NOT NULL,
			name TEXT NOT NULL,
			type_id TEXT DEFAULT 'type-rim',
			status TEXT NOT NULL,
			deleted_at DATETIME
		)`,
		`CREATE TABLE product_types (id TEXT PRIMARY KEY, name TEXT NOT NULL, active BOOLEAN NOT NULL DEFAULT 1)`,
		`INSERT INTO product_types (id, name) VALUES ('type-rim', '车圈')`,
		`CREATE TABLE customers (
			id TEXT PRIMARY KEY,
			name TEXT NOT NULL,
			deleted_at DATETIME
		)`,
		`CREATE TABLE boms (
			id TEXT PRIMARY KEY,
			product_id TEXT NOT NULL,
			bom_type TEXT NOT NULL,
			status TEXT NOT NULL,
			owner_type TEXT NOT NULL,
			owner_customer_id TEXT,
			version_level TEXT,
			effective_from DATETIME,
			effective_to DATETIME,
			deleted_at DATETIME
		)`,
		`CREATE TABLE audit_logs (
			id TEXT PRIMARY KEY,
			module TEXT,
			target_id TEXT,
			action TEXT,
			diff TEXT,
			operator TEXT,
			ip TEXT,
			created_at DATETIME
		)`,
	}
	for _, statement := range statements {
		require.NoError(t, database.Exec(statement).Error)
	}

	service := NewProductionService(
		productionServiceTestTransactionManager{database: database},
		repositories.NewProductionRepository(),
	)
	return service, database
}

func TestProductionLineCRUDUsesOnlyIndependentMasterData(t *testing.T) {
	service, database := newProductionServiceTestHarness(t)
	saved, err := service.SaveProductionLine(SaveProductionLineRequest{
		Line: ProductionLineDTO{
			ID:          "temp-production-line",
			Code:        "RIM-LINE-001",
			Name:        "碳纤维车圈产线",
			Description: "制造车圈",
			Version:     1,
			IsActive:    true,
		},
		Operator: "production-test",
	})
	require.NoError(t, err)
	require.Equal(t, "RIM-LINE-001", saved.Code)
	require.Equal(t, "碳纤维车圈产线", saved.Name)
	require.Equal(t, "制造车圈", saved.Description)
	var persisted models.ProductionLine
	require.NoError(t, database.First(&persisted, "id = ?", saved.ID).Error)
	require.Equal(t, saved.Code, persisted.Code)

	lines, err := service.ListProductionLines()
	require.NoError(t, err)
	require.Len(t, lines, 1)
	require.Equal(t, "碳纤维车圈产线", lines[0].Name)
	updated, err := service.PatchProductionLine(PatchProductionLineRequest{
		ID:      saved.ID,
		Version: saved.Version,
		Delta: map[string]json.RawMessage{
			"name": json.RawMessage(`{"o":"碳纤维车圈产线","n":"碳纤维车圈产线（改）"}`),
		},
	})
	require.NoError(t, err)
	require.Equal(t, "碳纤维车圈产线（改）", updated.Name)
	require.EqualValues(t, saved.Version+1, updated.Version)
	serialized, err := json.Marshal(updated)
	require.NoError(t, err)
	require.NotContains(t, string(serialized), "productTemplateId")
	require.NotContains(t, string(serialized), "segments")
	require.NoError(t, service.DeleteProductionLine(saved.ID, "production-test", ""))
	var remaining int64
	require.NoError(t, database.Model(&models.ProductionLine{}).Count(&remaining).Error)
	require.Zero(t, remaining)
}

func TestSaveProductionLineRejectsMissingName(t *testing.T) {
	service, _ := newProductionServiceTestHarness(t)
	_, err := service.SaveProductionLine(SaveProductionLineRequest{
		Line: ProductionLineDTO{ID: "temp-invalid-line", Code: "INVALID", Version: 1},
	})
	require.ErrorIs(t, err, ErrInvalidProductionLine)
}
