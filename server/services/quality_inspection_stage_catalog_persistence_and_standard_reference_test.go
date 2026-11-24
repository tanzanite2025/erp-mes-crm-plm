package services

import (
	"context"
	"testing"
	"xdfc-server/db"
	"xdfc-server/models"

	"github.com/glebarez/sqlite"
	"github.com/google/uuid"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

func createQualityInspectionStageCatalogTestDatabase(t *testing.T) *gorm.DB {
	t.Helper()
	database, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{Logger: logger.Default.LogMode(logger.Silent)})
	require.NoError(t, err)
	connection, err := database.DB()
	require.NoError(t, err)
	connection.SetMaxOpenConns(1)
	t.Cleanup(func() { require.NoError(t, connection.Close()) })
	for _, statement := range []string{
		`CREATE TABLE quality_inspection_stages (id TEXT PRIMARY KEY, code TEXT UNIQUE NOT NULL, name TEXT NOT NULL, normalized_name TEXT UNIQUE NOT NULL, description TEXT, sort_order INTEGER, active BOOLEAN NOT NULL, version INTEGER NOT NULL DEFAULT 1, created_at DATETIME, updated_at DATETIME, deleted_at DATETIME)`,
		`CREATE TABLE inspection_standards (id TEXT PRIMARY KEY, items BLOB, deleted_at DATETIME)`,
		`CREATE TABLE audit_logs (id TEXT PRIMARY KEY, module TEXT, target_id TEXT, action TEXT, diff BLOB, operator TEXT, ip TEXT, created_at DATETIME)`,
	} {
		require.NoError(t, database.Exec(statement).Error)
	}
	previousDatabase := db.DB
	db.DB = database
	t.Cleanup(func() { db.DB = previousDatabase })
	return database
}

func TestQualityInspectionStageCatalogPersistsNamesOrderingActivationAndOptimisticVersions(t *testing.T) {
	database := createQualityInspectionStageCatalogTestDatabase(t)
	active := true
	stage, err := SaveQualityInspectionStage(context.Background(), "", SaveQualityInspectionStageRequest{Name: " 成型检验站 ", SortOrder: 10, Active: &active})
	require.NoError(t, err)
	require.Equal(t, "成型检验站", stage.Name)
	require.EqualValues(t, 1, stage.Version)
	_, err = SaveQualityInspectionStage(context.Background(), "", SaveQualityInspectionStageRequest{Name: "成型检验站", SortOrder: 20, Active: &active})
	require.ErrorContains(t, err, "[CONFLICT]")
	inactive := false
	renamed, err := SaveQualityInspectionStage(context.Background(), stage.ID, SaveQualityInspectionStageRequest{Name: "成型复检站", Description: "铺层前确认", SortOrder: 90, Active: &inactive, Version: stage.Version})
	require.NoError(t, err)
	require.Equal(t, stage.Code, renamed.Code)
	require.EqualValues(t, 2, renamed.Version)
	stages, err := ListQualityInspectionStages()
	require.NoError(t, err)
	require.Len(t, stages, 1)
	require.Equal(t, "成型复检站", stages[0].Name)
	require.Equal(t, 90, stages[0].SortOrder)
	require.False(t, stages[0].Active)
	_, err = SaveQualityInspectionStage(context.Background(), stage.ID, SaveQualityInspectionStageRequest{Name: "旧页面覆盖", SortOrder: 10, Active: &active, Version: 1})
	require.ErrorContains(t, err, "[CONFLICT]")
	require.NoError(t, database.First(&renamed, "id = ?", stage.ID).Error)
	require.Equal(t, "成型复检站", renamed.Name)
	var auditCount int64
	require.NoError(t, database.Model(&models.AuditLog{}).Count(&auditCount).Error)
	require.EqualValues(t, 2, auditCount)
	require.NoError(t, database.Exec("DROP TABLE audit_logs").Error)
	_, err = SaveQualityInspectionStage(context.Background(), stage.ID, SaveQualityInspectionStageRequest{Name: "审计失败回滚", SortOrder: 1, Active: &active, Version: 2})
	require.Error(t, err)
	require.NoError(t, database.First(&renamed, "id = ?", stage.ID).Error)
	require.Equal(t, "成型复检站", renamed.Name)
}

func TestQualityInspectionStationDefaultCatalogSeedsFourStationsAndPreservesConfiguredStationsAcrossInitialization(t *testing.T) {
	database := createQualityInspectionStageCatalogTestDatabase(t)
	require.NoError(t, db.EnsureDefaultQualityInspectionStages(database))
	stages, err := ListQualityInspectionStages()
	require.NoError(t, err)
	require.Len(t, stages, 4)
	for index, name := range []string{"成型检验站", "机加检验站", "精细检验站", "涂装检验站"} {
		require.Equal(t, name, stages[index].Name)
		require.Equal(t, (index+1)*10, stages[index].SortOrder)
		require.True(t, stages[index].Active)
	}
	var initial models.QualityInspectionStage
	require.NoError(t, database.First(&initial, "code = ?", "QUALITY_FORMING_INSPECTION_STATION").Error)
	require.NoError(t, database.Model(&initial).Updates(map[string]any{"name": "自定义成型检验站", "normalized_name": "自定义成型检验站", "active": false, "sort_order": 888}).Error)
	active := true
	customStation, err := SaveQualityInspectionStage(context.Background(), "", SaveQualityInspectionStageRequest{Name: "包装检验站", SortOrder: 50, Active: &active})
	require.NoError(t, err)
	require.NoError(t, db.EnsureDefaultQualityInspectionStages(database))
	stages, err = ListQualityInspectionStages()
	require.NoError(t, err)
	require.Len(t, stages, 5)
	require.Equal(t, customStation.ID, stages[3].ID)
	require.Equal(t, initial.ID, stages[4].ID)
	require.Equal(t, initial.Code, stages[4].Code)
	require.Equal(t, "自定义成型检验站", stages[4].Name)
	require.Equal(t, 888, stages[4].SortOrder)
	require.False(t, stages[4].Active)
}

func TestQualityInspectionStageReferencesRequireActiveStageAndCurrentNameForEveryItem(t *testing.T) {
	database := createQualityInspectionStageCatalogTestDatabase(t)
	active := true
	stage, err := SaveQualityInspectionStage(context.Background(), "", SaveQualityInspectionStageRequest{Name: "成型检验站", SortOrder: 10, Active: &active})
	require.NoError(t, err)
	criterion := qualityStandardInspectionCriterion{ID: uuid.NewString(), Name: "重量", InspectionStageID: stage.ID, InspectionStageName: stage.Name}
	require.NoError(t, validateQualityStandardInspectionStageReferencesWithinTransaction(database, []qualityStandardInspectionCriterion{criterion}))
	for _, invalid := range []struct {
		name  string
		items []qualityStandardInspectionCriterion
	}{
		{"missing stage", []qualityStandardInspectionCriterion{{ID: uuid.NewString(), Name: "重量"}}},
		{"missing item identity", []qualityStandardInspectionCriterion{{InspectionStageID: stage.ID, InspectionStageName: stage.Name}}},
		{"duplicate identities", []qualityStandardInspectionCriterion{criterion, criterion}},
		{"stage name without identity", []qualityStandardInspectionCriterion{{ID: uuid.NewString(), InspectionStageName: stage.Name}}},
		{"malformed stage identity", []qualityStandardInspectionCriterion{{ID: uuid.NewString(), InspectionStageID: "invalid-stage", InspectionStageName: stage.Name}}},
		{"unknown stage", []qualityStandardInspectionCriterion{{ID: uuid.NewString(), InspectionStageID: uuid.NewString(), InspectionStageName: stage.Name}}},
	} {
		t.Run(invalid.name, func(t *testing.T) {
			require.ErrorContains(t, validateQualityStandardInspectionStageReferencesWithinTransaction(database, invalid.items), "[VALIDATION]")
		})
	}
	require.NoError(t, database.Model(&stage).Updates(map[string]any{"name": "成型复检站", "normalized_name": "成型复检站"}).Error)
	require.ErrorContains(t, validateQualityStandardInspectionStageReferencesWithinTransaction(database, []qualityStandardInspectionCriterion{criterion}), "名称已变化")
	criterion.InspectionStageName = "成型复检站"
	require.NoError(t, validateQualityStandardInspectionStageReferencesWithinTransaction(database, []qualityStandardInspectionCriterion{criterion}))
	require.NoError(t, database.Model(&stage).Update("active", false).Error)
	require.ErrorContains(t, validateQualityStandardInspectionStageReferencesWithinTransaction(database, []qualityStandardInspectionCriterion{criterion}), "已停用")
}
