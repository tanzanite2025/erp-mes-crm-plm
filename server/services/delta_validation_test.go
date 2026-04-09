package services

import (
	"encoding/json"
	"testing"

	"github.com/stretchr/testify/require"
)

func TestParseCustomerSavePayloadRejectsNestedDeltaPath(t *testing.T) {
	payload, err := json.Marshal(CustomerSavePayload{
		Delta: map[string]json.RawMessage{
			"contactPerson.name": json.RawMessage(`{"o":"Alice","n":"Dora"}`),
		},
		FinalData: CustomerSaveSnapshot{
			Name:   "Acme",
			Code:   "CUST-001",
			Status: "Active",
		},
		Operator: "tester",
	})
	require.NoError(t, err)

	_, err = parseCustomerSavePayload(payload)
	require.Error(t, err)
	require.ErrorIs(t, err, ErrCustomerTransactionInvalidPayload)
	require.ErrorContains(t, err, "nested delta path is not supported")
}

func TestParsePurchaseOrderSavePayloadRejectsUnsupportedDeltaField(t *testing.T) {
	payload, err := json.Marshal(PurchaseOrderSavePayload{
		Delta: map[string]json.RawMessage{
			"unknownField": json.RawMessage(`{"o":"x","n":"y"}`),
		},
		FinalData: PatchPurchaseOrderRequest{
			ID: "po-1",
		},
		Operator: "tester",
	})
	require.NoError(t, err)

	_, err = parsePurchaseOrderSavePayload(payload)
	require.Error(t, err)
	require.ErrorIs(t, err, ErrPurchaseTransactionInvalidPayload)
	require.ErrorContains(t, err, "unsupported patch field")
}

func TestParseSalesOrderSavePayloadRejectsNestedDeltaPath(t *testing.T) {
	payload, err := json.Marshal(SalesOrderSavePayload{
		Delta: map[string]json.RawMessage{
			"lines[0].qty": json.RawMessage(`{"o":10,"n":12}`),
		},
		FinalData: PatchSalesOrderRequest{
			ID: "so-1",
		},
		Operator: "tester",
	})
	require.NoError(t, err)

	_, err = parseSalesOrderSavePayload(payload)
	require.Error(t, err)
	require.ErrorIs(t, err, ErrSalesTransactionInvalidPayload)
	require.ErrorContains(t, err, "nested delta path is not supported")
}
