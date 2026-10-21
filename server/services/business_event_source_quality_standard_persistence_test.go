package services

import (
	"testing"
	"xdfc-server/db"
	"xdfc-server/models"

	"github.com/glebarez/sqlite"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

func createIsolatedQualityStandardEventSourceTestDatabase(t *testing.T) *gorm.DB {
	t.Helper()
	database, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{Logger: logger.Default.LogMode(logger.Silent)})
	require.NoError(t, err)
	connection, err := database.DB()
	require.NoError(t, err)
	connection.SetMaxOpenConns(1)
	t.Cleanup(func() { require.NoError(t, connection.Close()) })
	require.NoError(t, database.Exec(`CREATE TABLE business_event_sources (
		id TEXT PRIMARY KEY, created_at DATETIME, updated_at DATETIME, deleted_at DATETIME,
		code TEXT UNIQUE NOT NULL, name TEXT NOT NULL, module TEXT, entity TEXT,
		enabled BOOLEAN, description TEXT, config JSONB
	)`).Error)
	previousDatabase := db.DB
	db.DB = database
	t.Cleanup(func() { db.DB = previousDatabase })
	return database
}

func TestListBusinessEventSourcesPersistsQualityStandardWithUsableListenerConfiguration(t *testing.T) {
	database := createIsolatedQualityStandardEventSourceTestDatabase(t)
	for range 2 {
		sources, err := ListBusinessEventSources()
		require.NoError(t, err)
		responses, err := MapBusinessEventSourcesToResponse(sources)
		require.NoError(t, err)
		var qualitySource *BusinessEventSourceResponse
		for index := range responses {
			if responses[index].Code == "QUALITY_STANDARD" {
				require.Nil(t, qualitySource, "quality source must appear exactly once")
				qualitySource = &responses[index]
			}
		}
		require.NotNil(t, qualitySource, "listener source options come from this persisted list")
		require.True(t, qualitySource.Enabled)
		require.Equal(t, "品质标准", qualitySource.Name)
		require.Equal(t, "Quality", qualitySource.Module)
		require.Equal(t, "QUALITY", qualitySource.Entity)
		require.Len(t, qualitySource.Config.Actions, 2, "only actions emitted by quality workflows are exposed")
		require.Equal(t, "STATUS_CHANGED", qualitySource.Config.Actions[1].Code)
		require.Equal(t, "status", qualitySource.Config.Actions[1].Kind)
		statusCodes := make([]string, 0, len(qualitySource.Config.Statuses))
		for _, status := range qualitySource.Config.Statuses {
			statusCodes = append(statusCodes, status.Code)
			require.NotEmpty(t, status.ID)
			require.NotEqual(t, status.Code, status.Label, "employees need readable status labels")
		}
		require.Equal(t, []string{"DRAFT", "PENDING_APPROVAL", "APPROVED", "REJECTED", "PUBLISHED", "ARCHIVED"}, statusCodes)
		require.True(t, qualitySource.Config.Statuses[5].DefaultResolve)
		require.Equal(t, "/quality/standards/[StandardId]/preview", qualitySource.Config.DefaultActionURLTemplate)
		var standardLinkField *BusinessEventFieldDTO
		for index := range qualitySource.Config.Fields {
			if qualitySource.Config.Fields[index].TemplateKey == "StandardId" {
				standardLinkField = &qualitySource.Config.Fields[index]
			}
		}
		require.NotNil(t, standardLinkField, "notification links need the actual standard ID")
		require.Equal(t, "targetId", standardLinkField.Path)
		require.True(t, standardLinkField.TemplateEnabled)
	}
	var persistedSourceCount int64
	require.NoError(t, database.Model(&models.BusinessEventSource{}).Where("code = ?", "QUALITY_STANDARD").Count(&persistedSourceCount).Error)
	require.Equal(t, int64(1), persistedSourceCount)
}

func TestListBusinessEventSourcesPreservesDisabledQualitySourceAndUserConfiguration(t *testing.T) {
	database := createIsolatedQualityStandardEventSourceTestDatabase(t)
	_, err := ListBusinessEventSources()
	require.NoError(t, err)
	var qualitySource models.BusinessEventSource
	require.NoError(t, database.Where("code = ?", "QUALITY_STANDARD").First(&qualitySource).Error)
	config, err := unmarshalBusinessEventSourceStoredConfig(qualitySource.Config)
	require.NoError(t, err)
	config.DefaultActionURLTemplate = "/quality/standards/[StandardId]/edit"
	config.Fields[1].Label = "品质协议编号"
	customConfiguration, err := marshalBusinessEventSourceStoredConfig(config)
	require.NoError(t, err)
	require.NoError(t, database.Model(&qualitySource).Updates(map[string]any{
		"enabled": false, "name": "品质协议", "config": customConfiguration,
	}).Error)

	_, err = ListBusinessEventSources()
	require.NoError(t, err)
	require.NoError(t, database.First(&qualitySource, "id = ?", qualitySource.ID).Error)
	require.False(t, qualitySource.Enabled, "reading sources must not re-enable an administrator-disabled source")
	require.Equal(t, "品质协议", qualitySource.Name)
	require.JSONEq(t, string(customConfiguration), string(qualitySource.Config))
}
