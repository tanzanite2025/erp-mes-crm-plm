package services

import (
	"github.com/stretchr/testify/require"
	"testing"
)

func TestPieceworkRateHTTPWritesRequireIndependentIdentityPriceAndDate(t *testing.T) {
	service, _ := newPieceworkRateTestService(t)
	request := PieceworkRateHTTPWriteRequest{PayItemID: pieceworkTestPayItemID, Unit: "PCS", UnitPrice: pointerFloat(2), EffectiveFrom: "2026-10-01"}
	saved, err := savePieceworkRateFromHTTPRequest(pieceworkRateTestContext(), service, request)
	require.NoError(t, err)
	require.Equal(t, pieceworkTestPayItemID, saved.PayItemID)
	request.ID = saved.ID
	request.UnitPrice = pointerFloat(3)
	_, err = savePieceworkRateFromHTTPRequest(pieceworkRateTestContext(), service, request)
	require.ErrorIs(t, err, ErrPieceworkRateVersionConflict)
	request.Version = saved.Version
	updated, err := savePieceworkRateFromHTTPRequest(pieceworkRateTestContext(), service, request)
	require.NoError(t, err)
	require.Equal(t, int64(2), updated.Version)
	_, err = savePieceworkRateFromHTTPRequest(pieceworkRateTestContext(), service, request)
	require.ErrorIs(t, err, ErrPieceworkRateVersionConflict)
	for _, invalid := range []PieceworkRateHTTPWriteRequest{
		{Unit: "PCS", UnitPrice: pointerFloat(2), EffectiveFrom: "2026-10-01"},
		{PayItemID: pieceworkTestPayItemID, Unit: "PCS", EffectiveFrom: "2026-10-01"},
		{PayItemID: pieceworkTestPayItemID, Unit: "PCS", UnitPrice: pointerFloat(2)},
	} {
		_, err := savePieceworkRateFromHTTPRequest(pieceworkRateTestContext(), service, invalid)
		require.Error(t, err)
	}
}
