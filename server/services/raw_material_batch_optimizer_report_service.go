package services

import "xdfc-server/models"

func buildRawMaterialBatchOptimizerPlanReportSummary(
	plan models.RawMaterialBatchOptimizerPlan,
	diffSummary models.RawMaterialBatchOptimizerPlanDiffSummary,
) models.RawMaterialBatchOptimizerPlanReportSummary {
	mustRiskCount := 0
	for _, diagnostic := range plan.MustFulfillDiagnostics {
		if diagnostic.Status == "unfulfilled" {
			mustRiskCount += 1
		}
	}

	return models.RawMaterialBatchOptimizerPlanReportSummary{
		PlanRank:               plan.Rank,
		StrategyKey:            plan.StrategyKey,
		ObjectivePreset:        plan.ScoreBreakdown.ObjectivePreset,
		AppliedWeights:         plan.ScoreBreakdown.AppliedWeights,
		BaselinePlanRank:       diffSummary.BaselinePlanRank,
		BaselineStrategyKey:    diffSummary.BaselineStrategyKey,
		Score:                  plan.Score,
		UtilizationPercent:     plan.UtilizationPercent,
		LossAreaM2:             plan.LossAreaM2,
		MustFulfillRiskCount:   mustRiskCount,
		ChangedDemandLineCount: len(diffSummary.ChangedDemandLineIDs),
		ChangedRollCount:       len(diffSummary.ChangedRollIDs),
		HighlightZoneCount:     len(diffSummary.HighlightZoneIDs),
		ComparisonSummary:      plan.ComparisonSummary,
		ScoreBreakdown:         plan.ScoreBreakdown,
	}
}
