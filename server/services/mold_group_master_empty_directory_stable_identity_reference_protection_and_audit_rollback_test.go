package services

import (
	"encoding/json"
	"testing"
	"xdfc-server/models"

	"github.com/google/uuid"
	"github.com/stretchr/testify/require"
)

func TestMoldGroupMasterPreservesEmptyGroupsAndReferencesAfterRename(t *testing.T) {
	database := openEquipmentAssetTestDB(t, true)
	ctx := equipmentAssetTestContext()
	group, err := SaveMoldGroupMaster(ctx, database, "", MoldGroupMasterWriteRequest{Name: "  R50 模具  ", Description: "主组"})
	require.NoError(t, err)
	require.Equal(t, "R50 模具", group.Name)
	directory, err := ReadMoldGroupMasterDirectory(database)
	require.NoError(t, err)
	require.Len(t, directory, 2)
	asset, err := NewEquipmentAssetService(database).SaveMold(ctx, SaveMoldRequest{SN: "M-01", Name: "第一副模具", GroupID: group.ID, GroupName: "应忽略的旧显示名"})
	require.NoError(t, err)
	require.Equal(t, group.ID, MoldGroupIDString(asset.GroupID))
	require.Equal(t, group.Name, asset.GroupName)
	productID := uuid.NewString()
	require.NoError(t, database.Exec("INSERT INTO products (id, mold_group_id, mold_group) VALUES (?, ?, ?)", productID, group.ID, group.Name).Error)
	renamed, err := SaveMoldGroupMaster(ctx, database, group.ID, MoldGroupMasterWriteRequest{Name: "R50 正式模具组", Active: true, Version: group.Version})
	require.NoError(t, err)
	require.Equal(t, group.ID, renamed.ID)
	require.Equal(t, 2, renamed.Version)
	var storedMold models.Mold
	require.NoError(t, database.First(&storedMold, "id = ?", asset.ID).Error)
	require.Equal(t, renamed.Name, storedMold.GroupName)
	require.Equal(t, group.ID, MoldGroupIDString(storedMold.GroupID))
	var storedProduct struct {
		MoldGroupID string
		MoldGroup   string
	}
	require.NoError(t, database.Table("products").Where("id = ?", productID).Scan(&storedProduct).Error)
	require.Equal(t, group.ID, storedProduct.MoldGroupID)
	require.Equal(t, renamed.Name, storedProduct.MoldGroup)
	directory, err = ReadMoldGroupMasterDirectory(database)
	require.NoError(t, err)
	for _, record := range directory {
		if record.ID == group.ID {
			require.EqualValues(t, 1, record.MoldCount)
			require.EqualValues(t, 1, record.ProductCount)
		}
	}
	_, err = SaveMoldGroupMaster(ctx, database, group.ID, MoldGroupMasterWriteRequest{Name: "过期修改", Active: true, Version: 1})
	require.ErrorContains(t, err, "已被其他人修改")
}

func TestMoldGroupMasterRejectsUnknownAndDisabledNewBindingsAndProtectsHistoricalReferences(t *testing.T) {
	database := openEquipmentAssetTestDB(t, true)
	ctx := equipmentAssetTestContext()
	group, err := SaveMoldGroupMaster(ctx, database, "", MoldGroupMasterWriteRequest{Name: "受控模具组"})
	require.NoError(t, err)
	service := NewEquipmentAssetService(database)
	asset, err := service.SaveMold(ctx, SaveMoldRequest{SN: "M-01", Name: "模具", GroupID: group.ID})
	require.NoError(t, err)
	_, err = service.SaveMold(ctx, SaveMoldRequest{SN: "M-BAD", Name: "未知分组", GroupName: "手填不存在的组"})
	require.ErrorContains(t, err, "分组不存在")
	_, err = service.PatchMold(ctx, asset.ID, map[string]json.RawMessage{"groupId": json.RawMessage(`{"o":"` + group.ID + `","n":"` + uuid.NewString() + `"}`)})
	require.ErrorContains(t, err, "分组不存在")
	_, err = SaveMoldGroupMaster(ctx, database, "", MoldGroupMasterWriteRequest{Name: " 受控模具组 "})
	require.ErrorContains(t, err, "名称已存在")
	disabled, err := SaveMoldGroupMaster(ctx, database, group.ID, MoldGroupMasterWriteRequest{Name: group.Name, Active: false, Version: group.Version})
	require.NoError(t, err)
	require.False(t, disabled.Active)
	_, err = service.SaveMold(ctx, SaveMoldRequest{ID: asset.ID, SN: asset.SN, Name: "修改原模具", GroupID: group.ID})
	require.NoError(t, err)
	_, err = service.SaveMold(ctx, SaveMoldRequest{SN: "M-NEW", Name: "新增模具", GroupID: group.ID})
	require.ErrorContains(t, err, "已停用")
	require.ErrorContains(t, DeleteUnreferencedMoldGroupMaster(ctx, database, group.ID, disabled.Version), "仍被模具或产品引用")
	require.NoError(t, database.Delete(&asset).Error)
	require.ErrorContains(t, DeleteUnreferencedMoldGroupMaster(ctx, database, group.ID, disabled.Version), "含历史记录")
	emptyGroup, err := SaveMoldGroupMaster(ctx, database, "", MoldGroupMasterWriteRequest{Name: "可以删除的空分组"})
	require.NoError(t, err)
	require.NoError(t, DeleteUnreferencedMoldGroupMaster(ctx, database, emptyGroup.ID, emptyGroup.Version))
	_, err = SaveMoldGroupMaster(ctx, database, "", MoldGroupMasterWriteRequest{Name: emptyGroup.Name})
	require.ErrorContains(t, err, "名称已存在")
}

func TestMoldGroupMasterRenameAndReferenceMirrorsRollbackWhenAuditFails(t *testing.T) {
	database := openEquipmentAssetTestDB(t, false)
	ctx := equipmentAssetTestContext()
	groupID := "fd89b004-bcef-4c1a-ab91-f9c735586208"
	require.NoError(t, database.Exec("INSERT INTO molds (id, group_id, group_name) VALUES (?, ?, ?)", "audit-rollback-mold", groupID, "Group A").Error)
	require.NoError(t, database.Exec("INSERT INTO products (id, mold_group_id, mold_group) VALUES (?, ?, ?)", "audit-rollback-product", groupID, "Group A").Error)
	_, err := SaveMoldGroupMaster(ctx, database, groupID, MoldGroupMasterWriteRequest{Name: "不应保存的改名", Active: true, Version: 1})
	require.Error(t, err)
	var group models.MoldGroup
	require.NoError(t, database.First(&group, "id = ?", groupID).Error)
	require.Equal(t, "Group A", group.Name)
	require.Equal(t, 1, group.Version)
	for _, mirror := range []struct{ table, nameColumn string }{{"molds", "group_name"}, {"products", "mold_group"}} {
		var name string
		require.NoError(t, database.Table(mirror.table).Select(mirror.nameColumn).Limit(1).Scan(&name).Error)
		require.Equal(t, "Group A", name)
	}
}
