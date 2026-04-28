package services

import (
	"testing"

	"xdfc-server/models"

	"github.com/stretchr/testify/require"
)

func TestValidateRawMaterialBatchOptimizerDemandLineInputRejectsUnsupportedCutAngle(t *testing.T) {
	err := validateRawMaterialBatchOptimizerSolveRequest(models.RawMaterialBatchOptimizerSolveRequest{
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
				CutAngle:         90,
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

	require.Error(t, err)
	require.ErrorContains(t, err, "cutAngle 仅支持 0 或 45")
}
