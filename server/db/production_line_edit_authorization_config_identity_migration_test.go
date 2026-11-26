package db

import (
	"testing"

	"xdfc-server/models"

	"github.com/glebarez/sqlite"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
)

func TestMigrateProductionLineEditAuthorizationConfigIdentityPreservesConfiguredValue(t *testing.T) {
	database, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	require.NoError(t, err)
	require.NoError(t, database.AutoMigrate(&models.SystemConfig{}))
	require.NoError(t, database.Create(&models.SystemConfig{
		Key:         legacyProductionLineEditAuthorizationConfigKey,
		Value:       "existing-line-edit-code",
		Label:       "Legacy authorization label",
		Description: "Legacy authorization description",
	}).Error)

	require.NoError(t, MigrateProductionLineEditAuthorizationConfigIdentity(database))
	require.NoError(t, MigrateProductionLineEditAuthorizationConfigIdentity(database))

	var migratedConfig models.SystemConfig
	require.NoError(t, database.Take(&migratedConfig, "key = ?", productionLineEditAuthorizationConfigKey).Error)
	require.Equal(t, "existing-line-edit-code", migratedConfig.Value)
	require.Equal(t, productionLineEditAuthorizationConfigLabel, migratedConfig.Label)
	require.Equal(t, productionLineEditAuthorizationConfigDesc, migratedConfig.Description)
	var legacyCount int64
	require.NoError(t, database.Model(&models.SystemConfig{}).Where("key = ?", legacyProductionLineEditAuthorizationConfigKey).Count(&legacyCount).Error)
	require.Zero(t, legacyCount)
}

func TestMigrateProductionLineEditAuthorizationConfigIdentityRejectsConflictingKeys(t *testing.T) {
	database, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	require.NoError(t, err)
	require.NoError(t, database.AutoMigrate(&models.SystemConfig{}))
	require.NoError(t, database.Create(&models.SystemConfig{Key: legacyProductionLineEditAuthorizationConfigKey, Value: "legacy"}).Error)
	require.NoError(t, database.Create(&models.SystemConfig{Key: productionLineEditAuthorizationConfigKey, Value: "current"}).Error)

	require.ErrorContains(t, MigrateProductionLineEditAuthorizationConfigIdentity(database), "both legacy and current")

	var legacyConfig models.SystemConfig
	var currentConfig models.SystemConfig
	require.NoError(t, database.Take(&legacyConfig, "key = ?", legacyProductionLineEditAuthorizationConfigKey).Error)
	require.NoError(t, database.Take(&currentConfig, "key = ?", productionLineEditAuthorizationConfigKey).Error)
	require.Equal(t, "legacy", legacyConfig.Value)
	require.Equal(t, "current", currentConfig.Value)
}
