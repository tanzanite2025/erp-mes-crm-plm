package services

import (
	"context"
	"sync"
	"testing"
	"xdfc-server/db"
	"xdfc-server/models"

	"github.com/google/uuid"
	"github.com/stretchr/testify/require"
)

func TestQualityDefectConfigurationPostgresSharedCatalogBindingsVersionsAndActivation(t *testing.T) {
	fixture := createIsolatedQualityStandardWorkflowPostgresFixture(t)
	require.NoError(t, fixture.database.AutoMigrate(&models.QualityDefectType{}, &models.QualityInspectionStageDefectTypeBinding{}))
	require.NoError(t, db.EnsureDefaultQualityInspectionStages(fixture.database))
	active, inactive := true, false
	defect, err := SaveQualityDefectType(fixture.requestContext, "", SaveQualityDefectTypeRequest{Name: " 针孔 ", Description: "表面检查", SortOrder: 10, Active: &active})
	require.NoError(t, err)
	require.Equal(t, "针孔", defect.Name)
	_, err = SaveQualityDefectType(fixture.requestContext, "", SaveQualityDefectTypeRequest{Name: "针孔", Active: &active})
	require.ErrorContains(t, err, "[CONFLICT]")
	renamed, err := SaveQualityDefectType(fixture.requestContext, defect.ID, SaveQualityDefectTypeRequest{Name: "表面针孔", Active: &active, Version: defect.Version})
	require.NoError(t, err)
	require.Equal(t, defect.Code, renamed.Code)
	require.Equal(t, defect.ID, renamed.ID)
	_, err = SaveQualityDefectType(fixture.requestContext, defect.ID, SaveQualityDefectTypeRequest{Name: "过期修改", Active: &active, Version: defect.Version})
	require.ErrorContains(t, err, "[CONFLICT]")
	var firstStation, secondStation models.QualityInspectionStage
	require.NoError(t, fixture.database.First(&firstStation, "code = ?", "QUALITY_FORMING_INSPECTION_STATION").Error)
	require.NoError(t, fixture.database.First(&secondStation, "code = ?", "QUALITY_PAINTING_INSPECTION_STATION").Error)
	ids := []string{defect.ID}
	first, err := ReplaceQualityInspectionStageDefectTypeBindings(fixture.requestContext, firstStation.ID, ReplaceQualityInspectionStageDefectTypeBindingsRequest{DefectTypeIDs: &ids, Version: firstStation.Version})
	require.NoError(t, err)
	second, err := ReplaceQualityInspectionStageDefectTypeBindings(fixture.requestContext, secondStation.ID, ReplaceQualityInspectionStageDefectTypeBindingsRequest{DefectTypeIDs: &ids, Version: secondStation.Version})
	require.NoError(t, err)
	_, err = SaveQualityInspectionStage(fixture.requestContext, firstStation.ID, SaveQualityInspectionStageRequest{Name: "旧目录覆盖", Active: &active, Version: firstStation.Version})
	require.ErrorContains(t, err, "[CONFLICT]")
	empty := []string{}
	_, err = ReplaceQualityInspectionStageDefectTypeBindings(fixture.requestContext, firstStation.ID, ReplaceQualityInspectionStageDefectTypeBindingsRequest{DefectTypeIDs: &empty, Version: first.Version})
	require.NoError(t, err)
	stillBound, err := GetQualityInspectionStageDefectTypeBindings(secondStation.ID)
	require.NoError(t, err)
	require.Equal(t, ids, stillBound.DefectTypeIDs)
	_, err = SaveQualityDefectType(fixture.requestContext, defect.ID, SaveQualityDefectTypeRequest{Name: renamed.Name, Active: &inactive, Version: renamed.Version})
	require.NoError(t, err)
	_, err = ReplaceQualityInspectionStageDefectTypeBindings(fixture.requestContext, secondStation.ID, ReplaceQualityInspectionStageDefectTypeBindingsRequest{DefectTypeIDs: &ids, Version: second.Version})
	require.NoError(t, err, "existing inactive binding can be retained")
	first, err = GetQualityInspectionStageDefectTypeBindings(firstStation.ID)
	require.NoError(t, err)
	_, err = ReplaceQualityInspectionStageDefectTypeBindings(fixture.requestContext, firstStation.ID, ReplaceQualityInspectionStageDefectTypeBindingsRequest{DefectTypeIDs: &ids, Version: first.Version})
	require.ErrorContains(t, err, "停用")
	_, err = ReplaceQualityInspectionStageDefectTypeBindings(fixture.requestContext, secondStation.ID, ReplaceQualityInspectionStageDefectTypeBindingsRequest{DefectTypeIDs: &empty, Version: second.Version})
	require.NoError(t, err, "inactive binding can be removed")
	_, err = SaveQualityInspectionStage(fixture.requestContext, firstStation.ID, SaveQualityInspectionStageRequest{Name: firstStation.Name, Active: &inactive, Version: first.Version})
	require.NoError(t, err)
	first, err = GetQualityInspectionStageDefectTypeBindings(firstStation.ID)
	require.NoError(t, err)
	_, err = ReplaceQualityInspectionStageDefectTypeBindings(fixture.requestContext, firstStation.ID, ReplaceQualityInspectionStageDefectTypeBindingsRequest{DefectTypeIDs: &empty, Version: first.Version})
	require.ErrorContains(t, err, "检验站已停用")
	catalog, err := ListQualityDefectTypes()
	require.NoError(t, err)
	require.Len(t, catalog, 1)
	require.False(t, catalog[0].Active)
	require.Error(t, fixture.database.Create(&models.QualityInspectionStageDefectTypeBinding{InspectionStageID: secondStation.ID, DefectTypeID: uuid.NewString()}).Error, "database rejects dangling references")
}

func TestQualityDefectConfigurationPostgresConcurrentBindingEditsAndAuditRollback(t *testing.T) {
	fixture := createIsolatedQualityStandardWorkflowPostgresFixture(t)
	require.NoError(t, fixture.database.AutoMigrate(&models.QualityDefectType{}, &models.QualityInspectionStageDefectTypeBinding{}))
	active := true
	station, err := SaveQualityInspectionStage(fixture.requestContext, "", SaveQualityInspectionStageRequest{Name: "成型检验站", Active: &active})
	require.NoError(t, err)
	var alternatives [][]string
	for _, name := range []string{"针孔", "划伤"} {
		defect, err := SaveQualityDefectType(fixture.requestContext, "", SaveQualityDefectTypeRequest{Name: name, Active: &active})
		require.NoError(t, err)
		alternatives = append(alternatives, []string{defect.ID})
	}
	start := make(chan struct{})
	results := make(chan error, 2)
	var workers sync.WaitGroup
	for _, ids := range alternatives {
		workers.Add(1)
		go func(ids []string) {
			defer workers.Done()
			<-start
			_, err := ReplaceQualityInspectionStageDefectTypeBindings(fixture.requestContext, station.ID, ReplaceQualityInspectionStageDefectTypeBindingsRequest{DefectTypeIDs: &ids, Version: station.Version})
			results <- err
		}(ids)
	}
	close(start)
	workers.Wait()
	close(results)
	winners := 0
	for err := range results {
		if err == nil {
			winners++
		} else {
			require.ErrorContains(t, err, "[CONFLICT]")
		}
	}
	require.Equal(t, 1, winners)
	bindings, err := GetQualityInspectionStageDefectTypeBindings(station.ID)
	require.NoError(t, err)
	require.Len(t, bindings.DefectTypeIDs, 1)
	var auditCountBefore, auditCountAfter int64
	require.NoError(t, fixture.database.Model(&models.AuditLog{}).Count(&auditCountBefore).Error)
	unchanged, err := ReplaceQualityInspectionStageDefectTypeBindings(fixture.requestContext, station.ID, ReplaceQualityInspectionStageDefectTypeBindingsRequest{DefectTypeIDs: &bindings.DefectTypeIDs, Version: bindings.Version})
	require.NoError(t, err)
	require.Equal(t, bindings.Version, unchanged.Version)
	require.NoError(t, fixture.database.Model(&models.AuditLog{}).Count(&auditCountAfter).Error)
	require.Equal(t, auditCountBefore, auditCountAfter)
	for _, invalidIDs := range [][]string{{uuid.NewString()}, {bindings.DefectTypeIDs[0], bindings.DefectTypeIDs[0]}, {"invalid-id"}} {
		_, err := ReplaceQualityInspectionStageDefectTypeBindings(fixture.requestContext, station.ID, ReplaceQualityInspectionStageDefectTypeBindingsRequest{DefectTypeIDs: &invalidIDs, Version: bindings.Version})
		require.ErrorContains(t, err, "[VALIDATION]")
	}
	_, err = ReplaceQualityInspectionStageDefectTypeBindings(fixture.requestContext, station.ID, ReplaceQualityInspectionStageDefectTypeBindingsRequest{Version: bindings.Version})
	require.ErrorContains(t, err, "[VALIDATION]")
	require.NoError(t, fixture.database.Exec("DROP TABLE audit_logs").Error)
	empty := []string{}
	_, err = ReplaceQualityInspectionStageDefectTypeBindings(context.Background(), station.ID, ReplaceQualityInspectionStageDefectTypeBindingsRequest{DefectTypeIDs: &empty, Version: bindings.Version})
	require.Error(t, err)
	afterFailure, err := GetQualityInspectionStageDefectTypeBindings(station.ID)
	require.NoError(t, err)
	require.Equal(t, bindings, afterFailure, "audit failure rolls back both bindings and station version")
	_, err = SaveQualityDefectType(context.Background(), "", SaveQualityDefectTypeRequest{Name: "审计失败不得保留", Active: &active})
	require.Error(t, err)
	var remainingCount int64
	require.NoError(t, fixture.database.Model(&models.QualityDefectType{}).Where("name = ?", "审计失败不得保留").Count(&remainingCount).Error)
	require.Zero(t, remainingCount)
}
