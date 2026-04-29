package services

import (
	"fmt"
	"sort"
	"strings"
	"xdfc-server/models"
)

func canSolveRawMaterialBatchOptimizerPhase6Geometry(context rawMaterialBatchOptimizerContext) bool {
	return canSolveRawMaterialBatchOptimizerPhase5Geometry(context)
}

func seedRawMaterialBatchOptimizerPhase6GeometryCandidates(
	context rawMaterialBatchOptimizerContext,
) []rawMaterialBatchOptimizerCandidatePlan {
	if !canSolveRawMaterialBatchOptimizerPhase6Geometry(context) {
		return []rawMaterialBatchOptimizerCandidatePlan{}
	}
	baseCandidates := seedRawMaterialBatchOptimizerPhase5GeometryCandidates(context)
	if len(baseCandidates) == 0 {
		return baseCandidates
	}
	prepared := make([]rawMaterialBatchOptimizerCandidatePlan, 0, len(baseCandidates))
	strategyInputCounts := make(map[string]int)
	for _, candidate := range baseCandidates {
		strategyKey := strings.Replace(candidate.StrategyKey, "phase5-", "phase6-", 1)
		strategyInputCounts[strategyKey] += 1
		explainabilitySummary := enrichRawMaterialBatchOptimizerExplainabilitySummary(candidate.ExplainabilitySummary, candidate)
		prepared = append(prepared, rawMaterialBatchOptimizerCandidatePlan{
			Assignments:            candidate.Assignments,
			UnfulfilledLines:       candidate.UnfulfilledLines,
			ConsumedAreaM2:         candidate.ConsumedAreaM2,
			FulfilledSets:          candidate.FulfilledSets,
			FulfilledPieces:        candidate.FulfilledPieces,
			MustFulfillSatisfied:   candidate.MustFulfillSatisfied,
			StrategyKey:            strategyKey,
			Explanation:            buildRawMaterialBatchOptimizerPhase6CandidateExplanation(candidate, context, explainabilitySummary),
			GeometryReuseHitCount:  candidate.GeometryReuseHitCount,
			ReusableResidualAreaM2: candidate.ReusableResidualAreaM2,
			SearchConfig:           candidate.SearchConfig,
			ExplainabilitySummary:  explainabilitySummary,
			GeometryLayoutSummary:  candidate.GeometryLayoutSummary,
		})
	}
	return budgetRawMaterialBatchOptimizerPhase6Candidates(prepared, strategyInputCounts, context)
}

func buildRawMaterialBatchOptimizerPhase6CandidateExplanation(
	candidate rawMaterialBatchOptimizerCandidatePlan,
	context rawMaterialBatchOptimizerContext,
	explainabilitySummary models.RawMaterialBatchOptimizerPlanExplainabilitySummary,
) string {
	parts := []string{candidate.Explanation}
	parts = append(parts, fmt.Sprintf("第六批预算策略：preset=%s / global=%d。", context.SearchConfig.PresetKey, maxInt(context.MaxCandidatePlans, 1)))
	if reasons := explainabilitySummary.PrimaryBreakReasons; len(reasons) > 0 {
		parts = append(parts, "位置级归因："+strings.Join(reasons, "；"))
	}
	return strings.Join(filterRawMaterialBatchOptimizerNonEmptyStrings(parts), "；")
}

func budgetRawMaterialBatchOptimizerPhase6Candidates(
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
	perStrategyQuota := maxInt(globalBudget/maxInt(len(strategyBuckets), 1), 1)
	merged := make([]rawMaterialBatchOptimizerCandidatePlan, 0, globalBudget)
	seenBudgetSignatures := make(map[string]struct{})
	strategyKeptCounts := make(map[string]int)
	for _, strategyKey := range strategyOrder {
		bucket := append([]rawMaterialBatchOptimizerCandidatePlan(nil), strategyBuckets[strategyKey]...)
		sort.SliceStable(bucket, func(i int, j int) bool {
			return compareRawMaterialBatchOptimizerPhase5CandidateQuality(bucket[i], bucket[j]) < 0
		})
		keptForStrategy := 0
		for _, candidate := range bucket {
			if keptForStrategy >= perStrategyQuota {
				break
			}
			signature := buildRawMaterialBatchOptimizerPhase6BudgetSignature(candidate)
			if _, exists := seenBudgetSignatures[signature]; exists {
				continue
			}
			seenBudgetSignatures[signature] = struct{}{}
			merged = append(merged, candidate)
			keptForStrategy += 1
			strategyKeptCounts[strategyKey] += 1
			if len(merged) >= globalBudget {
				break
			}
		}
		if len(merged) >= globalBudget {
			break
		}
	}
	if len(merged) < globalBudget {
		remaining := append([]rawMaterialBatchOptimizerCandidatePlan(nil), candidates...)
		sort.SliceStable(remaining, func(i int, j int) bool {
			return compareRawMaterialBatchOptimizerPhase5CandidateQuality(remaining[i], remaining[j]) < 0
		})
		for _, candidate := range remaining {
			if len(merged) >= globalBudget {
				break
			}
			signature := buildRawMaterialBatchOptimizerPhase6BudgetSignature(candidate)
			if _, exists := seenBudgetSignatures[signature]; exists {
				continue
			}
			seenBudgetSignatures[signature] = struct{}{}
			merged = append(merged, candidate)
			strategyKeptCounts[candidate.StrategyKey] += 1
		}
	}
	budgetSummary := buildRawMaterialBatchOptimizerCandidateBudgetSummary(strategyInputCounts, strategyKeptCounts, perStrategyQuota, globalBudget, len(merged))
	for index := range merged {
		merged[index].CandidateBudgetSummary = budgetSummary
	}
	return merged
}
