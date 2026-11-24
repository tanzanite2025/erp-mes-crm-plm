package services

import (
	"testing"

	"github.com/stretchr/testify/require"
)

func productionRouteTestUUIDPointer(value string) *string {
	return &value
}

func TestValidateProductionRouteStatusTransition(t *testing.T) {
	tests := []struct {
		name          string
		currentStatus string
		requested     string
		isCreate      bool
		wantErr       error
	}{
		{
			name:      "new draft",
			requested: productionRouteStatusDraft,
			isCreate:  true,
		},
		{
			name:          "draft remains draft",
			currentStatus: productionRouteStatusDraft,
			requested:     productionRouteStatusDraft,
		},
		{
			name:          "publishing is unavailable before execution migration",
			currentStatus: productionRouteStatusDraft,
			requested:     productionRouteStatusPublished,
			wantErr:       ErrInvalidProductionRouteStatus,
		},
		{
			name:          "unsupported route status is rejected",
			currentStatus: productionRouteStatusPublished,
			requested:     "ARCHIVED",
			wantErr:       ErrInvalidProductionRouteStatus,
		},
		{
			name:          "published routes cannot be edited",
			currentStatus: productionRouteStatusPublished,
			requested:     productionRouteStatusDraft,
			wantErr:       ErrProductionRouteImmutable,
		},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			err := validateProductionRouteStatusTransition(test.currentStatus, test.requested, test.isCreate)
			if test.wantErr == nil {
				require.NoError(t, err)
				return
			}
			require.ErrorIs(t, err, test.wantErr)
		})
	}
}
