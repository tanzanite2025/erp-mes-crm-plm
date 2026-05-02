package handlers

import (
	"encoding/json"
	"testing"

	"github.com/stretchr/testify/require"
)

func TestHandlerExtractDeltaNewValueRejectsLiteralDelta(t *testing.T) {
	_, err := extractDeltaNewValue(json.RawMessage(`"Inactive"`))
	require.Error(t, err)
	require.ErrorContains(t, err, "SDRTS object")
}

func TestHandlerExtractDeltaNewValueRejectsMissingNewValue(t *testing.T) {
	_, err := extractDeltaNewValue(json.RawMessage(`{"o":"Active"}`))
	require.Error(t, err)
	require.ErrorContains(t, err, "both o and n")
}

func TestHandlerExtractDeltaNewValueReturnsNewValue(t *testing.T) {
	value, err := extractDeltaNewValue(json.RawMessage(`{"o":"Active","n":"Inactive"}`))
	require.NoError(t, err)
	require.JSONEq(t, `"Inactive"`, string(value))
}
