package services

import (
	"fmt"
	"strings"
	"xdfc-server/models"
)

type rawMaterialBatchOptimizerPlanScore struct {
	Score              float64
	UtilizationPercent float64
	LossAreaM2         float64
	Explanation        string
	ScoreBreakdown     models.RawMaterialBatchOptimizerPlanScoreBreakdown
}

func scoreRawMaterialBatchOptimizerPlan(
	candidate rawMaterialBatchOptimizerCandidatePlan,
	context rawMaterialBatchOptimizerContext,
) rawMaterialBatchOptimizerPlanScore {
	utilizationPercent := 0.0
	if context.TotalRollAreaM2 > 0 {
		utilizationPercent = roundRawMaterialBatchOptimizer((candidate.ConsumedAreaM2/context.TotalRollAreaM2)*100, 2)
	}

	lossAreaM2 := roundRawMaterialBatchOptimizer(maxFloat64(context.TotalRollAreaM2-candidate.ConsumedAreaM2, 0), 3)
	fulfilledRate := float64(candidate.FulfilledPieces) / float64(maxInt(context.TotalRequiredPieces, 1))
	weights := context.ScoreWeights
	groupSplitCount := countRawMaterialBatchOptimizerGroupSplitViolations(candidate, context)
	sequenceViolationCount := countRawMaterialBatchOptimizerSequenceViolations(candidate, context)
	adjacencyBreakCount := countRawMaterialBatchOptimizerAdjacencyBreaks(candidate, context)
	directionSwitchCount := countRawMaterialBatchOptimizerDirectionSwitches(candidate, context)
	mixViolationCount := countRawMaterialBatchOptimizerMixViolations(candidate, context)
	rollSwitchCount := countRawMaterialBatchOptimizerRollSwitches(candidate)
	geometryFragmentCount := countRawMaterialBatchOptimizerGeometryFragments(candidate)
	structuredAssignmentPenaltyCount := sequenceViolationCount + adjacencyBreakCount + directionSwitchCount + mixViolationCount + rollSwitchCount + geometryFragmentCount
	assignmentPenalty := float64(len(candidate.Assignments)+structuredAssignmentPenaltyCount) * weights.AssignmentPenaltyWeight
	geometryReuseRelief := minFloat64(
		float64(candidate.GeometryReuseHitCount)*weights.AssignmentPenaltyWeight*0.5+candidate.ReusableResidualAreaM2*10,
		assignmentPenalty*0.35,
	)
	assignmentPenalty = maxFloat64(assignmentPenalty-geometryReuseRelief, 0)
	unfulfilledPenalty := float64(len(candidate.UnfulfilledLines)) * weights.UnfulfilledPenaltyWeight
	splitPenalty := float64(countRawMaterialBatchOptimizerSplitDemands(candidate)+groupSplitCount) * weights.SplitPenaltyWeight
	stabilityScore := maxFloat64(100-(assignmentPenalty+unfulfilledPenalty+splitPenalty), 0)
	mustFulfillPenalty := 0.0
	if context.HasMustFulfill && !candidate.MustFulfillSatisfied {
		mustFulfillPenalty = weights.MustPenaltyWeight
	}

	fulfilledContribution := fulfilledRate * weights.FulfilledWeight * 100
	utilizationContribution := (utilizationPercent / 100) * weights.UtilizationWeight * 100
	stabilityContribution := (stabilityScore / 100) * weights.StabilityWeight * 100
	scoreBase := fulfilledContribution + utilizationContribution + stabilityContribution
	score := roundRawMaterialBatchOptimizer(maxFloat64(scoreBase-mustFulfillPenalty, 0), 2)
	breakdown := models.RawMaterialBatchOptimizerPlanScoreBreakdown{
		ObjectivePreset:         context.ObjectivePreset,
		AppliedWeights:          weights,
		FulfilledRatePercent:    roundRawMaterialBatchOptimizer(fulfilledRate*100, 2),
		FulfilledContribution:   roundRawMaterialBatchOptimizer(fulfilledContribution, 2),
		UtilizationContribution: roundRawMaterialBatchOptimizer(utilizationContribution, 2),
		StabilityContribution:   roundRawMaterialBatchOptimizer(stabilityContribution, 2),
		AssignmentPenalty:       roundRawMaterialBatchOptimizer(assignmentPenalty, 2),
		UnfulfilledPenalty:      roundRawMaterialBatchOptimizer(unfulfilledPenalty, 2),
		SplitPenalty:            roundRawMaterialBatchOptimizer(splitPenalty, 2),
		MustFulfillPenalty:      roundRawMaterialBatchOptimizer(mustFulfillPenalty, 2),
		GroupSplitCount:         groupSplitCount,
		SequenceViolationCount:  sequenceViolationCount,
		AdjacencyBreakCount:     adjacencyBreakCount,
		DirectionSwitchCount:    directionSwitchCount,
		MixViolationCount:       mixViolationCount,
		RollSwitchCount:         rollSwitchCount,
		GeometryReuseHitCount:   candidate.GeometryReuseHitCount,
		ReusableResidualAreaM2:  roundRawMaterialBatchOptimizer(candidate.ReusableResidualAreaM2, 6),
		FinalScore:              score,
	}

	return rawMaterialBatchOptimizerPlanScore{
		Score:              score,
		UtilizationPercent: utilizationPercent,
		LossAreaM2:         lossAreaM2,
		Explanation: buildRawMaterialBatchOptimizerScoreExplanation(
			candidate,
			context,
			utilizationPercent,
			groupSplitCount,
			sequenceViolationCount,
			adjacencyBreakCount,
			directionSwitchCount,
			mixViolationCount,
			rollSwitchCount,
			candidate.GeometryReuseHitCount,
			candidate.ReusableResidualAreaM2,
			geometryFragmentCount,
		),
		ScoreBreakdown: breakdown,
	}
}

func buildRawMaterialBatchOptimizerScoreExplanation(
	candidate rawMaterialBatchOptimizerCandidatePlan,
	context rawMaterialBatchOptimizerContext,
	utilizationPercent float64,
	groupSplitCount int,
	sequenceViolationCount int,
	adjacencyBreakCount int,
	directionSwitchCount int,
	mixViolationCount int,
	rollSwitchCount int,
	geometryReuseHitCount int,
	reusableResidualAreaM2 float64,
	geometryFragmentCount int,
) string {
	parts := []string{
		fmt.Sprintf("满足件数 %d/%d", candidate.FulfilledPieces, context.TotalRequiredPieces),
		fmt.Sprintf("利用率 %.2f%%", utilizationPercent),
		fmt.Sprintf("未满足行 %d", len(candidate.UnfulfilledLines)),
	}
	if context.HasStructuredRules {
		ruleParts := make([]string, 0, 4)
		if groupSplitCount > 0 {
			ruleParts = append(ruleParts, fmt.Sprintf("组内拆分 %d", groupSplitCount))
		}
		if sequenceViolationCount > 0 {
			ruleParts = append(ruleParts, fmt.Sprintf("顺序破坏 %d", sequenceViolationCount))
		}
		if adjacencyBreakCount > 0 {
			ruleParts = append(ruleParts, fmt.Sprintf("相邻破坏 %d", adjacencyBreakCount))
		}
		if directionSwitchCount > 0 {
			ruleParts = append(ruleParts, fmt.Sprintf("方向切换 %d", directionSwitchCount))
		}
		if mixViolationCount > 0 {
			ruleParts = append(ruleParts, fmt.Sprintf("禁混冲突 %d", mixViolationCount))
		}
		if rollSwitchCount > 0 {
			ruleParts = append(ruleParts, fmt.Sprintf("多卷切换 %d", rollSwitchCount))
		}
		if geometryReuseHitCount > 0 {
			ruleParts = append(ruleParts, fmt.Sprintf("残料复用 %d", geometryReuseHitCount))
		}
		if reusableResidualAreaM2 > 0 {
			ruleParts = append(ruleParts, fmt.Sprintf("可复用残料 %.6f m2", reusableResidualAreaM2))
		}
		if geometryFragmentCount > 0 {
			ruleParts = append(ruleParts, fmt.Sprintf("几何残片 %d", geometryFragmentCount))
		}
		if len(ruleParts) == 0 {
			ruleParts = append(ruleParts, "结构化规则保持稳定")
		}
		parts = append(parts, strings.Join(ruleParts, "，"))
	}
	return strings.Join(parts, "，") + "。"
}

func countRawMaterialBatchOptimizerAdjacencyBreaks(
	candidate rawMaterialBatchOptimizerCandidatePlan,
	context rawMaterialBatchOptimizerContext,
) int {
	demandLookup := buildRawMaterialBatchOptimizerDemandLookup(context)
	groupRolls := make(map[string]map[string]struct{})
	count := 0
	for _, assignment := range candidate.Assignments {
		demandLine, exists := demandLookup[assignment.DemandLineID]
		if !exists || !demandLine.RequiresAdjacentGrouping {
			continue
		}
		if demandLine.RollGroupKey == "" {
			if assignment.AllocatedSets > 0 && len(candidate.Assignments) > 1 {
				count += 1
			}
			continue
		}
		if groupRolls[demandLine.RollGroupKey] == nil {
			groupRolls[demandLine.RollGroupKey] = make(map[string]struct{})
		}
		groupRolls[demandLine.RollGroupKey][assignment.RollID] = struct{}{}
	}
	for _, rolls := range groupRolls {
		if len(rolls) > 1 {
			count += len(rolls) - 1
		}
	}
	return count
}

func countRawMaterialBatchOptimizerRollSwitches(
	candidate rawMaterialBatchOptimizerCandidatePlan,
) int {
	demandRolls := make(map[string]map[string]struct{}, len(candidate.Assignments))
	for _, assignment := range candidate.Assignments {
		if demandRolls[assignment.DemandLineID] == nil {
			demandRolls[assignment.DemandLineID] = make(map[string]struct{})
		}
		demandRolls[assignment.DemandLineID][assignment.RollID] = struct{}{}
	}
	count := 0
	for _, rolls := range demandRolls {
		if len(rolls) > 1 {
			count += len(rolls) - 1
		}
	}
	return count
}

func countRawMaterialBatchOptimizerGeometryFragments(
	candidate rawMaterialBatchOptimizerCandidatePlan,
) int {
	if candidate.GeometryLayoutSummary == nil {
		return 0
	}
	count := 0
	for _, zone := range candidate.GeometryLayoutSummary.Zones {
		if zone.UsageCategory == "residual" || zone.UsageCategory == "leftover" {
			count += 1
		}
	}
	return count
}

func countRawMaterialBatchOptimizerSplitDemands(candidate rawMaterialBatchOptimizerCandidatePlan) int {
	demandRolls := make(map[string]map[string]struct{}, len(candidate.Assignments))
	for _, assignment := range candidate.Assignments {
		if demandRolls[assignment.DemandLineID] == nil {
			demandRolls[assignment.DemandLineID] = make(map[string]struct{})
		}
		demandRolls[assignment.DemandLineID][assignment.RollID] = struct{}{}
	}
	splitCount := 0
	for _, rolls := range demandRolls {
		if len(rolls) > 1 {
			splitCount += 1
		}
	}
	return splitCount
}

func countRawMaterialBatchOptimizerGroupSplitViolations(
	candidate rawMaterialBatchOptimizerCandidatePlan,
	context rawMaterialBatchOptimizerContext,
) int {
	demandLookup := buildRawMaterialBatchOptimizerDemandLookup(context)
	groupRolls := make(map[string]map[string]struct{})
	for _, assignment := range candidate.Assignments {
		demandLine, exists := demandLookup[assignment.DemandLineID]
		if !exists || demandLine.RollGroupKey == "" {
			continue
		}
		if groupRolls[demandLine.RollGroupKey] == nil {
			groupRolls[demandLine.RollGroupKey] = make(map[string]struct{})
		}
		groupRolls[demandLine.RollGroupKey][assignment.RollID] = struct{}{}
	}
	count := 0
	for _, rolls := range groupRolls {
		if len(rolls) > 1 {
			count += len(rolls) - 1
		}
	}
	return count
}

func countRawMaterialBatchOptimizerSequenceViolations(
	candidate rawMaterialBatchOptimizerCandidatePlan,
	context rawMaterialBatchOptimizerContext,
) int {
	rollAssignments := buildRawMaterialBatchOptimizerAssignmentsByRoll(candidate)
	demandLookup := buildRawMaterialBatchOptimizerDemandLookup(context)
	count := 0
	for _, assignments := range rollAssignments {
		previousSequence := 0
		for _, assignment := range assignments {
			demandLine, exists := demandLookup[assignment.DemandLineID]
			if !exists || demandLine.OrderSequence <= 0 {
				continue
			}
			if previousSequence > 0 && demandLine.OrderSequence < previousSequence {
				count += 1
			}
			previousSequence = demandLine.OrderSequence
		}
	}
	return count
}

func countRawMaterialBatchOptimizerDirectionSwitches(
	candidate rawMaterialBatchOptimizerCandidatePlan,
	context rawMaterialBatchOptimizerContext,
) int {
	rollAssignments := buildRawMaterialBatchOptimizerAssignmentsByRoll(candidate)
	demandLookup := buildRawMaterialBatchOptimizerDemandLookup(context)
	count := 0
	for _, assignments := range rollAssignments {
		previousDirection := ""
		for _, assignment := range assignments {
			demandLine, exists := demandLookup[assignment.DemandLineID]
			if !exists || demandLine.YarnDirectionMode == "" {
				continue
			}
			if previousDirection != "" && demandLine.YarnDirectionMode != previousDirection {
				count += 1
			}
			previousDirection = demandLine.YarnDirectionMode
		}
	}
	return count
}

func countRawMaterialBatchOptimizerMixViolations(
	candidate rawMaterialBatchOptimizerCandidatePlan,
	context rawMaterialBatchOptimizerContext,
) int {
	rollAssignments := buildRawMaterialBatchOptimizerAssignmentsByRoll(candidate)
	demandLookup := buildRawMaterialBatchOptimizerDemandLookup(context)
	count := 0
	for _, assignments := range rollAssignments {
		rollDemandIDs := make(map[string]struct{}, len(assignments))
		for _, assignment := range assignments {
			rollDemandIDs[assignment.DemandLineID] = struct{}{}
		}
		if len(rollDemandIDs) <= 1 {
			continue
		}
		for demandLineID := range rollDemandIDs {
			demandLine, exists := demandLookup[demandLineID]
			if !exists {
				continue
			}
			if demandLine.IsMixRestricted {
				count += 1
			}
		}
	}
	return count
}

func buildRawMaterialBatchOptimizerDemandLookup(
	context rawMaterialBatchOptimizerContext,
) map[string]rawMaterialBatchOptimizerContextDemandLine {
	lookup := make(map[string]rawMaterialBatchOptimizerContextDemandLine, len(context.DemandLines))
	for _, demandLine := range context.DemandLines {
		lookup[demandLine.Input.DemandLineID] = demandLine
	}
	return lookup
}

func buildRawMaterialBatchOptimizerAssignmentsByRoll(
	candidate rawMaterialBatchOptimizerCandidatePlan,
) map[string][]models.RawMaterialBatchOptimizerPlanAssignment {
	rollAssignments := make(map[string][]models.RawMaterialBatchOptimizerPlanAssignment)
	for _, assignment := range candidate.Assignments {
		rollAssignments[assignment.RollID] = append(rollAssignments[assignment.RollID], assignment)
	}
	return rollAssignments
}
