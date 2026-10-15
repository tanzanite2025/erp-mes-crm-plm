package services

import (
	"testing"

	"github.com/google/uuid"
	"github.com/stretchr/testify/require"
	"xdfc-server/models"
)

func TestPieceworkPayItemCreationGeneratesDistinctPersistentCodesWithoutUserInput(t *testing.T) {
	_, database := newPieceworkRateTestService(t)
	service := NewPieceworkPayItemService(pieceworkRateTestTxManager{db: database})
	generatedCodes := make(map[string]bool)

	for _, omittedOrBlankCode := range []string{"", " ", "\t"} {
		item, err := service.SavePieceworkPayItem(pieceworkRateTestContext(), PieceworkPayItemCommand{
			Code: omittedOrBlankCode, Name: "包装", Unit: "件",
		})
		require.NoError(t, err)
		_, err = uuid.Parse(item.ID)
		require.NoError(t, err)
		require.NotEmpty(t, item.Code)
		require.LessOrEqual(t, len(item.Code), 100)
		require.False(t, generatedCodes[item.Code], "automatically generated codes must be unique")
		generatedCodes[item.Code] = true
		require.Equal(t, "active", item.Status)
		require.Equal(t, int64(1), item.Version)

		var persisted models.PieceworkPayItem
		require.NoError(t, database.First(&persisted, "id = ?", item.ID).Error)
		require.Equal(t, item.Code, persisted.Code)
		var auditEntries int64
		require.NoError(t, database.Table("audit_logs").Where("target_id = ?", item.ID).Count(&auditEntries).Error)
		require.Equal(t, int64(1), auditEntries)
	}
}

func TestPieceworkPayItemCodeFreeEditPreservesLegacyCodeAndExistingRateReferences(t *testing.T) {
	rates, database := newPieceworkRateTestService(t)
	service := NewPieceworkPayItemService(pieceworkRateTestTxManager{db: database})
	rate, err := rates.CreatePieceworkRate(pieceworkRateTestContext(), pieceworkTestRateCommand())
	require.NoError(t, err)

	saved, err := service.SavePieceworkPayItem(pieceworkRateTestContext(), PieceworkPayItemCommand{
		ID: pieceworkTestPayItemID, Version: 1, Name: "包装（更新）", Unit: "PCS", Remarks: "无需提供内部编码",
	})
	require.NoError(t, err)
	require.Equal(t, "PAY-001", saved.Code)
	require.Equal(t, int64(2), saved.Version)

	var persistedRate models.PieceworkRate
	require.NoError(t, database.First(&persistedRate, "id = ?", rate.ID).Error)
	require.Equal(t, saved.ID, persistedRate.PayItemID)
	require.Equal(t, saved.Code, persistedRate.PayItemCode)

	_, err = service.SavePieceworkPayItem(pieceworkRateTestContext(), PieceworkPayItemCommand{
		ID: saved.ID, Version: 1, Name: "过期编辑", Unit: saved.Unit,
	})
	require.ErrorIs(t, err, ErrPieceworkRateVersionConflict)

	var persistedItem models.PieceworkPayItem
	require.NoError(t, database.First(&persistedItem, "id = ?", saved.ID).Error)
	require.Equal(t, saved.Code, persistedItem.Code)
	require.Equal(t, saved.Name, persistedItem.Name)
	require.Equal(t, saved.Version, persistedItem.Version)
}

func TestPieceworkPayItemGeneratedCodeRemainsStableAcrossCodeFreeEdits(t *testing.T) {
	_, database := newPieceworkRateTestService(t)
	service := NewPieceworkPayItemService(pieceworkRateTestTxManager{db: database})
	created, err := service.SavePieceworkPayItem(pieceworkRateTestContext(), PieceworkPayItemCommand{
		Name: "包装", Unit: "件",
	})
	require.NoError(t, err)

	updated, err := service.SavePieceworkPayItem(pieceworkRateTestContext(), PieceworkPayItemCommand{
		ID: created.ID, Version: created.Version, Name: "装箱", Unit: "箱", Status: "inactive",
	})
	require.NoError(t, err)
	require.Equal(t, created.Code, updated.Code)
	require.Equal(t, created.ID, updated.ID)
	require.Equal(t, "装箱", updated.Name)
	require.Equal(t, created.Version+1, updated.Version)
}
