package services

import (
	"testing"
	"xdfc-server/models"
	"xdfc-server/repositories"

	"github.com/glebarez/sqlite"
	"github.com/google/uuid"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

type productionTopologyL1TemplateTestTransactionManager struct {
	database *gorm.DB
}

func (manager productionTopologyL1TemplateTestTransactionManager) DB() *gorm.DB {
	return manager.database
}

func (manager productionTopologyL1TemplateTestTransactionManager) WithinTransaction(fn func(tx *gorm.DB) error) error {
	return manager.database.Transaction(fn)
}

func newProductionTopologyL1TemplateTestService(t *testing.T) (*ProductionService, *gorm.DB) {
	t.Helper()

	database, err := gorm.Open(sqlite.Open("file:"+uuid.NewString()+"?mode=memory&cache=shared"), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Silent),
	})
	require.NoError(t, err)
	statements := []string{
		`CREATE TABLE product_templates (
			id TEXT PRIMARY KEY,
			name TEXT NOT NULL,
			code TEXT NOT NULL UNIQUE,
			active BOOLEAN NOT NULL DEFAULT 1,
			updated_at DATETIME,
			deleted_at DATETIME
		)`,
		`CREATE TABLE production_lines (
			id TEXT PRIMARY KEY,
			created_at DATETIME,
			updated_at DATETIME,
			deleted_at DATETIME,
			code TEXT NOT NULL UNIQUE,
			name TEXT NOT NULL,
			product_template_id TEXT,
			description TEXT,
			version INTEGER,
			is_active BOOLEAN
		)`,
		`CREATE TABLE line_segments (
			id TEXT PRIMARY KEY,
			created_at DATETIME,
			updated_at DATETIME,
			deleted_at DATETIME,
			line_id TEXT NOT NULL,
			name TEXT NOT NULL,
			product_id TEXT,
			product_sku TEXT,
			product_name TEXT,
			bom_owner_type TEXT,
			bom_owner_customer_id TEXT,
			bom_owner_customer_name TEXT,
			bom_version_level TEXT,
			description TEXT,
			sort_order INTEGER,
			attributes TEXT
		)`,
		`CREATE TABLE production_bom_branch_operations (
			id TEXT PRIMARY KEY,
			created_at DATETIME,
			updated_at DATETIME,
			deleted_at DATETIME,
			product_id TEXT NOT NULL,
			bom_owner_type TEXT NOT NULL,
			bom_owner_customer_id TEXT NOT NULL DEFAULT '',
			bom_version_level TEXT NOT NULL DEFAULT '',
			name TEXT NOT NULL,
			description TEXT,
			sort_order INTEGER NOT NULL DEFAULT 0,
			is_active BOOLEAN NOT NULL DEFAULT 1,
			process_library_id TEXT NOT NULL DEFAULT ''
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
		`CREATE TABLE production_bom_branch_operation_process_library_selections (
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
		)`,
		`CREATE TABLE products (
			id TEXT PRIMARY KEY,
		sku TEXT NOT NULL,
			name TEXT NOT NULL,
			status TEXT NOT NULL,
			deleted_at DATETIME
		)`,
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
		`CREATE TABLE system_configs (
			key TEXT PRIMARY KEY,
			value TEXT
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
		productionTopologyL1TemplateTestTransactionManager{database: database},
		repositories.NewProductionRepository(),
		repositories.NewSystemConfigRepository(),
	)
	return service, database
}

func TestSaveProductionLineUsesSelectedProductTemplateNameForL1(t *testing.T) {
	service, database := newProductionTopologyL1TemplateTestService(t)
	template := models.ProductTemplate{
		BaseModel: models.BaseModel{ID: uuid.NewString()},
		Name:      "车圈模板",
		Code:      "rim-template",
		Active:    true,
	}
	require.NoError(t, database.Exec(
		"INSERT INTO product_templates (id, name, code, active) VALUES (?, ?, ?, ?)",
		template.ID,
		template.Name,
		template.Code,
		template.Active,
	).Error)

	saved, err := service.SaveProductionLine(SaveProductionLineRequest{
		Line: ProductionLineDTO{
			ID:                "temp-production-line",
			Code:              "rim-line-001",
			Name:              "客户端输入名称不得生效",
			ProductTemplateID: template.ID,
			Version:           1,
			IsActive:          true,
		},
		Operator: "production-test",
	})
	require.NoError(t, err)
	require.Equal(t, template.ID, saved.ProductTemplateID)
	require.Equal(t, template.Name, saved.Name)

	lines, err := service.ListProductionLines()
	require.NoError(t, err)
	require.Len(t, lines, 1)
	require.Equal(t, template.Name, lines[0].Name)

	require.NoError(t, database.Table("product_templates").Where("id = ?", template.ID).Update("name", "更新后的车圈模板").Error)
	lines, err = service.ListProductionLines()
	require.NoError(t, err)
	require.Equal(t, "更新后的车圈模板", lines[0].Name)

	templates, err := service.ListProductionLineProductTemplates()
	require.NoError(t, err)
	require.Len(t, templates, 1)
	require.Equal(t, template.ID, templates[0].ID)
	require.Equal(t, "更新后的车圈模板", templates[0].Name)
}

func TestSaveProductionLineRejectsMissingOrInactiveProductTemplate(t *testing.T) {
	service, database := newProductionTopologyL1TemplateTestService(t)
	inactiveTemplate := models.ProductTemplate{
		BaseModel: models.BaseModel{ID: uuid.NewString()},
		Name:      "停用模板",
		Code:      "inactive-template",
		Active:    false,
	}
	require.NoError(t, database.Exec(
		"INSERT INTO product_templates (id, name, code, active) VALUES (?, ?, ?, ?)",
		inactiveTemplate.ID,
		inactiveTemplate.Name,
		inactiveTemplate.Code,
		inactiveTemplate.Active,
	).Error)

	for _, testCase := range []struct {
		name              string
		productTemplateID string
	}{
		{name: "missing template"},
		{name: "inactive template", productTemplateID: inactiveTemplate.ID},
	} {
		t.Run(testCase.name, func(t *testing.T) {
			_, err := service.SaveProductionLine(SaveProductionLineRequest{
				Line: ProductionLineDTO{
					ID:                "temp-invalid-l1",
					Code:              "invalid-l1-" + testCase.name,
					ProductTemplateID: testCase.productTemplateID,
					Version:           1,
					IsActive:          true,
				},
			})
			require.ErrorIs(t, err, ErrInvalidProductionLineTemplate)
		})
	}
}
