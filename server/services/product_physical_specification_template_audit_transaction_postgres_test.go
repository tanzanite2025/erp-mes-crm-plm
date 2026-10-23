package services

import (
	"context"
	"encoding/json"
	"testing"
	"xdfc-server/models"

	"github.com/stretchr/testify/require"
)

func TestProductPhysicalSpecificationTemplateAuditFailureRollsBackEveryWrite(t *testing.T) {
	database := createTemplateOwnedAttributeServiceTestDatabase(t)
	template := createTemplateWithIndependentBrakeOptionsForTest(t, "audit-rollback", "碟刹", "disc")
	require.NoError(t, database.Migrator().DropTable(&models.AuditLog{}))
	template.Name = "不能落库的名称"
	template.AttributeBindings[0].Options[0].LabelZh = "不能落库的选项"
	_, err := SaveProductTemplate(context.Background(), SaveProductTemplateInput(template))
	require.Error(t, err)
	var retained models.ProductTemplate
	require.NoError(t, database.Preload("AttributeBindings").First(&retained, "id = ?", template.ID).Error)
	require.Equal(t, "audit-rollback", retained.Name)
	require.Equal(t, template.Version, retained.Version)
	require.Equal(t, "碟刹", retained.AttributeBindings[0].Options[0].LabelZh)

	_, err = PatchProductTemplate(context.Background(), template.ID, template.Version, map[string]interface{}{"name": "不能落库的补丁"})
	require.Error(t, err)
	var retainedAfterPatch models.ProductTemplate
	require.NoError(t, database.First(&retainedAfterPatch, "id = ?", template.ID).Error)
	require.Equal(t, "audit-rollback", retainedAfterPatch.Name)
	require.Equal(t, template.Version, retainedAfterPatch.Version)

	require.Error(t, DeleteProductTemplate(context.Background(), template.ID))
	var bindingCount int64
	require.NoError(t, database.Model(&models.ProductTemplateAttributeBinding{}).Where("template_id = ?", template.ID).Count(&bindingCount).Error)
	require.EqualValues(t, 1, bindingCount)
	require.NoError(t, database.First(&retained, "id = ?", template.ID).Error)
	_, err = SaveProductTemplate(context.Background(), SaveProductTemplateInput(models.ProductTemplate{Name: "失败的新模板", Code: "audit-failed-create", Active: true}))
	require.Error(t, err)
	var failedCreateCount int64
	require.NoError(t, database.Model(&models.ProductTemplate{}).Where("code = ?", "audit-failed-create").Count(&failedCreateCount).Error)
	require.Zero(t, failedCreateCount)
}

func TestProductPhysicalSpecificationTemplateBulkFailureRollsBackAuditAndDefinitions(t *testing.T) {
	database := createTemplateOwnedAttributeServiceTestDatabase(t)
	err := SyncProductTemplates(context.Background(), []BulkSyncProductTemplateInput{
		BulkSyncProductTemplateInput(models.ProductTemplate{Name: "先保存的模板", Code: "audit-sync-first", Active: true}),
		BulkSyncProductTemplateInput(models.ProductTemplate{Name: "验证失败的模板", Code: "audit-sync-invalid", Active: true,
			AttributeBindings: []models.ProductTemplateAttributeBinding{{CategoryKey: "color"}},
		}),
	})
	require.Error(t, err)
	var templateCount, auditCount int64
	require.NoError(t, database.Model(&models.ProductTemplate{}).Count(&templateCount).Error)
	require.NoError(t, database.Model(&models.AuditLog{}).Count(&auditCount).Error)
	require.Zero(t, templateCount)
	require.Zero(t, auditCount)
}

func TestProductPhysicalSpecificationTemplateAuditIgnoresRecreatedBindingRowIDs(t *testing.T) {
	database := createTemplateOwnedAttributeServiceTestDatabase(t)
	template := createTemplateWithIndependentBrakeOptionsForTest(t, "audit-stable", "碟刹", "disc")
	originalBindingID := template.AttributeBindings[0].ID
	saved, err := SaveProductTemplate(context.Background(), SaveProductTemplateInput(template))
	require.NoError(t, err)
	require.NotEqual(t, originalBindingID, saved.AttributeBindings[0].ID)
	var update models.AuditLog
	require.NoError(t, database.Where("module = ? AND target_id = ? AND action = ?", AuditModuleProductTemplate, saved.ID, "Update").First(&update).Error)
	var changes []struct {
		Field string `json:"f"`
	}
	require.NoError(t, json.Unmarshal(update.Diff, &changes))
	for _, change := range changes {
		require.NotEqual(t, "attributeBindings", change.Field, "unchanged business definitions must not appear modified just because row IDs were recreated")
	}
}
