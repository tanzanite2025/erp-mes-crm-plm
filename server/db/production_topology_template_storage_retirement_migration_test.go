package db

import (
	"testing"

	"github.com/glebarez/sqlite"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
)

func TestDropRetiredProductionTopologyTemplateStorageRemovesTemplateTable(t *testing.T) {
	database, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	require.NoError(t, err)
	require.NoError(t, database.Exec("CREATE TABLE production_topology_templates (id TEXT PRIMARY KEY, snapshot TEXT NOT NULL)").Error)

	require.NoError(t, dropRetiredProductionTopologyTemplateStorage(database))
	require.False(t, database.Migrator().HasTable("production_topology_templates"))
	require.NoError(t, dropRetiredProductionTopologyTemplateStorage(database))
}
