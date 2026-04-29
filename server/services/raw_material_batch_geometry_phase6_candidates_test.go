package services

import (
	"testing"
	"xdfc-server/models"

	"github.com/stretchr/testify/require"
)

func TestEnrichRawMaterialBatchOptimizerExplainabilitySummaryBuildsPositionsAndHeatZoneAttributions(t *testing.T) {
	candidate := rawMaterialBatchOptimizerCandidatePlan{
		GeometryLayoutSummary: &models.RawMaterialBatchOptimizerGeometryLayoutSummary{
			Zones: []models.RawMaterialBatchOptimizerGeometryLayoutZone{
				{ID: "zone-a", RollID: "roll-1", DemandLineID: "line-a"},
				{ID: "zone-b", RollID: "roll-2", DemandLineID: "line-b"},
				{ID: "zone-c", RollID: "roll-1", DemandLineID: "line-c"},
			},
		},
	}
	summary := models.RawMaterialBatchOptimizerPlanExplainabilitySummary{
		GroupSegments: []models.RawMaterialBatchOptimizerContinuitySegment{
			{
				Kind:          "group",
				Key:           "grp-a",
				DemandLineIDs: []string{"line-a", "line-b"},
				Preserved:     false,
				Reason:        "组 grp-a 被拆分到 2 个卷材，连续段被打断。",
			},
		},
		PrimaryBreakReasons: []string{"组 grp-a 被拆分到 2 个卷材，连续段被打断。"},
	}

	enriched := enrichRawMaterialBatchOptimizerExplainabilitySummary(summary, candidate)
	require.Len(t, enriched.GroupSegments, 1)
	require.Equal(t, 1, enriched.GroupSegments[0].BreakPosition)
	require.Equal(t, "line-a", enriched.GroupSegments[0].BreakBeforeDemandLineID)
	require.Equal(t, "line-b", enriched.GroupSegments[0].BreakAfterDemandLineID)
	require.ElementsMatch(t, []string{"zone-a", "zone-b"}, enriched.GroupSegments[0].AttributedZoneIDs)
	require.NotEmpty(t, enriched.HeatZoneAttributions)
	require.Equal(t, "zone-a", enriched.HeatZoneAttributions[0].ZoneID)
}

func TestBudgetRawMaterialBatchOptimizerPhase6CandidatesControlsPerStrategyQuotaAndDeduplicates(t *testing.T) {
	context := rawMaterialBatchOptimizerContext{MaxCandidatePlans: 3}
	candidateA1 := rawMaterialBatchOptimizerCandidatePlan{
		StrategyKey:           "phase6-a",
		FulfilledPieces:       3,
		SearchConfig:          models.RawMaterialBatchOptimizerSearchConfigSummary{PresetKey: "phase5-yield"},
		ExplainabilitySummary: models.RawMaterialBatchOptimizerPlanExplainabilitySummary{PrimaryBreakReasons: []string{"reason-a"}},
		Assignments:           []models.RawMaterialBatchOptimizerPlanAssignment{{RollID: "roll-1", DemandLineID: "line-a", AllocatedSets: 1, AllocatedPieces: 1}},
	}
	candidateA2 := rawMaterialBatchOptimizerCandidatePlan{
		StrategyKey:           "phase6-a",
		FulfilledPieces:       2,
		SearchConfig:          models.RawMaterialBatchOptimizerSearchConfigSummary{PresetKey: "phase5-yield"},
		ExplainabilitySummary: models.RawMaterialBatchOptimizerPlanExplainabilitySummary{PrimaryBreakReasons: []string{"reason-b"}},
		Assignments:           []models.RawMaterialBatchOptimizerPlanAssignment{{RollID: "roll-1", DemandLineID: "line-b", AllocatedSets: 1, AllocatedPieces: 1}},
	}
	candidateB1 := rawMaterialBatchOptimizerCandidatePlan{
		StrategyKey:           "phase6-b",
		FulfilledPieces:       3,
		SearchConfig:          models.RawMaterialBatchOptimizerSearchConfigSummary{PresetKey: "phase5-yield"},
		ExplainabilitySummary: models.RawMaterialBatchOptimizerPlanExplainabilitySummary{PrimaryBreakReasons: []string{"reason-a"}},
		Assignments:           []models.RawMaterialBatchOptimizerPlanAssignment{{RollID: "roll-1", DemandLineID: "line-a", AllocatedSets: 1, AllocatedPieces: 1}},
	}
	candidateC1 := rawMaterialBatchOptimizerCandidatePlan{
		StrategyKey:           "phase6-c",
		FulfilledPieces:       1,
		SearchConfig:          models.RawMaterialBatchOptimizerSearchConfigSummary{PresetKey: "phase5-yield"},
		ExplainabilitySummary: models.RawMaterialBatchOptimizerPlanExplainabilitySummary{PrimaryBreakReasons: []string{"reason-c"}},
		Assignments:           []models.RawMaterialBatchOptimizerPlanAssignment{{RollID: "roll-2", DemandLineID: "line-c", AllocatedSets: 1, AllocatedPieces: 1}},
	}

	merged := budgetRawMaterialBatchOptimizerPhase6Candidates(
		[]rawMaterialBatchOptimizerCandidatePlan{candidateA1, candidateA2, candidateB1, candidateC1},
		map[string]int{"phase6-a": 2, "phase6-b": 1, "phase6-c": 1},
		context,
	)

	require.Len(t, merged, 3)
	require.Equal(t, 3, merged[0].CandidateBudgetSummary.GlobalBudget)
	require.Equal(t, 1, merged[0].CandidateBudgetSummary.PerStrategyQuota)
	require.Equal(t, 3, merged[0].CandidateBudgetSummary.MergedCandidateCount)
	require.Len(t, merged[0].CandidateBudgetSummary.StrategyStats, 3)
}

func TestSeedRawMaterialBatchOptimizerPhase6GeometryCandidatesAddsBudgetAndAttribution(t *testing.T) {
	context := buildRawMaterialBatchOptimizerContext("req-phase6-seed", models.RawMaterialBatchOptimizerSolveRequest{
		Rolls: []models.RawMaterialBatchOptimizerRollInput{
			{RollID: "roll-1", PrepregSpecID: "prepreg-1", RollWidthMM: 100, RollLengthM: 0.12, RemainingAreaM2: 0.012, EdgeTrimMM: 0, Status: "Active"},
			{RollID: "roll-2", PrepregSpecID: "prepreg-1", RollWidthMM: 100, RollLengthM: 0.12, RemainingAreaM2: 0.012, EdgeTrimMM: 0, Status: "Active"},
		},
		DemandLines: []models.RawMaterialBatchOptimizerDemandLineInput{
			{DemandLineID: "group-1", CutSizeUnitID: "unit-1", WidthMM: 60, LengthMM: 60, PieceCountPerSet: 1, RequiredSets: 1, RequiredPieces: 1, LayupCount: 1, CutAngle: 0, UsageType: "default", Priority: 5, AllowMixedPlan: true, MustFulfill: true, RollGroupKey: "grp-a", ProcessTags: []string{"must-adjacent"}},
			{DemandLineID: "group-2", CutSizeUnitID: "unit-2", WidthMM: 60, LengthMM: 60, PieceCountPerSet: 1, RequiredSets: 1, RequiredPieces: 1, LayupCount: 1, CutAngle: 0, UsageType: "default", Priority: 4, AllowMixedPlan: true, MustFulfill: false, RollGroupKey: "grp-a", ProcessTags: []string{"must-adjacent"}},
			{DemandLineID: "line-c", CutSizeUnitID: "unit-c", WidthMM: 40, LengthMM: 40, PieceCountPerSet: 1, RequiredSets: 1, RequiredPieces: 1, LayupCount: 1, CutAngle: 0, UsageType: "default", Priority: 3, AllowMixedPlan: true, MustFulfill: false},
		},
		KnifeGapMM: 0, DefaultEdgeTrimMM: 0, ObjectivePreset: "yield-first", MaxCandidatePlans: 4, TimeLimitMs: 2000,
	})

	candidates := seedRawMaterialBatchOptimizerPhase6GeometryCandidates(context)
	require.NotEmpty(t, candidates)
	for _, candidate := range candidates {
		require.Contains(t, candidate.StrategyKey, "phase6-")
		require.GreaterOrEqual(t, candidate.CandidateBudgetSummary.GlobalBudget, 1)
		require.NotNil(t, candidate.ExplainabilitySummary.HeatZoneAttributions)
		for _, segment := range append(append(candidate.ExplainabilitySummary.GroupSegments, candidate.ExplainabilitySummary.SequenceSegments...), candidate.ExplainabilitySummary.AdjacencySegments...) {
			require.NotNil(t, segment.AttributedZoneIDs)
		}
	}
}
