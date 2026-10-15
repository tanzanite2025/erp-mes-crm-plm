package services

import (
	"encoding/json"
	"github.com/stretchr/testify/require"
	"os"
	"testing"
	"xdfc-server/models"
)

func TestPieceworkRateIdentityEditsDecodeAndPersistSharedFrontendPatchContractCases(t *testing.T) {
	bytes, err := os.ReadFile("testdata/piecework_rate_identity_edit_patch_frontend_backend_contract_cases.json")
	require.NoError(t, err)
	var fixture struct {
		InitialRate PieceworkRateDTO `json:"initialRate"`
		Cases       []struct {
			Name              string                   `json:"name"`
			ExpectedPayload   SDRTSDeltaHandlerRequest `json:"expectedPayload"`
			ExpectedPayItemID string                   `json:"expectedPayItemId"`
		} `json:"cases"`
	}
	require.NoError(t, json.Unmarshal(bytes, &fixture))
	for _, testCase := range fixture.Cases {
		t.Run(testCase.Name, func(t *testing.T) {
			service, database := newPieceworkRateTestService(t)
			require.NoError(t, database.Create(&models.PieceworkPayItem{BaseModel: models.BaseModel{ID: "66666666-6666-4666-8666-666666666666"}, Code: "PAY-002", Name: "Another payroll item", Unit: "PCS", Status: "active", Version: 1}).Error)
			initial := fixture.InitialRate
			require.NoError(t, database.Create(&models.PieceworkRate{BaseModel: models.BaseModel{ID: initial.ID}, PayItemID: initial.PayItemID, PayItemCode: initial.PayItemCode, PayItemName: initial.PayItemName, Unit: initial.Unit, UnitPrice: initial.UnitPrice, Currency: initial.Currency, EffectiveFrom: initial.EffectiveFrom, EffectiveTo: initial.EffectiveTo, Status: initial.Status, Remarks: initial.Remarks, Version: initial.Version}).Error)
			request := testCase.ExpectedPayload
			command, err := DecodePieceworkRatePatchDelta(request.Delta)
			require.NoError(t, err)
			saved, err := service.PatchPieceworkRate(pieceworkRateTestContext(), request.Metadata.ID, command, request.Metadata.Version)
			require.NoError(t, err)
			require.Equal(t, testCase.ExpectedPayItemID, saved.PayItemID)
			require.Equal(t, int64(2), saved.Version)
			_, err = service.PatchPieceworkRate(pieceworkRateTestContext(), request.Metadata.ID, command, request.Metadata.Version)
			require.ErrorIs(t, err, ErrPieceworkRateVersionConflict)
		})
	}
}
