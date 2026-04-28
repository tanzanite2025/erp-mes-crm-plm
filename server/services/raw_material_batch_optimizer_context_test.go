package services

import (
	"testing"

	"xdfc-server/models"

	"github.com/stretchr/testify/require"
)

func TestBuildRawMaterialBatchOptimizerContextUsesCutAngleEnvelopeGeometry(t *testing.T) {
	context := buildRawMaterialBatchOptimizerContext("req-1", models.RawMaterialBatchOptimizerSolveRequest{
		Rolls: []models.RawMaterialBatchOptimizerRollInput{
			{
				RollID:          "roll-1",
				PrepregSpecID:   "prepreg-1",
				RollWidthMM:     1000,
				RollLengthM:     2,
				RemainingAreaM2: 2,
				EdgeTrimMM:      0,
				Status:          "Active",
			},
		},
		DemandLines: []models.RawMaterialBatchOptimizerDemandLineInput{
			{
				DemandLineID:     "line-1",
				CutSizeUnitID:    "unit-1",
				WidthMM:          980,
				LengthMM:         91,
				PieceCountPerSet: 1,
				RequiredSets:     1,
				RequiredPieces:   1,
				LayupCount:       1,
				CutAngle:         45,
				UsageType:        "default",
				Priority:         1,
				AllowMixedPlan:   true,
				MustFulfill:      true,
			},
		},
		KnifeGapMM:        0,
		DefaultEdgeTrimMM: 0,
		ObjectivePreset:   "yield-first",
		MaxCandidatePlans: 3,
		TimeLimitMs:       2000,
	})

	require.Len(t, context.DemandLines, 1)
	demandLine := context.DemandLines[0]
	require.Equal(t, 980.0, demandLine.ActualWidthMM)
	require.Equal(t, 91.0, demandLine.ActualLengthMM)
	require.Equal(t, 757.311, demandLine.WidthMM)
	require.Equal(t, 757.311, demandLine.LengthMM)
	require.Equal(t, 0.08918, demandLine.ActualPieceAreaM2)
	require.Equal(t, 0.57352, demandLine.PieceAreaM2)
	require.Greater(t, demandLine.RequiredAreaM2, demandLine.ActualRequiredAreaM2)
}
