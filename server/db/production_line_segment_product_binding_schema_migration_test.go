package db

import (
	"testing"

	"xdfc-server/models"

	"github.com/glebarez/sqlite"
	"github.com/google/uuid"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

func newLegacyProductionLineSegmentProductBindingTestDatabase(t *testing.T) *gorm.DB {
	t.Helper()

	database, err := gorm.Open(sqlite.Open("file:"+uuid.NewString()+"?mode=memory&cache=shared"), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Silent),
	})
	require.NoError(t, err)
	require.NoError(t, database.Exec(`CREATE TABLE line_segments (
		id TEXT PRIMARY KEY,
		line_id TEXT NOT NULL,
		name TEXT NOT NULL,
		deleted_at DATETIME
	)`).Error)
	return database
}

func TestPrepareProductionLineSegmentProductBindingSchemaMigrationRemovesLegacySegmentsBeforeRequiredProductMigration(t *testing.T) {
	database := newLegacyProductionLineSegmentProductBindingTestDatabase(t)
	require.NoError(t, database.Exec(`INSERT INTO line_segments (id, line_id, name, deleted_at) VALUES
		('active-segment', 'line-1', 'Legacy active segment', NULL),
		('deleted-segment', 'line-1', 'Legacy deleted segment', CURRENT_TIMESTAMP)`).Error)

	require.NoError(t, PrepareProductionLineSegmentProductBindingSchemaMigration(database))
	var remainingSegmentCount int64
	require.NoError(t, database.Table("line_segments").Count(&remainingSegmentCount).Error)
	require.Zero(t, remainingSegmentCount)

	require.NoError(t, database.AutoMigrate(&models.LineSegment{}))
	require.True(t, database.Migrator().HasColumn(&models.LineSegment{}, "product_id"))
}

func TestPrepareProductionLineSegmentProductBindingSchemaMigrationKeepsOnlyBoundActiveSegments(t *testing.T) {
	database, err := gorm.Open(sqlite.Open("file:"+uuid.NewString()+"?mode=memory&cache=shared"), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Silent),
	})
	require.NoError(t, err)
	require.NoError(t, database.Exec(`CREATE TABLE line_segments (
		id TEXT PRIMARY KEY,
		line_id TEXT NOT NULL,
		name TEXT NOT NULL,
		product_id TEXT,
		deleted_at DATETIME
	)`).Error)
	require.NoError(t, database.Exec(`INSERT INTO line_segments (id, line_id, name, product_id, deleted_at) VALUES
		('bound-active-segment', 'line-1', 'Bound active segment', 'product-1', NULL),
		('unbound-active-segment', 'line-1', 'Unbound active segment', NULL, NULL),
		('deleted-bound-segment', 'line-1', 'Deleted bound segment', 'product-2', CURRENT_TIMESTAMP)`).Error)

	require.NoError(t, PrepareProductionLineSegmentProductBindingSchemaMigration(database))
	var remainingSegmentCount int64
	require.NoError(t, database.Table("line_segments").Count(&remainingSegmentCount).Error)
	require.EqualValues(t, 1, remainingSegmentCount)
	var remainingSegmentID string
	require.NoError(t, database.Table("line_segments").Select("id").Scan(&remainingSegmentID).Error)
	require.Equal(t, "bound-active-segment", remainingSegmentID)
}
