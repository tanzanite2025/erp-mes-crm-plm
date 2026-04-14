package services

import (
	"fmt"
	"testing"
	"xdfc-server/db"
	"xdfc-server/models"

	"github.com/glebarez/sqlite"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
)

func setupProductTemplateServiceTestDB(t *testing.T) *gorm.DB {
	t.Helper()

	testDB, err := gorm.Open(sqlite.Open(fmt.Sprintf("file:%s?mode=memory&cache=shared", t.Name())), &gorm.Config{})
	require.NoError(t, err)
	require.NoError(t, testDB.Exec(`
		CREATE TABLE product_templates (
			id TEXT PRIMARY KEY,
			created_at DATETIME,
			updated_at DATETIME,
			deleted_at DATETIME,
			revision_no TEXT DEFAULT 'R1',
			effective_from DATETIME,
			effective_to DATETIME,
			change_type TEXT DEFAULT 'MANUAL',
			change_order_no TEXT,
			site_code TEXT,
			is_default_site NUMERIC DEFAULT 1,
			name TEXT NOT NULL,
			code TEXT NOT NULL UNIQUE,
			component_key TEXT,
			description TEXT,
			active NUMERIC DEFAULT 1,
			version INTEGER DEFAULT 1
		)
	`).Error)
	require.NoError(t, testDB.Exec(`
		CREATE TABLE product_template_attribute_bindings (
			id TEXT PRIMARY KEY,
			created_at DATETIME,
			updated_at DATETIME,
			deleted_at DATETIME,
			template_id TEXT NOT NULL,
			category_key TEXT NOT NULL,
			sort_order INTEGER DEFAULT 0,
			required NUMERIC DEFAULT 0,
			active NUMERIC DEFAULT 1,
			version INTEGER DEFAULT 1
		)
	`).Error)
	require.NoError(t, testDB.Exec(`CREATE INDEX idx_product_templates_deleted_at ON product_templates(deleted_at)`).Error)

	previousDB := db.DB
	db.DB = testDB

	t.Cleanup(func() {
		db.DB = previousDB
		sqlDB, err := testDB.DB()
		require.NoError(t, err)
		require.NoError(t, sqlDB.Close())
	})

	return testDB
}

func TestListProductTemplatesSeedsDefaultsWhenTableIsEmpty(t *testing.T) {
	testDB := setupProductTemplateServiceTestDB(t)

	var beforeCount int64
	require.NoError(t, testDB.Model(&models.ProductTemplate{}).Count(&beforeCount).Error)
	require.Zero(t, beforeCount)

	items, total, err := ListProductTemplates(ProductTemplateListQuery{
		Page:     1,
		PageSize: 50,
		Options:  true,
	})
	require.NoError(t, err)
	require.Len(t, items, 3)
	require.EqualValues(t, 3, total)

	codes := []string{items[0].Code, items[1].Code, items[2].Code}
	require.ElementsMatch(t, []string{"RIM_STD", "STEM_STD", "FORK_STD"}, codes)

	var afterCount int64
	require.NoError(t, testDB.Model(&models.ProductTemplate{}).Count(&afterCount).Error)
	require.EqualValues(t, 3, afterCount)

	items, total, err = ListProductTemplates(ProductTemplateListQuery{
		Page:     1,
		PageSize: 50,
		Options:  true,
	})
	require.NoError(t, err)
	require.Len(t, items, 3)
	require.EqualValues(t, 3, total)

	require.NoError(t, testDB.Model(&models.ProductTemplate{}).Count(&afterCount).Error)
	require.EqualValues(t, 3, afterCount)
}

func TestSaveProductTemplatePersistsAttributeBindings(t *testing.T) {
	setupProductTemplateServiceTestDB(t)

	saved, err := SaveProductTemplate(SaveProductTemplateInput{
		Name:         "Template With Attributes",
		Code:         "GENERAL_STD",
		ComponentKey: "GENERAL",
		Description:  "Template with assembled attribute bindings",
		Active:       true,
		AttributeBindings: []models.ProductTemplateAttributeBinding{
			{CategoryKey: "tireType", Required: true, Active: true},
			{CategoryKey: "versionLevel", Required: false, Active: true},
		},
	})
	require.NoError(t, err)
	require.Len(t, saved.AttributeBindings, 2)
	require.Equal(t, "tireType", saved.AttributeBindings[0].CategoryKey)
	require.Equal(t, saved.ID, saved.AttributeBindings[0].TemplateID)
	require.Equal(t, 1, saved.AttributeBindings[0].SortOrder)

	items, total, err := ListProductTemplates(ProductTemplateListQuery{Page: 1, PageSize: 50, Options: true})
	require.NoError(t, err)
	require.GreaterOrEqual(t, total, int64(1))
	matched := false
	for _, item := range items {
		if item.ID != saved.ID {
			continue
		}
		matched = true
		require.Len(t, item.AttributeBindings, 2)
		require.Equal(t, "versionLevel", item.AttributeBindings[1].CategoryKey)
	}
	require.True(t, matched)
}
