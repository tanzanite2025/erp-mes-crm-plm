package services

import (
	"fmt"
	"sort"
	"strings"
	"xdfc-server/models"
)

func canSolveRawMaterialBatchOptimizerPhase5Geometry(context rawMaterialBatchOptimizerContext) bool {
	return canSolveRawMaterialBatchOptimizerPhase4Geometry(context)
}

func seedRawMaterialBatchOptimizerPhase5GeometryCandidates(
	context rawMaterialBatchOptimizerContext,
) []rawMaterialBatchOptimizerCandidatePlan {
	if !canSolveRawMaterialBatchOptimizerPhase5Geometry(context) {
		return []rawMaterialBatchOptimizerCandidatePlan{}
	}
	baseCandidates := seedRawMaterialBatchOptimizerPhase4GeometryCandidates(context)
	if len(baseCandidates) == 0 {
		return baseCandidates
	}
	prepared := make([]rawMaterialBatchOptimizerCandidatePlan, 0, len(baseCandidates))
	for _, candidate := range baseCandidates {
		preparedCandidate := candidate
		preparedCandidate.StrategyKey = strings.Replace(candidate.StrategyKey, "phase4-", "phase5-", 1)
		preparedCandidate.Explanation = buildRawMaterialBatchOptimizerPhase5CandidateExplanation(candidate, context)
		preparedCandidate.SearchConfig = toRawMaterialBatchOptimizerSearchConfigSummary(context.SearchConfig)
		preparedCandidate.ExplainabilitySummary = buildRawMaterialBatchOptimizerExplainabilitySummary(preparedCandidate, context)
		prepared = append(prepared, preparedCandidate)
	}
	return convergeRawMaterialBatchOptimizerPhase5Candidates(prepared, context)
}

func buildRawMaterialBatchOptimizerPhase5CandidateExplanation(
	candidate rawMaterialBatchOptimizerCandidatePlan,
	context rawMaterialBatchOptimizerContext,
) string {
	parts := []string{candidate.Explanation}
	parts = append(parts, fmt.Sprintf("第五批搜索参数：preset=%s / beam=%d / depth=%d / branch=%d。", context.SearchConfig.PresetKey, context.SearchConfig.BeamWidth, context.SearchConfig.MaxSearchDepth, context.SearchConfig.PerDemandBranchingLimit))
	explainabilitySummary := buildRawMaterialBatchOptimizerExplainabilitySummary(candidate, context)
	if len(explainabilitySummary.PrimaryBreakReasons) > 0 {
		parts = append(parts, "连续段诊断："+strings.Join(explainabilitySummary.PrimaryBreakReasons, "；"))
	}
	return strings.Join(filterRawMaterialBatchOptimizerNonEmptyStrings(parts), "；")
}

func convergeRawMaterialBatchOptimizerPhase5Candidates(
	candidates []rawMaterialBatchOptimizerCandidatePlan,
	context rawMaterialBatchOptimizerContext,
) []rawMaterialBatchOptimizerCandidatePlan {
	if len(candidates) == 0 {
		return candidates
	}
	grouped := make(map[string]rawMaterialBatchOptimizerCandidatePlan)
	orderedKeys := make([]string, 0, len(candidates))
	for _, candidate := range candidates {
		signature := buildRawMaterialBatchOptimizerPhase5CandidateConvergenceSignature(candidate, context.SearchConfig)
		existing, exists := grouped[signature]
		if !exists {
			grouped[signature] = candidate
			orderedKeys = append(orderedKeys, signature)
			continue
		}
		if compareRawMaterialBatchOptimizerPhase5CandidateQuality(candidate, existing) < 0 {
			grouped[signature] = candidate
		}
	}
	converged := make([]rawMaterialBatchOptimizerCandidatePlan, 0, len(grouped))
	for _, key := range orderedKeys {
		converged = append(converged, grouped[key])
	}
	sort.SliceStable(converged, func(i int, j int) bool {
		return compareRawMaterialBatchOptimizerPhase5CandidateQuality(converged[i], converged[j]) < 0
	})
	limit := maxInt(context.MaxCandidatePlans, 1)
	if len(converged) > limit {
		converged = converged[:limit]
	}
	return converged
}

func buildRawMaterialBatchOptimizerPhase5CandidateConvergenceSignature(
	candidate rawMaterialBatchOptimizerCandidatePlan,
	config rawMaterialBatchOptimizerSearchConfig,
) string {
	parts := []string{buildRawMaterialBatchOptimizerCandidateSignature(candidate)}
	parts = append(parts, fmt.Sprintf("reuse:%d", candidate.GeometryReuseHitCount))
	bucketSize := maxFloat64(config.ConvergenceAreaBucketM2, 0.0001)
	bucket := int(candidate.ReusableResidualAreaM2 / bucketSize)
	parts = append(parts, fmt.Sprintf("residual-bucket:%d", bucket))
	parts = append(parts, fmt.Sprintf("break:%s", strings.Join(candidate.ExplainabilitySummary.PrimaryBreakReasons, ",")))
	return strings.Join(parts, "|")
}

func compareRawMaterialBatchOptimizerPhase5CandidateQuality(
	left rawMaterialBatchOptimizerCandidatePlan,
	right rawMaterialBatchOptimizerCandidatePlan,
) int {
	if left.FulfilledPieces != right.FulfilledPieces {
		if left.FulfilledPieces > right.FulfilledPieces {
			return -1
		}
		return 1
	}
	leftBreaks := countRawMaterialBatchOptimizerPhase5BrokenSegments(left.ExplainabilitySummary)
	rightBreaks := countRawMaterialBatchOptimizerPhase5BrokenSegments(right.ExplainabilitySummary)
	if leftBreaks != rightBreaks {
		if leftBreaks < rightBreaks {
			return -1
		}
		return 1
	}
	if left.GeometryReuseHitCount != right.GeometryReuseHitCount {
		if left.GeometryReuseHitCount > right.GeometryReuseHitCount {
			return -1
		}
		return 1
	}
	if left.ReusableResidualAreaM2 != right.ReusableResidualAreaM2 {
		if left.ReusableResidualAreaM2 > right.ReusableResidualAreaM2 {
			return -1
		}
		return 1
	}
	if len(left.UnfulfilledLines) != len(right.UnfulfilledLines) {
		if len(left.UnfulfilledLines) < len(right.UnfulfilledLines) {
			return -1
		}
		return 1
	}
	if len(left.Assignments) != len(right.Assignments) {
		if len(left.Assignments) < len(right.Assignments) {
			return -1
		}
		return 1
	}
	if left.StrategyKey < right.StrategyKey {
		return -1
	}
	if left.StrategyKey > right.StrategyKey {
		return 1
	}
	return 0
}

func countRawMaterialBatchOptimizerPhase5BrokenSegments(
	summary models.RawMaterialBatchOptimizerPlanExplainabilitySummary,
) int {
	count := 0
	for _, segment := range append(append(summary.GroupSegments, summary.SequenceSegments...), summary.AdjacencySegments...) {
		if !segment.Preserved {
			count += 1
		}
	}
	return count
}

func filterRawMaterialBatchOptimizerNonEmptyStrings(values []string) []string {
	result := make([]string, 0, len(values))
	for _, value := range values {
		trimmed := strings.TrimSpace(value)
		if trimmed == "" {
			continue
		}
		result = append(result, trimmed)
	}
	return result
}
