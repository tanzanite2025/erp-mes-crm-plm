package repositories

import (
	"testing"
	"xdfc-server/models"

	"github.com/stretchr/testify/require"
)

func TestGormSystemConfigRepositoryReturnsFallbackAndStoredValue(t *testing.T) {
	repo := NewSystemConfigRepository()
	testDB := setupRepositoryTestDB(t, `CREATE TABLE system_configs (
		key TEXT PRIMARY KEY,
		value TEXT,
		label TEXT,
		description TEXT
	)`)

	value, err := repo.GetSystemConfigValue(testDB, "topology_auth_password", "622575")
	require.NoError(t, err)
	require.Equal(t, "622575", value)

	config := models.SystemConfig{
		Key:   "topology_auth_password",
		Value: "123456",
	}
	require.NoError(t, testDB.Create(&config).Error)

	value, err = repo.GetSystemConfigValue(testDB, "topology_auth_password", "622575")
	require.NoError(t, err)
	require.Equal(t, "123456", value)
}
