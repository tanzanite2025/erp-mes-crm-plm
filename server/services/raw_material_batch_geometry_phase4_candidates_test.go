package services

import (
	"testing"
	"xdfc-server/models"

	"github.com/stretchr/testify/require"
)

func TestSeedRawMaterialBatchOptimizerPhase4GeometryCandidatesBuildsMultipleResidualBranches(t *testing.T) {
	context := buildRawMaterialBatchOptimizerContext("req-phase4-branches", models.RawMaterialBatchOptimizerSolveRequest{
		Rolls: []models.RawMaterialBatchOptimizerRollInput{
			{RollID: "roll-1", PrepregSpecID: "prepreg-1", RollWidthMM: 100, RollLengthM: 0.12, RemainingAreaM2: 0.012, EdgeTrimMM: 0, Status: "Active"},
			{RollID: "roll-2", PrepregSpecID: "prepreg-1", RollWidthMM: 100, RollLengthM: 0.12, RemainingAreaM2: 0.012, EdgeTrimMM: 0, Status: "Active"},
		},
		DemandLines: []models.RawMaterialBatchOptimizerDemandLineInput{
			{DemandLineID: "line-a", CutSizeUnitID: "unit-a", WidthMM: 60, LengthMM: 80, PieceCountPerSet: 1, RequiredSets: 1, RequiredPieces: 1, LayupCount: 1, CutAngle: 0, UsageType: "default", Priority: 5, AllowMixedPlan: true, MustFulfill: true},
			{DemandLineID: "line-b", CutSizeUnitID: "unit-b", WidthMM: 40, LengthMM: 40, PieceCountPerSet: 1, RequiredSets: 1, RequiredPieces: 1, LayupCount: 1, CutAngle: 0, UsageType: "default", Priority: 4, AllowMixedPlan: true, MustFulfill: false},
			{DemandLineID: "line-c", CutSizeUnitID: "unit-c", WidthMM: 40, LengthMM: 40, PieceCountPerSet: 1, RequiredSets: 1, RequiredPieces: 1, LayupCount: 1, CutAngle: 0, UsageType: "default", Priority: 3, AllowMixedPlan: true, MustFulfill: false},
		},
		KnifeGapMM: 0, DefaultEdgeTrimMM: 0, ObjectivePreset: "yield-first", MaxCandidatePlans: 6, TimeLimitMs: 2000,
	})

	require.True(t, canSolveRawMaterialBatchOptimizerPhase4Geometry(context))
	candidates := seedRawMaterialBatchOptimizerPhase4GeometryCandidates(context)
	require.NotEmpty(t, candidates)
	require.GreaterOrEqual(t, len(candidates), 2)
	for _, candidate := range candidates {
		require.NotNil(t, candidate.GeometryLayoutSummary)
		require.GreaterOrEqual(t, candidate.ReusableResidualAreaM2, 0.0)
		require.GreaterOrEqual(t, candidate.GeometryReuseHitCount, 0)
	}
}

func TestSolveRawMaterialBatchOptimizerPhase7IncludesScoreAndReportMetrics(t *testing.T) {
	response, err := SolveRawMaterialBatchOptimizer(models.RawMaterialBatchOptimizerSolveRequest{
		Rolls: []models.RawMaterialBatchOptimizerRollInput{
			{RollID: "roll-1", PrepregSpecID: "prepreg-1", RollWidthMM: 100, RollLengthM: 0.1, RemainingAreaM2: 0.01, EdgeTrimMM: 0, Status: "Active"},
			{RollID: "roll-2", PrepregSpecID: "prepreg-1", RollWidthMM: 100, RollLengthM: 0.1, RemainingAreaM2: 0.01, EdgeTrimMM: 0, Status: "Active"},
		},
		DemandLines: []models.RawMaterialBatchOptimizerDemandLineInput{
			{DemandLineID: "group-1", CutSizeUnitID: "unit-1", WidthMM: 60, LengthMM: 60, PieceCountPerSet: 1, RequiredSets: 1, RequiredPieces: 1, LayupCount: 1, CutAngle: 0, UsageType: "default", Priority: 5, AllowMixedPlan: true, MustFulfill: true, RollGroupKey: "grp-a", ProcessTags: []string{"must-adjacent"}},
			{DemandLineID: "group-2", CutSizeUnitID: "unit-2", WidthMM: 60, LengthMM: 60, PieceCountPerSet: 1, RequiredSets: 1, RequiredPieces: 1, LayupCount: 1, CutAngle: 0, UsageType: "default", Priority: 4, AllowMixedPlan: true, MustFulfill: false, RollGroupKey: "grp-a", ProcessTags: []string{"must-adjacent"}},
			{DemandLineID: "line-c", CutSizeUnitID: "unit-c", WidthMM: 40, LengthMM: 40, PieceCountPerSet: 1, RequiredSets: 1, RequiredPieces: 1, LayupCount: 1, CutAngle: 0, UsageType: "default", Priority: 3, AllowMixedPlan: true, MustFulfill: false},
		},
		KnifeGapMM: 0, DefaultEdgeTrimMM: 0, ObjectivePreset: "yield-first", MaxCandidatePlans: 4, TimeLimitMs: 2000,
	})
	require.NoError(t, err)
	require.NotEmpty(t, response.Plans)

	topPlan := response.Plans[0]
	require.Contains(t, topPlan.StrategyKey, "phase7-")
	require.GreaterOrEqual(t, topPlan.ScoreBreakdown.AdjacencyBreakCount, 0)
	require.GreaterOrEqual(t, topPlan.ScoreBreakdown.RollSwitchCount, 0)
	require.GreaterOrEqual(t, topPlan.ScoreBreakdown.GeometryReuseHitCount, 0)
	require.GreaterOrEqual(t, topPlan.ScoreBreakdown.ReusableResidualAreaM2, 0.0)
	require.Equal(t, topPlan.ScoreBreakdown.AdjacencyBreakCount, topPlan.ReportSummary.AdjacencyBreakCount)
	require.Equal(t, topPlan.ScoreBreakdown.RollSwitchCount, topPlan.ReportSummary.RollSwitchCount)
	require.Equal(t, topPlan.ScoreBreakdown.GeometryReuseHitCount, topPlan.ReportSummary.GeometryReuseHitCount)
	require.Equal(t, topPlan.ScoreBreakdown.ReusableResidualAreaM2, topPlan.ReportSummary.ReusableResidualAreaM2)
	require.Equal(t, topPlan.SearchConfig.PresetKey != "", true)
	require.GreaterOrEqual(t, topPlan.CandidateBudgetSummary.GlobalBudget, 1)
	require.NotNil(t, topPlan.CandidateBudgetSummary.DynamicStrategyStats)
	require.NotNil(t, topPlan.ExplainabilitySummary.PrimaryBreakReasons)
	require.NotNil(t, topPlan.ExplainabilitySummary.BreakSlices)
	require.NotNil(t, topPlan.ExplainabilitySummary.ZoneClusters)
	require.NotEmpty(t, topPlan.BudgetRerankReason)
	require.Contains(t, response.Summary.SolverStatus, "phase7")
}
