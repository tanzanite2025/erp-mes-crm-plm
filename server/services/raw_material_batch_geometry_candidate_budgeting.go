package services

import (
	"sort"
	"strings"
	"xdfc-server/models"
)

func buildRawMaterialBatchOptimizerCandidateBudgetSummary(
	strategyInputCounts map[string]int,
	strategyKeptCounts map[string]int,
	perStrategyQuota int,
	globalBudget int,
	mergedCandidateCount int,
) models.RawMaterialBatchOptimizerCandidateBudgetSummary {
	keys := make([]string, 0, len(strategyInputCounts))
	for key := range strategyInputCounts {
		keys = append(keys, key)
	}
	sort.Strings(keys)
	stats := make([]models.RawMaterialBatchOptimizerStrategyBudgetStat, 0, len(keys))
	for _, key := range keys {
		stats = append(stats, models.RawMaterialBatchOptimizerStrategyBudgetStat{
			StrategyKey: key,
			InputCount:  strategyInputCounts[key],
			KeptCount:   strategyKeptCounts[key],
		})
	}
	return models.RawMaterialBatchOptimizerCandidateBudgetSummary{
		PerStrategyQuota:     perStrategyQuota,
		GlobalBudget:         globalBudget,
		MergedCandidateCount: mergedCandidateCount,
		StrategyStats:        stats,
	}
}

func buildRawMaterialBatchOptimizerPhase6BudgetSignature(candidate rawMaterialBatchOptimizerCandidatePlan) string {
	parts := []string{
		buildRawMaterialBatchOptimizerPhase5CandidateConvergenceSignature(candidate, rawMaterialBatchOptimizerSearchConfig{ConvergenceAreaBucketM2: 0.001}),
		strings.Join(candidate.ExplainabilitySummary.PrimaryBreakReasons, ","),
	}
	if len(candidate.ExplainabilitySummary.HeatZoneAttributions) > 0 {
		zoneIDs := make([]string, 0, len(candidate.ExplainabilitySummary.HeatZoneAttributions))
		for _, attribution := range candidate.ExplainabilitySummary.HeatZoneAttributions {
			zoneIDs = append(zoneIDs, attribution.ZoneID)
		}
		sort.Strings(zoneIDs)
		if len(zoneIDs) > 6 {
			zoneIDs = zoneIDs[:6]
		}
		parts = append(parts, strings.Join(zoneIDs, ","))
	}
	return strings.Join(parts, "|")
}
