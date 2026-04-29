package services

import (
	"testing"
	"xdfc-server/models"

	"github.com/stretchr/testify/require"
)

func buildRawMaterialBatchOptimizerPhase2TestContext() rawMaterialBatchOptimizerContext {
	return buildRawMaterialBatchOptimizerContext("req-phase2", models.RawMaterialBatchOptimizerSolveRequest{
		Rolls: []models.RawMaterialBatchOptimizerRollInput{
			{
				RollID:          "roll-1",
				PrepregSpecID:   "prepreg-1",
				RollWidthMM:     220,
				RollLengthM:     0.5,
				RemainingAreaM2: 0.11,
				EdgeTrimMM:      0,
				Status:          "Active",
			},
		},
		DemandLines: []models.RawMaterialBatchOptimizerDemandLineInput{
			{
				DemandLineID:     "line-1",
				CutSizeUnitID:    "unit-1",
				WidthMM:          40,
				LengthMM:         40,
				PieceCountPerSet: 1,
				RequiredSets:     2,
				RequiredPieces:   2,
				LayupCount:       1,
				CutAngle:         45,
				UsageType:        "default",
				Priority:         3,
				AllowMixedPlan:   true,
				MustFulfill:      true,
			},
			{
				DemandLineID:     "line-2",
				CutSizeUnitID:    "unit-2",
				WidthMM:          30,
				LengthMM:         50,
				PieceCountPerSet: 1,
				RequiredSets:     1,
				RequiredPieces:   1,
				LayupCount:       1,
				CutAngle:         0,
				UsageType:        "default",
				Priority:         1,
				AllowMixedPlan:   true,
				MustFulfill:      false,
			},
		},
		KnifeGapMM:        5,
		DefaultEdgeTrimMM: 0,
		ObjectivePreset:   "yield-first",
		MaxCandidatePlans: 3,
		TimeLimitMs:       2000,
	})
}

func TestBuildRawMaterialBatchOptimizerPhase1GeometryCandidateBuildsPolygonLayout(t *testing.T) {
	context := buildRawMaterialBatchOptimizerContext("req-phase1", models.RawMaterialBatchOptimizerSolveRequest{
		Rolls: []models.RawMaterialBatchOptimizerRollInput{
			{
				RollID:          "roll-1",
				PrepregSpecID:   "prepreg-1",
				RollWidthMM:     200,
				RollLengthM:     0.2,
				RemainingAreaM2: 0.04,
				EdgeTrimMM:      0,
				Status:          "Active",
			},
		},
		DemandLines: []models.RawMaterialBatchOptimizerDemandLineInput{
			{
				DemandLineID:     "line-1",
				CutSizeUnitID:    "unit-1",
				WidthMM:          40,
				LengthMM:         40,
				PieceCountPerSet: 1,
				RequiredSets:     2,
				RequiredPieces:   2,
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

	require.True(t, canSolveRawMaterialBatchOptimizerPhase1Geometry(context))
	candidate := buildRawMaterialBatchOptimizerPhase1GeometryCandidate(context)
	require.NotNil(t, candidate.GeometryLayoutSummary)
	require.Len(t, candidate.Assignments, 1)
	require.Equal(t, 2, candidate.Assignments[0].AllocatedSets)

	pieceZones := 0
	residualZones := 0
	for _, zone := range candidate.GeometryLayoutSummary.Zones {
		require.NotEmpty(t, zone.PolygonPoints)
		if zone.Kind == "piece" {
			pieceZones += 1
		}
		if zone.UsageCategory == "residual" {
			residualZones += 1
		}
	}

	require.GreaterOrEqual(t, pieceZones, 2)
	require.Greater(t, residualZones, 0)
}

func TestSeedRawMaterialBatchOptimizerPhase2GeometryCandidatesBuildsMultiDemandPolygonLayout(t *testing.T) {
	context := buildRawMaterialBatchOptimizerPhase2TestContext()

	require.True(t, canSolveRawMaterialBatchOptimizerPhase2Geometry(context))
	candidates := seedRawMaterialBatchOptimizerPhase2GeometryCandidates(context)
	require.NotEmpty(t, candidates)

	topCandidate := candidates[0]
	require.NotNil(t, topCandidate.GeometryLayoutSummary)
	require.GreaterOrEqual(t, len(topCandidate.Assignments), 2)

	demandLineIDs := make(map[string]struct{})
	for _, assignment := range topCandidate.Assignments {
		demandLineIDs[assignment.DemandLineID] = struct{}{}
	}
	_, hasLine1 := demandLineIDs["line-1"]
	_, hasLine2 := demandLineIDs["line-2"]
	require.True(t, hasLine1)
	require.True(t, hasLine2)

	geometryDemandLineIDs := make(map[string]struct{})
	for _, zone := range topCandidate.GeometryLayoutSummary.Zones {
		if zone.DemandLineID != "" {
			geometryDemandLineIDs[zone.DemandLineID] = struct{}{}
		}
	}
	_, hasGeometryLine1 := geometryDemandLineIDs["line-1"]
	_, hasGeometryLine2 := geometryDemandLineIDs["line-2"]
	require.True(t, hasGeometryLine1)
	require.True(t, hasGeometryLine2)
}

func TestBuildRawMaterialBatchOptimizerPhase2GeometryPlacementRespectsNoMixRule(t *testing.T) {
	context := buildRawMaterialBatchOptimizerContext("req-phase2-no-mix", models.RawMaterialBatchOptimizerSolveRequest{
		Rolls: []models.RawMaterialBatchOptimizerRollInput{
			{
				RollID:          "roll-1",
				PrepregSpecID:   "prepreg-1",
				RollWidthMM:     220,
				RollLengthM:     0.4,
				RemainingAreaM2: 0.088,
				EdgeTrimMM:      0,
				Status:          "Active",
			},
		},
		DemandLines: []models.RawMaterialBatchOptimizerDemandLineInput{
			{
				DemandLineID:     "line-no-mix",
				CutSizeUnitID:    "unit-1",
				WidthMM:          40,
				LengthMM:         40,
				PieceCountPerSet: 1,
				RequiredSets:     1,
				RequiredPieces:   1,
				LayupCount:       1,
				CutAngle:         45,
				UsageType:        "default",
				Priority:         5,
				AllowMixedPlan:   false,
				MustFulfill:      true,
			},
			{
				DemandLineID:     "line-other",
				CutSizeUnitID:    "unit-2",
				WidthMM:          30,
				LengthMM:         30,
				PieceCountPerSet: 1,
				RequiredSets:     1,
				RequiredPieces:   1,
				LayupCount:       1,
				CutAngle:         0,
				UsageType:        "default",
				Priority:         1,
				AllowMixedPlan:   true,
				MustFulfill:      false,
			},
		},
		KnifeGapMM:        0,
		DefaultEdgeTrimMM: 0,
		ObjectivePreset:   "yield-first",
		MaxCandidatePlans: 3,
		TimeLimitMs:       2000,
	})

	ordered := cloneRawMaterialBatchOptimizerDemandLines(context.DemandLines)
	result := buildRawMaterialBatchOptimizerPhase2GeometryPlacement(context, ordered)
	require.Len(t, result.Assignments, 1)
	require.Equal(t, "line-no-mix", result.Assignments[0].DemandLineID)
	require.Len(t, result.UnfulfilledLines, 1)
	require.Equal(t, "line-other", result.UnfulfilledLines[0].DemandLineID)
}

func TestBuildRawMaterialBatchOptimizerPlanLayoutSummaryIncludesGeometryZoneIdsForDemand(t *testing.T) {
	context := buildRawMaterialBatchOptimizerPhase2TestContext()
	candidate := seedRawMaterialBatchOptimizerPhase2GeometryCandidates(context)[0]
	summary := buildRawMaterialBatchOptimizerPlanLayoutSummary(candidate, context)

	require.NotEmpty(t, summary.DemandLines)
	for _, demandLine := range summary.DemandLines {
		require.NotEmpty(t, demandLine.ZoneIDs)
		hasGeometryZone := false
		for _, zoneID := range demandLine.ZoneIDs {
			if len(zoneID) >= 4 && zoneID[:4] == "geo-" {
				hasGeometryZone = true
				break
			}
		}
		require.True(t, hasGeometryZone)
	}
}

func TestBuildRawMaterialBatchOptimizerPhase2GeometryPlacementPrioritizesMustFulfillAndPriority(t *testing.T) {
	context := buildRawMaterialBatchOptimizerContext("req-phase2-priority", models.RawMaterialBatchOptimizerSolveRequest{
		Rolls: []models.RawMaterialBatchOptimizerRollInput{
			{
				RollID:          "roll-1",
				PrepregSpecID:   "prepreg-1",
				RollWidthMM:     80,
				RollLengthM:     0.08,
				RemainingAreaM2: 0.0064,
				EdgeTrimMM:      0,
				Status:          "Active",
			},
		},
		DemandLines: []models.RawMaterialBatchOptimizerDemandLineInput{
			{
				DemandLineID:     "line-must",
				CutSizeUnitID:    "unit-1",
				WidthMM:          40,
				LengthMM:         40,
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
			{
				DemandLineID:     "line-normal",
				CutSizeUnitID:    "unit-2",
				WidthMM:          40,
				LengthMM:         40,
				PieceCountPerSet: 1,
				RequiredSets:     1,
				RequiredPieces:   1,
				LayupCount:       1,
				CutAngle:         45,
				UsageType:        "default",
				Priority:         10,
				AllowMixedPlan:   true,
				MustFulfill:      false,
			},
		},
		KnifeGapMM:        5,
		DefaultEdgeTrimMM: 0,
		ObjectivePreset:   "yield-first",
		MaxCandidatePlans: 3,
		TimeLimitMs:       2000,
	})

	candidates := seedRawMaterialBatchOptimizerPhase2GeometryCandidates(context)
	require.NotEmpty(t, candidates)
	require.NotEmpty(t, candidates[0].Assignments)
	require.Equal(t, "line-must", candidates[0].Assignments[0].DemandLineID)
	require.Len(t, candidates[0].UnfulfilledLines, 1)
	require.Equal(t, "line-normal", candidates[0].UnfulfilledLines[0].DemandLineID)
	require.True(t, candidates[0].MustFulfillSatisfied)
}
