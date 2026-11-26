package db

import (
	"testing"

	"github.com/glebarez/sqlite"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

func TestRetireProductionLineLegacyAssociationsDropsOnlyOldAssociationStorage(t *testing.T) {
	database, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Silent),
	})
	require.NoError(t, err)
	require.NoError(t, database.Exec(`
		CREATE TABLE production_lines (
			id TEXT PRIMARY KEY,
			code TEXT NOT NULL,
			name TEXT NOT NULL,
			product_template_id TEXT,
			description TEXT,
			version INTEGER,
			is_active BOOLEAN
		)
	`).Error)
	require.NoError(t, database.Exec(`CREATE TABLE line_segments (id TEXT PRIMARY KEY, line_id TEXT)`).Error)
	require.NoError(t, database.Exec(`
		INSERT INTO production_lines (id, code, name, product_template_id, description, version, is_active)
		VALUES ('line-1', 'LINE-1', '车圈产线', 'template-1', '制造车圈', 3, true)
	`).Error)
	require.NoError(t, database.Exec(`INSERT INTO line_segments (id, line_id) VALUES ('segment-1', 'line-1')`).Error)

	require.NoError(t, retireProductionLineLegacyAssociations(database))
	require.NoError(t, retireProductionLineLegacyAssociations(database))
	require.False(t, database.Migrator().HasTable("line_segments"))
	require.False(t, database.Migrator().HasColumn("production_lines", "product_template_id"))
	require.True(t, database.Migrator().HasColumn("production_lines", "code"))
	require.True(t, database.Migrator().HasColumn("production_lines", "name"))
	require.True(t, database.Migrator().HasColumn("production_lines", "description"))

	var storedLine struct {
		Code        string
		Name        string
		Description string
		Version     int
		IsActive    bool
	}
	require.NoError(t, database.Table("production_lines").Where("id = ?", "line-1").Take(&storedLine).Error)
	require.Equal(t, "LINE-1", storedLine.Code)
	require.Equal(t, "车圈产线", storedLine.Name)
	require.Equal(t, "制造车圈", storedLine.Description)
	require.Equal(t, 3, storedLine.Version)
	require.True(t, storedLine.IsActive)
}
