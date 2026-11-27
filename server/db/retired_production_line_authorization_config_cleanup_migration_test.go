package db

import (
	"testing"

	"xdfc-server/models"

	"github.com/glebarez/sqlite"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
)

func TestDeleteRetiredProductionLineEditAuthorizationConfigsRemovesStoredKeys(t *testing.T) {
	database, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	require.NoError(t, err)
	require.NoError(t, database.AutoMigrate(&models.SystemConfig{}))
	require.NoError(t, database.Create(&[]models.SystemConfig{
		{Key: "topology_auth_password", Value: "old-topology-code"},
		{Key: "production_line_edit_auth_password", Value: "renamed-line-code"},
		{Key: "unrelated_config", Value: "keep"},
	}).Error)

	require.NoError(t, DeleteRetiredProductionLineEditAuthorizationConfigs(database))
	require.NoError(t, DeleteRetiredProductionLineEditAuthorizationConfigs(database))

	var remainingConfigs []models.SystemConfig
	require.NoError(t, database.Order("key").Find(&remainingConfigs).Error)
	require.Equal(t, []models.SystemConfig{{Key: "unrelated_config", Value: "keep"}}, remainingConfigs)
}
