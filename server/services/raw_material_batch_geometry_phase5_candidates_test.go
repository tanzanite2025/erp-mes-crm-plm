package services

import (
	"testing"
	"xdfc-server/models"

	"github.com/stretchr/testify/require"
)

func TestBuildRawMaterialBatchOptimizerSearchConfigUsesObjectivePreset(t *testing.T) {
	yieldConfig := buildRawMaterialBatchOptimizerSearchConfig(models.RawMaterialBatchOptimizerSolveRequest{
		ObjectivePreset:   "yield-first",
		MaxCandidatePlans: 2,
	})
	deliveryConfig := buildRawMaterialBatchOptimizerSearchConfig(models.RawMaterialBatchOptimizerSolveRequest{
		ObjectivePreset:   "delivery-first",
		MaxCandidatePlans: 8,
	})

	require.Equal(t, "phase5-yield", yieldConfig.PresetKey)
	require.Equal(t, 2, yieldConfig.BeamWidth)
	require.GreaterOrEqual(t, yieldConfig.MaxSearchDepth, 1)
	require.Equal(t, "phase5-delivery", deliveryConfig.PresetKey)
	require.GreaterOrEqual(t, deliveryConfig.BeamWidth, 1)
	require.GreaterOrEqual(t, deliveryConfig.PerDemandBranchingLimit, 1)
}

func TestBuildRawMaterialBatchOptimizerExplainabilitySummaryReportsBrokenSegments(t *testing.T) {
	context := buildRawMaterialBatchOptimizerContext("req-phase5-explain", models.RawMaterialBatchOptimizerSolveRequest{
		Rolls: []models.RawMaterialBatchOptimizerRollInput{
			{RollID: "roll-1", PrepregSpecID: "prepreg-1", RollWidthMM: 100, RollLengthM: 0.1, RemainingAreaM2: 0.01, EdgeTrimMM: 0, Status: "Active"},
			{RollID: "roll-2", PrepregSpecID: "prepreg-1", RollWidthMM: 100, RollLengthM: 0.1, RemainingAreaM2: 0.01, EdgeTrimMM: 0, Status: "Active"},
		},
		DemandLines: []models.RawMaterialBatchOptimizerDemandLineInput{
			{DemandLineID: "group-1", CutSizeUnitID: "unit-1", WidthMM: 40, LengthMM: 40, PieceCountPerSet: 1, RequiredSets: 1, RequiredPieces: 1, LayupCount: 1, CutAngle: 0, UsageType: "default", Priority: 5, AllowMixedPlan: true, MustFulfill: true, RollGroupKey: "grp-a", ProcessTags: []string{"must-adjacent"}},
			{DemandLineID: "group-2", CutSizeUnitID: "unit-2", WidthMM: 40, LengthMM: 40, PieceCountPerSet: 1, RequiredSets: 1, RequiredPieces: 1, LayupCount: 1, CutAngle: 0, UsageType: "default", Priority: 4, AllowMixedPlan: true, MustFulfill: false, RollGroupKey: "grp-a", ProcessTags: []string{"must-adjacent"}},
			{DemandLineID: "seq-3", CutSizeUnitID: "unit-3", WidthMM: 40, LengthMM: 40, PieceCountPerSet: 1, RequiredSets: 1, RequiredPieces: 1, LayupCount: 1, CutAngle: 0, UsageType: "default", Priority: 3, AllowMixedPlan: true, MustFulfill: false, OrderSequence: 3},
			{DemandLineID: "seq-1", CutSizeUnitID: "unit-4", WidthMM: 40, LengthMM: 40, PieceCountPerSet: 1, RequiredSets: 1, RequiredPieces: 1, LayupCount: 1, CutAngle: 0, UsageType: "default", Priority: 2, AllowMixedPlan: true, MustFulfill: false, OrderSequence: 1},
		},
	})
	candidate := rawMaterialBatchOptimizerCandidatePlan{
		Assignments: []models.RawMaterialBatchOptimizerPlanAssignment{
			{RollID: "roll-1", DemandLineID: "group-1", AllocatedSets: 1, AllocatedPieces: 1},
			{RollID: "roll-2", DemandLineID: "group-2", AllocatedSets: 1, AllocatedPieces: 1},
			{RollID: "roll-1", DemandLineID: "seq-3", AllocatedSets: 1, AllocatedPieces: 1},
			{RollID: "roll-1", DemandLineID: "seq-1", AllocatedSets: 1, AllocatedPieces: 1},
		},
	}

	summary := buildRawMaterialBatchOptimizerExplainabilitySummary(candidate, context)
	require.NotEmpty(t, summary.GroupSegments)
	require.NotEmpty(t, summary.SequenceSegments)
	require.NotEmpty(t, summary.AdjacencySegments)
	require.NotEmpty(t, summary.PrimaryBreakReasons)
	require.False(t, summary.GroupSegments[0].Preserved)
}

func TestSeedRawMaterialBatchOptimizerPhase5GeometryCandidatesAddsSearchConfigAndExplainability(t *testing.T) {
	context := buildRawMaterialBatchOptimizerContext("req-phase5-seed", models.RawMaterialBatchOptimizerSolveRequest{
		Rolls: []models.RawMaterialBatchOptimizerRollInput{
			{RollID: "roll-1", PrepregSpecID: "prepreg-1", RollWidthMM: 100, RollLengthM: 0.12, RemainingAreaM2: 0.012, EdgeTrimMM: 0, Status: "Active"},
			{RollID: "roll-2", PrepregSpecID: "prepreg-1", RollWidthMM: 100, RollLengthM: 0.12, RemainingAreaM2: 0.012, EdgeTrimMM: 0, Status: "Active"},
		},
		DemandLines: []models.RawMaterialBatchOptimizerDemandLineInput{
			{DemandLineID: "line-a", CutSizeUnitID: "unit-a", WidthMM: 60, LengthMM: 80, PieceCountPerSet: 1, RequiredSets: 1, RequiredPieces: 1, LayupCount: 1, CutAngle: 0, UsageType: "default", Priority: 5, AllowMixedPlan: true, MustFulfill: true},
			{DemandLineID: "line-b", CutSizeUnitID: "unit-b", WidthMM: 40, LengthMM: 40, PieceCountPerSet: 1, RequiredSets: 1, RequiredPieces: 1, LayupCount: 1, CutAngle: 0, UsageType: "default", Priority: 4, AllowMixedPlan: true, MustFulfill: false, RollGroupKey: "grp-a", ProcessTags: []string{"must-adjacent"}},
			{DemandLineID: "line-c", CutSizeUnitID: "unit-c", WidthMM: 40, LengthMM: 40, PieceCountPerSet: 1, RequiredSets: 1, RequiredPieces: 1, LayupCount: 1, CutAngle: 0, UsageType: "default", Priority: 3, AllowMixedPlan: true, MustFulfill: false, RollGroupKey: "grp-a", ProcessTags: []string{"must-adjacent"}},
		},
		KnifeGapMM: 0, DefaultEdgeTrimMM: 0, ObjectivePreset: "yield-first", MaxCandidatePlans: 6, TimeLimitMs: 2000,
	})

	candidates := seedRawMaterialBatchOptimizerPhase5GeometryCandidates(context)
	require.NotEmpty(t, candidates)
	for _, candidate := range candidates {
		require.Contains(t, candidate.StrategyKey, "phase5-")
		require.NotEmpty(t, candidate.SearchConfig.PresetKey)
		require.NotNil(t, candidate.ExplainabilitySummary.PrimaryBreakReasons)
	}
}
