package services

import (
	"errors"
	"testing"
	"xdfc-server/db"
	"xdfc-server/models"

	"github.com/glebarez/sqlite"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

func createProductAppearanceBusinessComponentPersistenceTestDatabase(t *testing.T) *gorm.DB {
	t.Helper()
	database, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{Logger: logger.Default.LogMode(logger.Silent)})
	require.NoError(t, err)
	connection, err := database.DB()
	require.NoError(t, err)
	connection.SetMaxOpenConns(1)
	require.NoError(t, database.Exec(`CREATE TABLE product_appearances (
        id text PRIMARY KEY, created_at datetime, updated_at datetime, deleted_at datetime,
        revision_no text, effective_from datetime, effective_to datetime, change_type text,
        change_order_no text, site_code text, is_default_site boolean,
        name text, barcode_code text UNIQUE, description text,
        image_url text, image_thumbnail_url text, image_name text,
        active boolean DEFAULT true, sort_order integer, version integer
    )`).Error)
	previousDatabase := db.DB
	db.DB = database
	t.Cleanup(func() { db.DB = previousDatabase; require.NoError(t, connection.Close()) })
	return database
}

func TestProductAppearanceBusinessComponentCreatesInactiveAppearanceAndReturnsPersistedRecord(t *testing.T) {
	database := createProductAppearanceBusinessComponentPersistenceTestDatabase(t)
	saved, err := SaveProductAppearance(SaveProductAppearanceAPIRequest{ID: "appearance-inactive", Name: " Hidden appearance ", BarcodeCode: "7", Active: false})
	require.NoError(t, err)
	require.False(t, saved.Active)
	require.Equal(t, "Hidden appearance", saved.Name)
	require.Equal(t, 1, saved.Version)
	require.Equal(t, 10, saved.SortOrder)
	var persisted models.ProductAppearance
	require.NoError(t, database.First(&persisted, "id = ?", saved.ID).Error)
	require.False(t, persisted.Active)
	require.Equal(t, saved.Version, persisted.Version)
}

func TestProductAppearanceBusinessComponentPatchClearsFieldsAndPreservesVersionConflicts(t *testing.T) {
	database := createProductAppearanceBusinessComponentPersistenceTestDatabase(t)
	saved, err := SaveProductAppearance(SaveProductAppearanceAPIRequest{ID: "appearance-edit", Name: "UD", BarcodeCode: "1", Description: "Old description", ImageURL: "/uploads/old.png", ImageThumbnailURL: "/uploads/old.png", ImageName: "old.png", Active: true})
	require.NoError(t, err)
	emptyValue := ""
	inactive := false
	updated, err := PatchProductAppearance(PatchProductAppearanceRequest{ID: saved.ID, ExpectedVersion: saved.Version, Description: &emptyValue, ImageURL: &emptyValue, ImageThumbnailURL: &emptyValue, ImageName: &emptyValue, Active: &inactive})
	require.NoError(t, err)
	var persisted models.ProductAppearance
	require.NoError(t, database.First(&persisted, "id = ?", saved.ID).Error)
	require.Empty(t, persisted.Description)
	require.Empty(t, persisted.ImageURL)
	require.Empty(t, persisted.ImageThumbnailURL)
	require.Empty(t, persisted.ImageName)
	require.False(t, persisted.Active)
	require.Equal(t, 2, persisted.Version)
	require.Equal(t, persisted.Version, updated.Version)
	newName := "Should not overwrite"
	_, err = PatchProductAppearance(PatchProductAppearanceRequest{ID: saved.ID, ExpectedVersion: saved.Version, Name: &newName})
	require.True(t, errors.Is(err, ErrProductAppearancePatchVersionConflict))
	require.NoError(t, database.First(&persisted, "id = ?", saved.ID).Error)
	require.Equal(t, "UD", persisted.Name)
}
