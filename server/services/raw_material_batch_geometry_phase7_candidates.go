package services

import (
	"fmt"
	"sort"
	"strings"
	"xdfc-server/models"
)

func canSolveRawMaterialBatchOptimizerPhase7Geometry(context rawMaterialBatchOptimizerContext) bool {
	return canSolveRawMaterialBatchOptimizerPhase6Geometry(context)
}

func seedRawMaterialBatchOptimizerPhase7GeometryCandidates(
	context rawMaterialBatchOptimizerContext,
) []rawMaterialBatchOptimizerCandidatePlan {
	if !canSolveRawMaterialBatchOptimizerPhase7Geometry(context) {
		return []rawMaterialBatchOptimizerCandidatePlan{}
	}
	baseCandidates := seedRawMaterialBatchOptimizerPhase6GeometryCandidates(context)
	if len(baseCandidates) == 0 {
		return baseCandidates
	}
	prepared := make([]rawMaterialBatchOptimizerCandidatePlan, 0, len(baseCandidates))
	strategyInputCounts := make(map[string]int)
	for _, candidate := range baseCandidates {
		strategyKey := strings.Replace(candidate.StrategyKey, "phase6-", "phase7-", 1)
		strategyInputCounts[strategyKey] += 1
		explainabilitySummary := enrichRawMaterialBatchOptimizerExplainabilityClusters(candidate.ExplainabilitySummary)
		prepared = append(prepared, rawMaterialBatchOptimizerCandidatePlan{
			Assignments:            candidate.Assignments,
			UnfulfilledLines:       candidate.UnfulfilledLines,
			ConsumedAreaM2:         candidate.ConsumedAreaM2,
			FulfilledSets:          candidate.FulfilledSets,
			FulfilledPieces:        candidate.FulfilledPieces,
			MustFulfillSatisfied:   candidate.MustFulfillSatisfied,
			StrategyKey:            strategyKey,
			Explanation:            buildRawMaterialBatchOptimizerPhase7CandidateExplanation(candidate, context, explainabilitySummary),
			GeometryReuseHitCount:  candidate.GeometryReuseHitCount,
			ReusableResidualAreaM2: candidate.ReusableResidualAreaM2,
			SearchConfig:           candidate.SearchConfig,
			ExplainabilitySummary:  explainabilitySummary,
			GeometryLayoutSummary:  candidate.GeometryLayoutSummary,
		})
	}
	return budgetRawMaterialBatchOptimizerPhase7Candidates(prepared, strategyInputCounts, context)
}

func buildRawMaterialBatchOptimizerPhase7CandidateExplanation(
	candidate rawMaterialBatchOptimizerCandidatePlan,
	context rawMaterialBatchOptimizerContext,
	explainabilitySummary models.RawMaterialBatchOptimizerPlanExplainabilitySummary,
) string {
	parts := []string{candidate.Explanation}
	parts = append(parts, fmt.Sprintf("第七批联动预算：preset=%s / global=%d。", context.SearchConfig.PresetKey, maxInt(context.MaxCandidatePlans, 1)))
	if reasons := explainabilitySummary.PrimaryBreakReasons; len(reasons) > 0 {
		parts = append(parts, "cluster 归因："+strings.Join(reasons, "；"))
	}
	return strings.Join(filterRawMaterialBatchOptimizerNonEmptyStrings(parts), "；")
}

func budgetRawMaterialBatchOptimizerPhase7Candidates(
	candidates []rawMaterialBatchOptimizerCandidatePlan,
	strategyInputCounts map[string]int,
	context rawMaterialBatchOptimizerContext,
) []rawMaterialBatchOptimizerCandidatePlan {
	if len(candidates) == 0 {
		return candidates
	}
	strategyBuckets := make(map[string][]rawMaterialBatchOptimizerCandidatePlan)
	strategyOrder := make([]string, 0)
	for _, candidate := range candidates {
		if _, exists := strategyBuckets[candidate.StrategyKey]; !exists {
			strategyOrder = append(strategyOrder, candidate.StrategyKey)
		}
		strategyBuckets[candidate.StrategyKey] = append(strategyBuckets[candidate.StrategyKey], candidate)
	}
	sort.Strings(strategyOrder)
	globalBudget := maxInt(context.MaxCandidatePlans, 1)
	baseQuota := maxInt(globalBudget/maxInt(len(strategyBuckets), 1), 1)
	targetQuotaByStrategy := make(map[string]int, len(strategyBuckets))
	priorityTotal := 0.0
	strategyPriority := make(map[string]float64, len(strategyBuckets))
	for _, strategyKey := range strategyOrder {
		bucket := strategyBuckets[strategyKey]
		total := 0.0
		for _, candidate := range bucket {
			total += buildRawMaterialBatchOptimizerPhase7PriorityScore(candidate)
		}
		averagePriority := 0.0
		if len(bucket) > 0 {
			averagePriority = total / float64(len(bucket))
		}
		strategyPriority[strategyKey] = averagePriority
		priorityTotal += averagePriority
	}
	remainingBudget := globalBudget
	for _, strategyKey := range strategyOrder {
		targetQuota := baseQuota
		if priorityTotal > 0 {
			share := int((strategyPriority[strategyKey] / priorityTotal) * float64(globalBudget))
			targetQuota = maxInt(share, 1)
		}
		targetQuota = minIntRawMaterialBatchOptimizer(targetQuota, maxInt(strategyInputCounts[strategyKey], 1))
		targetQuotaByStrategy[strategyKey] = targetQuota
		remainingBudget -= targetQuota
	}
	for _, strategyKey := range strategyOrder {
		if remainingBudget <= 0 {
			break
		}
		targetQuotaByStrategy[strategyKey] += 1
		remainingBudget -= 1
	}
	merged := make([]rawMaterialBatchOptimizerCandidatePlan, 0, globalBudget)
	seen := make(map[string]struct{})
	strategyKeptCounts := make(map[string]int, len(strategyBuckets))
	for _, strategyKey := range strategyOrder {
		bucket := append([]rawMaterialBatchOptimizerCandidatePlan(nil), strategyBuckets[strategyKey]...)
		sort.SliceStable(bucket, func(i int, j int) bool {
			leftScore := buildRawMaterialBatchOptimizerPhase7PriorityScore(bucket[i])
			rightScore := buildRawMaterialBatchOptimizerPhase7PriorityScore(bucket[j])
			if leftScore == rightScore {
				return compareRawMaterialBatchOptimizerPhase5CandidateQuality(bucket[i], bucket[j]) < 0
			}
			return leftScore > rightScore
		})
		kept := 0
		for _, candidate := range bucket {
			if kept >= targetQuotaByStrategy[strategyKey] || len(merged) >= globalBudget {
				break
			}
			signature := buildRawMaterialBatchOptimizerPhase7BudgetSignature(candidate)
			if _, exists := seen[signature]; exists {
				continue
			}
			seen[signature] = struct{}{}
			candidate.BudgetRerankReason = buildRawMaterialBatchOptimizerPhase7RerankReason(candidate)
			merged = append(merged, candidate)
			kept += 1
			strategyKeptCounts[strategyKey] += 1
		}
	}
	if len(merged) < globalBudget {
		remainingCandidates := append([]rawMaterialBatchOptimizerCandidatePlan(nil), candidates...)
		sort.SliceStable(remainingCandidates, func(i int, j int) bool {
			leftScore := buildRawMaterialBatchOptimizerPhase7PriorityScore(remainingCandidates[i])
			rightScore := buildRawMaterialBatchOptimizerPhase7PriorityScore(remainingCandidates[j])
			if leftScore == rightScore {
				return compareRawMaterialBatchOptimizerPhase5CandidateQuality(remainingCandidates[i], remainingCandidates[j]) < 0
			}
			return leftScore > rightScore
		})
		for _, candidate := range remainingCandidates {
			if len(merged) >= globalBudget {
				break
			}
			signature := buildRawMaterialBatchOptimizerPhase7BudgetSignature(candidate)
			if _, exists := seen[signature]; exists {
				continue
			}
			seen[signature] = struct{}{}
			candidate.BudgetRerankReason = buildRawMaterialBatchOptimizerPhase7RerankReason(candidate)
			merged = append(merged, candidate)
			strategyKeptCounts[candidate.StrategyKey] += 1
		}
	}
	dynamicStats := buildRawMaterialBatchOptimizerPhase7DynamicStrategyStats(strategyBuckets, strategyInputCounts, targetQuotaByStrategy, strategyKeptCounts)
	budgetSummary := buildRawMaterialBatchOptimizerPhase7CandidateBudgetSummary(strategyInputCounts, strategyKeptCounts, baseQuota, globalBudget, len(merged), dynamicStats)
	for index := range merged {
		merged[index].CandidateBudgetSummary = budgetSummary
		if strings.TrimSpace(merged[index].BudgetRerankReason) == "" {
			merged[index].BudgetRerankReason = buildRawMaterialBatchOptimizerPhase7RerankReason(merged[index])
		}
	}
	return merged
}
