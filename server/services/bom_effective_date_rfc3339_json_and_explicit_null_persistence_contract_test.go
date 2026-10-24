package services

import (
	"encoding/json"
	"testing"
	"time"
	"xdfc-server/models"

	"github.com/stretchr/testify/require"
)

func TestBOMEffectiveDateJSONRequiresRFC3339AndDistinguishesExplicitNullFromOmission(t *testing.T) {
	for _, invalidDate := range []string{"2020-01-15", "20200115", "", "2023-02-29T00:00:00Z", "2020-04-31T00:00:00Z", "2020-01-15-extra"} {
		t.Run(invalidDate, func(t *testing.T) {
			var input SaveBOMInput
			payload, err := json.Marshal(map[string]any{"masterDataControl": map[string]any{"effectiveFrom": invalidDate}})
			require.NoError(t, err)
			require.Error(t, json.Unmarshal(payload, &input))
		})
	}
	var input SaveBOMInput
	require.NoError(t, json.Unmarshal([]byte(`{"masterDataControl":{"effectiveFrom":"2020-02-29T00:00:00Z"}}`), &input))
	require.True(t, input.MasterDataControl.effectiveFromProvided)
	require.False(t, input.MasterDataControl.effectiveToProvided)
	require.Equal(t, "2020-02-29", input.toModel().EffectiveFrom.Format("2006-01-02"))
	require.NoError(t, json.Unmarshal([]byte(`{"masterDataControl":{"effectiveFrom":null}}`), &input))
	require.True(t, input.MasterDataControl.effectiveFromProvided)
	require.Nil(t, input.MasterDataControl.EffectiveFrom)
	require.NoError(t, json.Unmarshal([]byte(`{"masterDataControl":{}}`), &input))
	require.False(t, input.MasterDataControl.effectiveFromProvided)
}

func TestBOMEffectiveDatesPersistUpdateAndClearWithoutChangingOmittedDatesOrControlMetadata(t *testing.T) {
	database, ctx, source := createIsolatedBOMReleaseAndManufacturingDerivationPostgresFixture(t)
	require.NoError(t, database.AutoMigrate(&models.BOMSection{}))
	require.NoError(t, database.Create(&models.BOMSection{Code: "PREPARE", Name: "Preparation", Active: true, IsDefault: true}).Error)
	decodeBOMEffectiveDatePersistenceSaveRequest := func(controlDates map[string]any, id string, version int) SaveBOMInput {
		t.Helper()
		controlDates["revisionNo"] = "R8"
		controlDates["changeType"] = "ECN"
		controlDates["changeOrderNo"] = "ECN-8"
		payload, err := json.Marshal(map[string]any{
			"id": id, "productId": source.ProductID, "bomNo": "BOM-EFFECTIVE-DATE", "bomVersion": "V1.0", "version": version,
			"masterDataControl": controlDates,
			"relationSidecar":   map[string]any{"kind": "parent_children_protocol", "version": "v1", "protocolDraft": map[string]any{"rootChildren": []string{}, "branchNodes": []any{}, "itemNodes": []any{}}},
		})
		require.NoError(t, err)
		var input SaveBOMInput
		require.NoError(t, json.Unmarshal(payload, &input))
		return input
	}
	created, err := SaveBOM(ctx, decodeBOMEffectiveDatePersistenceSaveRequest(map[string]any{
		"effectiveFrom": "1998-01-15T00:00:00Z", "effectiveTo": "2030-12-31T00:00:00Z", "revisionNo": "R8", "changeType": "ECN", "changeOrderNo": "ECN-8",
	}, "", 0))
	require.NoError(t, err)
	require.Equal(t, "1998-01-15", created.MasterDataControl.EffectiveFrom.(*time.Time).Format("2006-01-02"))
	updated, err := SaveBOM(ctx, decodeBOMEffectiveDatePersistenceSaveRequest(map[string]any{"effectiveFrom": "2020-02-29T00:00:00Z"}, created.ID, created.Version))
	require.NoError(t, err)
	require.Equal(t, "2020-02-29", updated.MasterDataControl.EffectiveFrom.(*time.Time).Format("2006-01-02"))
	require.Equal(t, "2030-12-31", updated.MasterDataControl.EffectiveTo.(*time.Time).Format("2006-01-02"))
	cleared, err := SaveBOM(ctx, decodeBOMEffectiveDatePersistenceSaveRequest(map[string]any{"effectiveFrom": nil}, updated.ID, updated.Version))
	require.NoError(t, err)
	require.Nil(t, cleared.MasterDataControl.EffectiveFrom)
	require.NotNil(t, cleared.MasterDataControl.EffectiveTo)
	require.Equal(t, "R8", cleared.MasterDataControl.RevisionNo)
	require.Equal(t, "ECN-8", cleared.MasterDataControl.ChangeOrderNo)
	var persisted models.BOM
	require.NoError(t, database.First(&persisted, "id = ?", cleared.ID).Error)
	require.Nil(t, persisted.EffectiveFrom)
	require.Equal(t, "2030-12-31", persisted.EffectiveTo.Format("2006-01-02"))
	var latestSnapshot models.BOMVersionSnapshot
	require.NoError(t, database.Where("bom_id = ?", cleared.ID).Order("version_sequence DESC").First(&latestSnapshot).Error)
	require.Nil(t, latestSnapshot.EffectiveFrom)
	require.NotNil(t, latestSnapshot.EffectiveTo)
	_, err = SaveBOM(ctx, decodeBOMEffectiveDatePersistenceSaveRequest(map[string]any{"effectiveTo": nil}, cleared.ID, updated.Version))
	require.ErrorContains(t, err, "CONFLICT")
	_, err = SaveBOM(ctx, decodeBOMEffectiveDatePersistenceSaveRequest(map[string]any{"effectiveFrom": nil}, source.ID, source.Version))
	require.ErrorContains(t, err, "locked BOM")
}
