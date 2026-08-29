package services

import (
	"encoding/json"
	"testing"
	"xdfc-server/models"

	"github.com/stretchr/testify/require"
	"gorm.io/datatypes"
)

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
			name:          "draft publishes",
			currentStatus: productionRouteStatusDraft,
			requested:     productionRouteStatusPublished,
		},
		{
			name:          "published archives",
			currentStatus: productionRouteStatusPublished,
			requested:     productionRouteStatusArchived,
		},
		{
			name:          "published cannot remain published",
			currentStatus: productionRouteStatusPublished,
			requested:     productionRouteStatusPublished,
			wantErr:       ErrProductionRouteImmutable,
		},
		{
			name:          "archived is read only",
			currentStatus: productionRouteStatusArchived,
			requested:     productionRouteStatusArchived,
			wantErr:       ErrProductionRouteImmutable,
		},
		{
			name:          "draft cannot archive directly",
			currentStatus: productionRouteStatusDraft,
			requested:     productionRouteStatusArchived,
			wantErr:       ErrInvalidProductionRouteStatus,
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

func TestValidatePublishedRouteArchivalRequiresSameRouteAndStepIdentity(t *testing.T) {
	qualityRouting := datatypes.JSON([]byte(`{"REWORK":{"targetRouteStepId":"step-b"}}`))
	existing := models.ProductionRoute{
		Code:              "G24-ROUTE",
		Name:              "G24 标准路线",
		ProductID:         "product-g24",
		ProductName:       "G24",
		ProductTemplateID: "template-g24",
		Description:       "标准生产路线",
		Steps: []models.ProductionRouteStep{{
			BaseModel:        models.BaseModel{ID: "step-a"},
			RouteID:          "route-g24",
			Sequence:         1,
			SegmentID:        "segment-roll",
			ProcessStepID:    "process-outer",
			ExecutionMode:    "IN_HOUSE",
			QualityGate:      "REQUIRED",
			QualityRouting:   qualityRouting,
			TransferRequired: false,
		}},
	}

	t.Run("same definition can archive", func(t *testing.T) {
		requested := existing
		require.NoError(t, validatePublishedRouteArchival(existing, requested))
	})

	t.Run("missing step identity is rejected", func(t *testing.T) {
		requested := existing
		requested.Steps = append(requested.Steps, models.ProductionRouteStep{
			BaseModel:     models.BaseModel{ID: "temp-step"},
			RouteID:       "route-g24",
			Sequence:      2,
			SegmentID:     "segment-forming",
			ProcessStepID: "process-forming",
		})
		err := validatePublishedRouteArchival(existing, requested)
		require.ErrorIs(t, err, ErrProductionRouteImmutable)
	})

	t.Run("changed process identity is rejected", func(t *testing.T) {
		requested := cloneProductionRouteForLifecycleTest(existing)
		requested.Steps[0].ProcessStepID = "process-inner"
		err := validatePublishedRouteArchival(existing, requested)
		require.ErrorIs(t, err, ErrProductionRouteImmutable)
	})

	t.Run("changed route header is rejected", func(t *testing.T) {
		requested := existing
		requested.Description = "changed"
		err := validatePublishedRouteArchival(existing, requested)
		require.ErrorIs(t, err, ErrProductionRouteImmutable)
	})
}

func cloneProductionRouteForLifecycleTest(route models.ProductionRoute) models.ProductionRoute {
	clone := route
	clone.Steps = append([]models.ProductionRouteStep(nil), route.Steps...)
	return clone
}

func TestCanonicalProductionRouteJSONTreatsObjectOrderingAsEqual(t *testing.T) {
	left := json.RawMessage(`{"REWORK":{"targetRouteStepId":"step-b"},"SCRAP":{"targetRouteStepId":"step-c"}}`)
	right := json.RawMessage(`{"SCRAP":{"targetRouteStepId":"step-c"},"REWORK":{"targetRouteStepId":"step-b"}}`)

	require.Equal(
		t,
		canonicalProductionRouteJSON(left),
		canonicalProductionRouteJSON(right),
	)
}
