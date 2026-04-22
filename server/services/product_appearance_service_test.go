package services

import (
	"fmt"
	"testing"
	"xdfc-server/db"
	"xdfc-server/models"

	"github.com/glebarez/sqlite"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

func setupProductAppearanceTestDB(t *testing.T) *gorm.DB {
	t.Helper()

	testDB, err := gorm.Open(sqlite.Open(fmt.Sprintf("file:%s?mode=memory&cache=shared", t.Name())), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Silent),
	})
	require.NoError(t, err)
	require.NoError(t, testDB.Exec(`
		CREATE TABLE product_appearances (
			id TEXT PRIMARY KEY,
			created_at DATETIME,
			updated_at DATETIME,
			deleted_at DATETIME,
			revision_no TEXT,
			effective_from DATETIME,
			effective_to DATETIME,
			change_type TEXT,
			change_order_no TEXT,
			site_code TEXT,
			is_default_site NUMERIC,
			name TEXT NOT NULL,
			barcode_code TEXT NOT NULL,
			description TEXT,
			image_url TEXT,
			image_thumbnail_url TEXT,
			image_name TEXT,
			active NUMERIC DEFAULT 1,
			sort_order INTEGER DEFAULT 0,
			version INTEGER DEFAULT 1
		)
	`).Error)
	require.NoError(t, testDB.Exec(`CREATE INDEX idx_product_appearances_deleted_at ON product_appearances(deleted_at)`).Error)
	require.NoError(t, testDB.Exec(`CREATE UNIQUE INDEX idx_product_appearances_barcode_code ON product_appearances(barcode_code)`).Error)

	prevDB := db.DB
	db.DB = testDB

	sqlDB, err := testDB.DB()
	require.NoError(t, err)
	t.Cleanup(func() {
		db.DB = prevDB
		_ = sqlDB.Close()
	})

	return testDB
}

func TestSaveProductAppearanceAutoAssignsNextSortOrderOnCreate(t *testing.T) {
	testDB := setupProductAppearanceTestDB(t)

	require.NoError(t, testDB.Create(&models.ProductAppearance{
		BaseModel:   models.BaseModel{ID: "appearance-ud"},
		Name:        "UD",
		BarcodeCode: "1",
		Active:      true,
		SortOrder:   10,
		Version:     1,
	}).Error)
	require.NoError(t, testDB.Create(&models.ProductAppearance{
		BaseModel:   models.BaseModel{ID: "appearance-3k"},
		Name:        "3K",
		BarcodeCode: "2",
		Active:      true,
		SortOrder:   20,
		Version:     1,
	}).Error)

	saved, err := SaveProductAppearance(SaveProductAppearanceAPIRequest{
		ID:          "appearance-12k",
		Name:        "12K",
		BarcodeCode: "3",
		Active:      true,
		SortOrder:   0,
	})

	require.NoError(t, err)
	require.Equal(t, 30, saved.SortOrder)
}
