package services

import (
	"testing"
	"xdfc-server/models"

	"github.com/stretchr/testify/require"
)

func TestEnrichRawMaterialBatchOptimizerExplainabilitySummaryBuildsBreakSlicesAndZoneClusters(t *testing.T) {
	candidate := rawMaterialBatchOptimizerCandidatePlan{
		GeometryLayoutSummary: &models.RawMaterialBatchOptimizerGeometryLayoutSummary{
			Zones: []models.RawMaterialBatchOptimizerGeometryLayoutZone{
				{ID: "zone-a", RollID: "roll-1", DemandLineID: "line-a"},
				{ID: "zone-b", RollID: "roll-2", DemandLineID: "line-b"},
			},
		},
	}
	summary := models.RawMaterialBatchOptimizerPlanExplainabilitySummary{
		GroupSegments: []models.RawMaterialBatchOptimizerContinuitySegment{{
			Kind:          "group",
			Key:           "grp-a",
			DemandLineIDs: []string{"line-a", "line-b"},
			Preserved:     false,
			Reason:        "组 grp-a 被拆分到 2 个卷材，连续段被打断。",
		}},
		PrimaryBreakReasons: []string{"组 grp-a 被拆分到 2 个卷材，连续段被打断。"},
	}

	enriched := enrichRawMaterialBatchOptimizerExplainabilitySummary(summary, candidate)
	require.Len(t, enriched.BreakSlices, 1)
	require.Equal(t, "cluster-group-grp-a", enriched.BreakSlices[0].ClusterID)
	require.Len(t, enriched.ZoneClusters, 1)
	require.Equal(t, "cluster-group-grp-a", enriched.ZoneClusters[0].ClusterID)
	require.Equal(t, "cluster-group-grp-a", enriched.HeatZoneAttributions[0].ClusterID)
	require.NotEmpty(t, enriched.HeatZoneAttributions[0].BreakSliceIDs)
}

func TestBudgetRawMaterialBatchOptimizerPhase7CandidatesBuildsDynamicStatsAndRerankReason(t *testing.T) {
	context := rawMaterialBatchOptimizerContext{MaxCandidatePlans: 3}
	candidates := []rawMaterialBatchOptimizerCandidatePlan{
		{
			StrategyKey:           "phase7-a",
			FulfilledPieces:       4,
			GeometryReuseHitCount: 1,
			ExplainabilitySummary: models.RawMaterialBatchOptimizerPlanExplainabilitySummary{ZoneClusters: []models.RawMaterialBatchOptimizerZoneClusterSummary{{ClusterID: "cluster-a", DensityScore: 1.2}}},
			Assignments:           []models.RawMaterialBatchOptimizerPlanAssignment{{RollID: "roll-1", DemandLineID: "line-a", AllocatedSets: 1, AllocatedPieces: 1}},
		},
		{
			StrategyKey:           "phase7-b",
			FulfilledPieces:       2,
			ExplainabilitySummary: models.RawMaterialBatchOptimizerPlanExplainabilitySummary{ZoneClusters: []models.RawMaterialBatchOptimizerZoneClusterSummary{{ClusterID: "cluster-b", DensityScore: 2.6}}},
			Assignments:           []models.RawMaterialBatchOptimizerPlanAssignment{{RollID: "roll-2", DemandLineID: "line-b", AllocatedSets: 1, AllocatedPieces: 1}},
		},
	}

	merged := budgetRawMaterialBatchOptimizerPhase7Candidates(candidates, map[string]int{"phase7-a": 1, "phase7-b": 1}, context)
	require.NotEmpty(t, merged)
	require.NotEmpty(t, merged[0].BudgetRerankReason)
	require.Len(t, merged[0].CandidateBudgetSummary.DynamicStrategyStats, 2)
}
