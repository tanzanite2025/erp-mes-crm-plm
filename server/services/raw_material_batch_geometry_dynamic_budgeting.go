package services

import (
	"fmt"
	"sort"
	"xdfc-server/models"
)

func buildRawMaterialBatchOptimizerPhase7PriorityScore(candidate rawMaterialBatchOptimizerCandidatePlan) float64 {
	brokenSegments := countRawMaterialBatchOptimizerPhase5BrokenSegments(candidate.ExplainabilitySummary)
	clarityPenalty := float64(maxInt(len(candidate.ExplainabilitySummary.PrimaryBreakReasons)-1, 0)) * 4
	densityPenalty := 0.0
	for _, cluster := range candidate.ExplainabilitySummary.ZoneClusters {
		densityPenalty += cluster.DensityScore * 0.8
	}
	priorityScore := float64(candidate.FulfilledPieces)*100 + float64(candidate.GeometryReuseHitCount)*8 + candidate.ReusableResidualAreaM2*40
	priorityScore -= float64(brokenSegments) * 12
	priorityScore -= clarityPenalty
	priorityScore -= densityPenalty
	return roundRawMaterialBatchOptimizer(priorityScore, 2)
}

func buildRawMaterialBatchOptimizerPhase7RerankReason(candidate rawMaterialBatchOptimizerCandidatePlan) string {
	return fmt.Sprintf(
		"fulfilled=%d / broken=%d / cluster=%d / reuse=%d",
		candidate.FulfilledPieces,
		countRawMaterialBatchOptimizerPhase5BrokenSegments(candidate.ExplainabilitySummary),
		len(candidate.ExplainabilitySummary.ZoneClusters),
		candidate.GeometryReuseHitCount,
	)
}

func buildRawMaterialBatchOptimizerPhase7CandidateBudgetSummary(
	strategyInputCounts map[string]int,
	strategyKeptCounts map[string]int,
	perStrategyQuota int,
	globalBudget int,
	mergedCandidateCount int,
	dynamicStrategyStats []models.RawMaterialBatchOptimizerDynamicStrategyBudgetStat,
) models.RawMaterialBatchOptimizerCandidateBudgetSummary {
	summary := buildRawMaterialBatchOptimizerCandidateBudgetSummary(strategyInputCounts, strategyKeptCounts, perStrategyQuota, globalBudget, mergedCandidateCount)
	summary.DynamicStrategyStats = dynamicStrategyStats
	return summary
}

func buildRawMaterialBatchOptimizerPhase7DynamicStrategyStats(
	strategyBuckets map[string][]rawMaterialBatchOptimizerCandidatePlan,
	strategyInputCounts map[string]int,
	targetQuotaByStrategy map[string]int,
	strategyKeptCounts map[string]int,
) []models.RawMaterialBatchOptimizerDynamicStrategyBudgetStat {
	keys := make([]string, 0, len(strategyInputCounts))
	for key := range strategyInputCounts {
		keys = append(keys, key)
	}
	sort.Strings(keys)
	stats := make([]models.RawMaterialBatchOptimizerDynamicStrategyBudgetStat, 0, len(keys))
	for _, key := range keys {
		priorityScore := 0.0
		if bucket := strategyBuckets[key]; len(bucket) > 0 {
			total := 0.0
			for _, candidate := range bucket {
				total += buildRawMaterialBatchOptimizerPhase7PriorityScore(candidate)
			}
			priorityScore = roundRawMaterialBatchOptimizer(total/float64(len(bucket)), 2)
		}
		rerankReason := fmt.Sprintf("targetQuota=%d / priority=%.2f", targetQuotaByStrategy[key], priorityScore)
		stats = append(stats, models.RawMaterialBatchOptimizerDynamicStrategyBudgetStat{
			StrategyKey:   key,
			InputCount:    strategyInputCounts[key],
			TargetQuota:   targetQuotaByStrategy[key],
			KeptCount:     strategyKeptCounts[key],
			PriorityScore: priorityScore,
			RerankReason:  rerankReason,
		})
	}
	return stats
}

func buildRawMaterialBatchOptimizerPhase7BudgetSignature(candidate rawMaterialBatchOptimizerCandidatePlan) string {
	signature := buildRawMaterialBatchOptimizerPhase6BudgetSignature(candidate)
	for _, cluster := range candidate.ExplainabilitySummary.ZoneClusters {
		signature += "|cluster:" + cluster.ClusterID
	}
	return signature
}
