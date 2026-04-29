package services

import (
	"fmt"
	"sort"
	"strings"
	"xdfc-server/models"
)

func buildRawMaterialBatchOptimizerSolveResponse(
	context rawMaterialBatchOptimizerContext,
	candidates []rawMaterialBatchOptimizerCandidatePlan,
) models.RawMaterialBatchOptimizerSolveResponse {
	plans := make([]models.RawMaterialBatchOptimizerPlan, 0, len(candidates))
	for _, candidate := range candidates {
		evaluation := scoreRawMaterialBatchOptimizerPlan(candidate, context)
		explanation := candidate.Explanation
		if evaluation.Explanation != "" {
			if explanation != "" {
				explanation = explanation + "；" + evaluation.Explanation
			} else {
				explanation = evaluation.Explanation
			}
		}
		layoutSummary := buildRawMaterialBatchOptimizerPlanLayoutSummary(candidate, context)
		lossBreakdown := buildRawMaterialBatchOptimizerPlanLossBreakdown(candidate, context, evaluation.LossAreaM2)
		comparisonSummary := buildRawMaterialBatchOptimizerPlanComparisonSummary(candidate, context, layoutSummary, lossBreakdown)
		mustFulfillDiagnostics := buildRawMaterialBatchOptimizerMustFulfillDiagnostics(candidate, context)
		plans = append(plans, models.RawMaterialBatchOptimizerPlan{
			Rank:                   0,
			StrategyKey:            candidate.StrategyKey,
			Score:                  evaluation.Score,
			UtilizationPercent:     evaluation.UtilizationPercent,
			LossAreaM2:             evaluation.LossAreaM2,
			Explanation:            explanation,
			Assignments:            append([]models.RawMaterialBatchOptimizerPlanAssignment(nil), candidate.Assignments...),
			UnfulfilledLines:       append([]models.RawMaterialBatchOptimizerUnfulfilledLine(nil), candidate.UnfulfilledLines...),
			LayoutSummary:          layoutSummary,
			GeometryLayoutSummary:  candidate.GeometryLayoutSummary,
			LossBreakdown:          lossBreakdown,
			ComparisonSummary:      comparisonSummary,
			ScoreBreakdown:         evaluation.ScoreBreakdown,
			MustFulfillDiagnostics: mustFulfillDiagnostics,
			SearchConfig:           candidate.SearchConfig,
			CandidateBudgetSummary: candidate.CandidateBudgetSummary,
			BudgetRerankReason:     candidate.BudgetRerankReason,
			ExplainabilitySummary:  candidate.ExplainabilitySummary,
		})
	}

	sort.SliceStable(plans, func(i, j int) bool {
		if plans[i].Score == plans[j].Score {
			if plans[i].UtilizationPercent == plans[j].UtilizationPercent {
				return plans[i].LossAreaM2 < plans[j].LossAreaM2
			}
			return plans[i].UtilizationPercent > plans[j].UtilizationPercent
		}
		return plans[i].Score > plans[j].Score
	})

	for index := range plans {
		plans[index].Rank = index + 1
	}
	if len(plans) > 0 {
		baselinePlan := plans[0]
		for index := range plans {
			plans[index].DiffSummary = buildRawMaterialBatchOptimizerPlanDiffSummary(plans[index], baselinePlan)
			plans[index].DiffSummaries = buildRawMaterialBatchOptimizerPlanDiffSummaries(plans[index], plans)
			plans[index].ReportSummary = buildRawMaterialBatchOptimizerPlanReportSummary(plans[index], plans[index].DiffSummary)
		}
	}

	solverStatus, message := buildRawMaterialBatchOptimizerSummary(plans, context)
	return models.RawMaterialBatchOptimizerSolveResponse{
		RequestID: context.RequestID,
		Summary: models.RawMaterialBatchOptimizerSolveSummary{
			SolverStatus: solverStatus,
			Message:      message,
			PlanCount:    len(plans),
		},
		Plans: plans,
	}
}

func buildRawMaterialBatchOptimizerSummary(
	plans []models.RawMaterialBatchOptimizerPlan,
	context rawMaterialBatchOptimizerContext,
) (string, string) {
	if len(plans) == 0 {
		if canSolveRawMaterialBatchOptimizerPhase7Geometry(context) {
			return "phase7_no_candidate", "第七批真几何候选增强流程已执行，但当前输入未形成可用候选方案。"
		}
		if canSolveRawMaterialBatchOptimizerPhase6Geometry(context) {
			return "phase6_no_candidate", "第六批真几何候选增强流程已执行，但当前输入未形成可用候选方案。"
		}
		if canSolveRawMaterialBatchOptimizerPhase5Geometry(context) {
			return "phase5_no_candidate", "第五批真几何候选增强流程已执行，但当前输入未形成可用候选方案。"
		}
		return "phase4_no_candidate", "第四批真几何候选增强流程已执行，但当前输入未形成可用候选方案。"
	}

	topPlan := plans[0]
	phaseLabel := "候选方案增强流程"
	statusPrefix := "phase3"
	if strings.HasPrefix(topPlan.StrategyKey, "phase7-") {
		phaseLabel = "第七批真几何候选增强流程"
		statusPrefix = "phase7"
	} else if strings.HasPrefix(topPlan.StrategyKey, "phase6-") {
		phaseLabel = "第六批真几何候选增强流程"
		statusPrefix = "phase6"
	} else if strings.HasPrefix(topPlan.StrategyKey, "phase5-") {
		phaseLabel = "第五批真几何候选增强流程"
		statusPrefix = "phase5"
	} else if strings.HasPrefix(topPlan.StrategyKey, "phase4-") {
		phaseLabel = "第四批真几何候选增强流程"
		statusPrefix = "phase4"
	}
	if len(topPlan.Assignments) == 0 {
		return statusPrefix + "_seeded", phaseLabel + "已执行，已返回带未满足明细的基础候选。"
	}
	if context.IsSingleCutSize {
		return statusPrefix + "_seeded_single_size", fmt.Sprintf(
			"%s已执行，单尺寸场景返回 %d 个候选方案。",
			phaseLabel,
			len(plans),
		)
	}
	return statusPrefix + "_seeded_multi_task", fmt.Sprintf(
		"%s已执行，多任务场景返回 %d 个候选方案。",
		phaseLabel,
		len(plans),
	)
}

func buildRawMaterialBatchOptimizerPlanComparisonSummary(
	candidate rawMaterialBatchOptimizerCandidatePlan,
	context rawMaterialBatchOptimizerContext,
	layoutSummary models.RawMaterialBatchOptimizerPlanLayoutSummary,
	lossBreakdown models.RawMaterialBatchOptimizerPlanLossBreakdown,
) models.RawMaterialBatchOptimizerPlanComparisonSummary {
	splitDemandCount := 0
	usedRollCount := 0
	for _, demand := range layoutSummary.DemandLines {
		if demand.IsSplitAcrossRolls {
			splitDemandCount += 1
		}
	}
	for _, roll := range layoutSummary.Rolls {
		if roll.IsUsed {
			usedRollCount += 1
		}
	}
	usedRollPercent := 0.0
	if len(context.Rolls) > 0 {
		usedRollPercent = roundRawMaterialBatchOptimizer((float64(usedRollCount)/float64(len(context.Rolls)))*100, 2)
	}

	return models.RawMaterialBatchOptimizerPlanComparisonSummary{
		FulfilledDemandCount: layoutSummary.FulfilledDemandLineCount,
		MustFulfillSatisfied: !context.HasMustFulfill || candidate.MustFulfillSatisfied,
		SplitDemandCount:     splitDemandCount,
		UsedRollCount:        usedRollCount,
		UsedRollPercent:      usedRollPercent,
		UnusedRollAreaM2:     lossBreakdown.UnusedRollAreaM2,
		UnfulfilledAreaM2:    lossBreakdown.UnfulfilledAreaM2,
		TrimLossAreaM2:       lossBreakdown.TrimLossAreaM2,
	}
}
