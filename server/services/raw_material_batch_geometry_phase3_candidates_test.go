package services

import (
	"testing"
	"xdfc-server/models"

	"github.com/stretchr/testify/require"
)

func TestSeedRawMaterialBatchOptimizerPhase3GeometryCandidatesBuildsMultiRollLayout(t *testing.T) {
	context := buildRawMaterialBatchOptimizerContext("req-phase3-multi-roll", models.RawMaterialBatchOptimizerSolveRequest{
		Rolls: []models.RawMaterialBatchOptimizerRollInput{
			{RollID: "roll-1", PrepregSpecID: "prepreg-1", RollWidthMM: 100, RollLengthM: 0.12, RemainingAreaM2: 0.012, EdgeTrimMM: 0, Status: "Active"},
			{RollID: "roll-2", PrepregSpecID: "prepreg-1", RollWidthMM: 100, RollLengthM: 0.12, RemainingAreaM2: 0.012, EdgeTrimMM: 0, Status: "Active"},
		},
		DemandLines: []models.RawMaterialBatchOptimizerDemandLineInput{
			{DemandLineID: "line-a", CutSizeUnitID: "unit-a", WidthMM: 60, LengthMM: 80, PieceCountPerSet: 1, RequiredSets: 2, RequiredPieces: 2, LayupCount: 1, CutAngle: 0, UsageType: "default", Priority: 5, AllowMixedPlan: true, MustFulfill: true},
			{DemandLineID: "line-b", CutSizeUnitID: "unit-b", WidthMM: 40, LengthMM: 40, PieceCountPerSet: 1, RequiredSets: 1, RequiredPieces: 1, LayupCount: 1, CutAngle: 0, UsageType: "default", Priority: 1, AllowMixedPlan: true, MustFulfill: false},
		},
		KnifeGapMM: 0, DefaultEdgeTrimMM: 0, ObjectivePreset: "yield-first", MaxCandidatePlans: 4, TimeLimitMs: 2000,
	})

	require.True(t, canSolveRawMaterialBatchOptimizerPhase3Geometry(context))
	candidates := seedRawMaterialBatchOptimizerPhase3GeometryCandidates(context)
	require.NotEmpty(t, candidates)
	topCandidate := candidates[0]
	require.NotNil(t, topCandidate.GeometryLayoutSummary)

	usedRolls := make(map[string]struct{})
	for _, assignment := range topCandidate.Assignments {
		usedRolls[assignment.RollID] = struct{}{}
	}
	require.Len(t, usedRolls, 2)

	rollZoneCount := 0
	for _, zone := range topCandidate.GeometryLayoutSummary.Zones {
		if zone.Kind == "roll" {
			rollZoneCount += 1
		}
	}
	require.Equal(t, 2, rollZoneCount)
}

func TestBuildRawMaterialBatchOptimizerPhase3GeometryPlacementKeepsAdjacentGroupOnSameRoll(t *testing.T) {
	context := buildRawMaterialBatchOptimizerContext("req-phase3-group", models.RawMaterialBatchOptimizerSolveRequest{
		Rolls: []models.RawMaterialBatchOptimizerRollInput{
			{RollID: "roll-1", PrepregSpecID: "prepreg-1", RollWidthMM: 100, RollLengthM: 0.1, RemainingAreaM2: 0.01, EdgeTrimMM: 0, Status: "Active"},
			{RollID: "roll-2", PrepregSpecID: "prepreg-1", RollWidthMM: 100, RollLengthM: 0.1, RemainingAreaM2: 0.01, EdgeTrimMM: 0, Status: "Active"},
		},
		DemandLines: []models.RawMaterialBatchOptimizerDemandLineInput{
			{DemandLineID: "group-1", CutSizeUnitID: "unit-1", WidthMM: 60, LengthMM: 60, PieceCountPerSet: 1, RequiredSets: 1, RequiredPieces: 1, LayupCount: 1, CutAngle: 0, UsageType: "default", Priority: 5, AllowMixedPlan: true, MustFulfill: true, RollGroupKey: "grp-a", ProcessTags: []string{"must-adjacent"}},
			{DemandLineID: "group-2", CutSizeUnitID: "unit-2", WidthMM: 60, LengthMM: 60, PieceCountPerSet: 1, RequiredSets: 1, RequiredPieces: 1, LayupCount: 1, CutAngle: 0, UsageType: "default", Priority: 4, AllowMixedPlan: true, MustFulfill: false, RollGroupKey: "grp-a", ProcessTags: []string{"must-adjacent"}},
		},
		KnifeGapMM: 0, DefaultEdgeTrimMM: 0, ObjectivePreset: "yield-first", MaxCandidatePlans: 4, TimeLimitMs: 2000,
	})

	result := buildRawMaterialBatchOptimizerPhase3GeometryPlacement(context, orderRawMaterialBatchOptimizerPhase3DemandLinesByGroup(context.DemandLines))
	require.Len(t, result.Assignments, 1)
	require.Equal(t, "grp-a", context.DemandLines[0].RollGroupKey)
	require.Len(t, result.UnfulfilledLines, 1)
	require.Equal(t, "group-2", result.UnfulfilledLines[0].DemandLineID)
}

func TestBuildRawMaterialBatchOptimizerPhase3GeometryPlacementPrefersResidualReuse(t *testing.T) {
	context := buildRawMaterialBatchOptimizerContext("req-phase3-residual", models.RawMaterialBatchOptimizerSolveRequest{
		Rolls: []models.RawMaterialBatchOptimizerRollInput{
			{RollID: "roll-1", PrepregSpecID: "prepreg-1", RollWidthMM: 100, RollLengthM: 0.1, RemainingAreaM2: 0.01, EdgeTrimMM: 0, Status: "Active"},
			{RollID: "roll-2", PrepregSpecID: "prepreg-1", RollWidthMM: 100, RollLengthM: 0.1, RemainingAreaM2: 0.01, EdgeTrimMM: 0, Status: "Active"},
		},
		DemandLines: []models.RawMaterialBatchOptimizerDemandLineInput{
			{DemandLineID: "line-a", CutSizeUnitID: "unit-a", WidthMM: 60, LengthMM: 40, PieceCountPerSet: 1, RequiredSets: 1, RequiredPieces: 1, LayupCount: 1, CutAngle: 0, UsageType: "default", Priority: 3, AllowMixedPlan: true, MustFulfill: true},
			{DemandLineID: "line-b", CutSizeUnitID: "unit-b", WidthMM: 40, LengthMM: 60, PieceCountPerSet: 1, RequiredSets: 1, RequiredPieces: 1, LayupCount: 1, CutAngle: 0, UsageType: "default", Priority: 2, AllowMixedPlan: true, MustFulfill: false},
		},
		KnifeGapMM: 0, DefaultEdgeTrimMM: 0, ObjectivePreset: "yield-first", MaxCandidatePlans: 4, TimeLimitMs: 2000,
	})

	result := buildRawMaterialBatchOptimizerPhase3GeometryPlacement(context, cloneRawMaterialBatchOptimizerDemandLines(context.DemandLines))
	require.Len(t, result.Assignments, 2)
	require.Equal(t, "roll-1", result.Assignments[0].RollID)
	require.Equal(t, "roll-1", result.Assignments[1].RollID)
}

func TestBuildRawMaterialBatchOptimizerPlanDiffSummaryPrefersGeometryZones(t *testing.T) {
	baseline := models.RawMaterialBatchOptimizerPlan{
		Rank:        1,
		StrategyKey: "baseline",
		LayoutSummary: models.RawMaterialBatchOptimizerPlanLayoutSummary{
			Zones: []models.RawMaterialBatchOptimizerPlanLayoutZone{{ID: "rect-zone-1", RollID: "roll-1", DemandLineID: "line-1"}},
		},
		GeometryLayoutSummary: &models.RawMaterialBatchOptimizerGeometryLayoutSummary{
			CanvasWidthMM:  100,
			CanvasHeightMM: 100,
			Zones:          []models.RawMaterialBatchOptimizerGeometryLayoutZone{{ID: "geo-zone-1", RollID: "roll-1", DemandLineID: "line-1", PolygonPoints: []models.RawMaterialBatchOptimizerGeometryPoint{{X: 0, Y: 0}, {X: 10, Y: 0}, {X: 10, Y: 10}, {X: 0, Y: 10}}}},
		},
	}
	plan := models.RawMaterialBatchOptimizerPlan{
		Rank:        2,
		StrategyKey: "candidate",
		LayoutSummary: models.RawMaterialBatchOptimizerPlanLayoutSummary{
			Zones: []models.RawMaterialBatchOptimizerPlanLayoutZone{{ID: "rect-zone-2", RollID: "roll-2", DemandLineID: "line-2"}},
		},
		GeometryLayoutSummary: &models.RawMaterialBatchOptimizerGeometryLayoutSummary{
			CanvasWidthMM:  100,
			CanvasHeightMM: 100,
			Zones:          []models.RawMaterialBatchOptimizerGeometryLayoutZone{{ID: "geo-zone-2", RollID: "roll-2", DemandLineID: "line-2", PolygonPoints: []models.RawMaterialBatchOptimizerGeometryPoint{{X: 20, Y: 0}, {X: 30, Y: 0}, {X: 30, Y: 10}, {X: 20, Y: 10}}}},
		},
	}

	diffSummary := buildRawMaterialBatchOptimizerPlanDiffSummary(plan, baseline)
	require.Equal(t, []string{"geo-zone-2"}, diffSummary.AddedZoneIDs)
	require.Equal(t, []string{"geo-zone-1"}, diffSummary.RemovedZoneIDs)
	require.Contains(t, diffSummary.HighlightZoneIDs, "geo-zone-2")
}
