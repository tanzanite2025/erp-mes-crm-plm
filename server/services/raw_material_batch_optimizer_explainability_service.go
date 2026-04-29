package services

import (
	"fmt"
	"sort"
	"xdfc-server/models"
)

func buildRawMaterialBatchOptimizerMustFulfillDiagnostics(
	candidate rawMaterialBatchOptimizerCandidatePlan,
	context rawMaterialBatchOptimizerContext,
) []models.RawMaterialBatchOptimizerMustFulfillDiagnostic {
	demandRolls := make(map[string]map[string]struct{}, len(context.DemandLines))
	demandAllocatedSets := make(map[string]int, len(context.DemandLines))
	for _, assignment := range candidate.Assignments {
		demandAllocatedSets[assignment.DemandLineID] += assignment.AllocatedSets
		if demandRolls[assignment.DemandLineID] == nil {
			demandRolls[assignment.DemandLineID] = make(map[string]struct{})
		}
		demandRolls[assignment.DemandLineID][assignment.RollID] = struct{}{}
	}

	diagnostics := make([]models.RawMaterialBatchOptimizerMustFulfillDiagnostic, 0)
	for _, demand := range context.DemandLines {
		if !demand.Input.MustFulfill {
			continue
		}
		allocatedSets := demandAllocatedSets[demand.Input.DemandLineID]
		if allocatedSets >= demand.RequiredSets {
			diagnostics = append(diagnostics, models.RawMaterialBatchOptimizerMustFulfillDiagnostic{
				DemandLineID:           demand.Input.DemandLineID,
				Status:                 "fulfilled",
				ReasonCode:             "fulfilled",
				Message:                "mustFulfill 需求已完整满足。",
				BlockingConstraintCode: "none",
				BlockingConstraint:     "--",
				Suggestion:             "无需调整。",
			})
			continue
		}

		reasonCode, blockingConstraintCode, blockingConstraint, suggestion := explainRawMaterialBatchMustFulfillFailure(
			demand,
			context,
			candidate,
			len(demandRolls[demand.Input.DemandLineID]),
		)
		diagnostics = append(diagnostics, models.RawMaterialBatchOptimizerMustFulfillDiagnostic{
			DemandLineID:           demand.Input.DemandLineID,
			Status:                 "unfulfilled",
			ReasonCode:             reasonCode,
			Message:                fmt.Sprintf("mustFulfill 需求仍剩余 %d 套，需优先处理。", maxInt(demand.RequiredSets-allocatedSets, 0)),
			BlockingConstraintCode: blockingConstraintCode,
			BlockingConstraint:     blockingConstraint,
			Suggestion:             suggestion,
		})
	}

	sort.SliceStable(diagnostics, func(i, j int) bool {
		if diagnostics[i].Status == diagnostics[j].Status {
			return diagnostics[i].DemandLineID < diagnostics[j].DemandLineID
		}
		return diagnostics[i].Status == "unfulfilled"
	})
	return diagnostics
}

func explainRawMaterialBatchMustFulfillFailure(
	demand rawMaterialBatchOptimizerContextDemandLine,
	context rawMaterialBatchOptimizerContext,
	candidate rawMaterialBatchOptimizerCandidatePlan,
	assignedRollCount int,
) (string, string, string, string) {
	maxUsableWidth := 0.0
	hasWidthFeasible := false
	trimConstrained := false
	areaPerSetM2 := float64(demand.PieceCountPerSet*demand.LayupCount) * demand.PieceAreaM2
	totalPotentialSets := 0
	for _, roll := range context.Rolls {
		usableWidth := maxFloat64(roll.Input.RollWidthMM-roll.EffectiveEdgeTrimMM*2-context.KnifeGapMM, 0)
		if usableWidth > maxUsableWidth {
			maxUsableWidth = usableWidth
		}
		if usableWidth >= demand.WidthMM {
			hasWidthFeasible = true
		}
		if !trimConstrained && roll.Input.RollWidthMM >= demand.WidthMM && usableWidth < demand.WidthMM {
			trimConstrained = true
		}
		if areaPerSetM2 > 0 {
			totalPotentialSets += int(roll.RollAreaM2 / areaPerSetM2)
		}
	}

	if !hasWidthFeasible {
		return "insufficient_width",
			"capacity",
			fmt.Sprintf("需求宽度 %.1f mm 超过当前卷材可用宽度上限 %.1f mm。", demand.WidthMM, maxUsableWidth),
			"请更换更宽卷材，或放宽修边 / 刀缝约束。"
	}
	if trimConstrained {
		return "trim_and_gap_constraint",
			"capacity",
			fmt.Sprintf("修边 %.1f mm 与刀缝 %.1f mm 挤压了可用宽度，导致需求宽度 %.1f mm 无法稳定放入。", context.DefaultEdgeTrimMM, context.KnifeGapMM, demand.WidthMM),
			"请优先检查修边、刀缝与有效宽度配置。"
	}
	if totalPotentialSets < demand.RequiredSets {
		return "insufficient_area",
			"capacity",
			fmt.Sprintf("理论最多仅可覆盖 %d 套，低于需求 %d 套。", totalPotentialSets, demand.RequiredSets),
			"请补充卷材面积或降低 mustFulfill 需求量。"
	}
	if !demand.Input.AllowMixedPlan && assignedRollCount > 1 {
		return "split_not_allowed",
			"mix",
			"当前需求不允许混排，但候选已出现跨卷分配，导致完整满足失败。",
			"请允许混排，或为该需求预留单卷连续容量。"
	}
	if demand.RequiresAdjacentGrouping && demand.RollGroupKey != "" && assignedRollCount > 1 {
		return "adjacent_grouping_conflict",
			"group",
			fmt.Sprintf("同组键 %s 需要连续编排，但当前候选已出现跨卷拆分。", demand.RollGroupKey),
			"请为该组预留连续卷容量，或放宽同组连续要求。"
	}
	if demand.DirectionLocked && demand.YarnDirectionMode != "" {
		return "direction_lock_conflict",
			"direction",
			fmt.Sprintf("方向模式 %s 需要保持一致，当前候选未能形成稳定连续分配。", demand.YarnDirectionMode),
			"请尝试切换方向优先策略，或放宽方向锁定要求。"
	}
	if demand.OrderSequence > 0 {
		return "sequence_preemption",
			"sequence",
			fmt.Sprintf("顺序号 %d 的 must 需求被更早占用的卷容量挤占。", demand.OrderSequence),
			"请优先使用 sequence-first 策略，或为早序需求保留专用卷材。"
	}
	if demand.RollGroupKey != "" {
		return "group_capacity_conflict",
			"group",
			fmt.Sprintf("同组键 %s 未能在当前候选中获得足够连续容量。", demand.RollGroupKey),
			"请尝试 group-first 策略，或降低该组连续性要求。"
	}
	if len(candidate.UnfulfilledLines) > 0 {
		return "allocation_conflict",
			"capacity",
			"当前候选的卷材容量已被更高优先级或更早序需求占用。",
			"请调整排序策略，或为 mustFulfill 需求提供专用卷材。"
	}
	return "allocation_conflict", "capacity", "当前候选未找到稳定可行的完整分配路径。", "请尝试切换策略或降低约束。"
}

func buildRawMaterialBatchOptimizerPlanDiffSummary(
	plan models.RawMaterialBatchOptimizerPlan,
	baseline models.RawMaterialBatchOptimizerPlan,
) models.RawMaterialBatchOptimizerPlanDiffSummary {
	if plan.Rank == baseline.Rank {
		return models.RawMaterialBatchOptimizerPlanDiffSummary{
			BaselinePlanRank:     baseline.Rank,
			BaselineStrategyKey:  baseline.StrategyKey,
			Mode:                 "self",
			AddedZoneIDs:         []string{},
			RemovedZoneIDs:       []string{},
			ChangedDemandLineIDs: []string{},
			ChangedRollIDs:       []string{},
			HighlightZoneIDs:     []string{},
		}
	}

	planZones := resolveRawMaterialBatchOptimizerDiffZones(plan)
	baselineZones := resolveRawMaterialBatchOptimizerDiffZones(baseline)
	planZoneSet := make(map[string]rawMaterialBatchOptimizerDiffZone, len(planZones))
	baselineZoneSet := make(map[string]rawMaterialBatchOptimizerDiffZone, len(baselineZones))
	for _, zone := range planZones {
		planZoneSet[zone.ID] = zone
	}
	for _, zone := range baselineZones {
		baselineZoneSet[zone.ID] = zone
	}

	addedZoneIDs := make([]string, 0)
	removedZoneIDs := make([]string, 0)
	for zoneID := range planZoneSet {
		if _, exists := baselineZoneSet[zoneID]; !exists {
			addedZoneIDs = append(addedZoneIDs, zoneID)
		}
	}
	for zoneID := range baselineZoneSet {
		if _, exists := planZoneSet[zoneID]; !exists {
			removedZoneIDs = append(removedZoneIDs, zoneID)
		}
	}

	changedDemandLineIDs := buildRawMaterialBatchOptimizerChangedDemandLineIDs(plan, baseline)
	changedRollIDs := buildRawMaterialBatchOptimizerChangedRollIDs(plan, baseline)
	highlightZoneSet := make(map[string]struct{}, len(addedZoneIDs)+len(changedDemandLineIDs)+len(changedRollIDs))
	for _, zoneID := range addedZoneIDs {
		highlightZoneSet[zoneID] = struct{}{}
	}
	changedDemandSet := toRawMaterialBatchOptimizerStringSet(changedDemandLineIDs)
	changedRollSet := toRawMaterialBatchOptimizerStringSet(changedRollIDs)
	for _, zone := range planZones {
		if _, changed := changedDemandSet[zone.DemandLineID]; changed && zone.ID != "" {
			highlightZoneSet[zone.ID] = struct{}{}
		}
		if _, changed := changedRollSet[zone.RollID]; changed && zone.ID != "" {
			highlightZoneSet[zone.ID] = struct{}{}
		}
	}

	highlightZoneIDs := make([]string, 0, len(highlightZoneSet))
	for zoneID := range highlightZoneSet {
		highlightZoneIDs = append(highlightZoneIDs, zoneID)
	}
	sort.Strings(addedZoneIDs)
	sort.Strings(removedZoneIDs)
	sort.Strings(changedDemandLineIDs)
	sort.Strings(changedRollIDs)
	sort.Strings(highlightZoneIDs)
	if len(highlightZoneIDs) > 24 {
		highlightZoneIDs = highlightZoneIDs[:24]
	}

	return models.RawMaterialBatchOptimizerPlanDiffSummary{
		BaselinePlanRank:     baseline.Rank,
		BaselineStrategyKey:  baseline.StrategyKey,
		Mode:                 "against-baseline",
		AddedZoneIDs:         addedZoneIDs,
		RemovedZoneIDs:       removedZoneIDs,
		ChangedDemandLineIDs: changedDemandLineIDs,
		ChangedRollIDs:       changedRollIDs,
		HighlightZoneIDs:     highlightZoneIDs,
	}
}

type rawMaterialBatchOptimizerDiffZone struct {
	ID           string
	DemandLineID string
	RollID       string
}

func resolveRawMaterialBatchOptimizerDiffZones(
	plan models.RawMaterialBatchOptimizerPlan,
) []rawMaterialBatchOptimizerDiffZone {
	if plan.GeometryLayoutSummary != nil && len(plan.GeometryLayoutSummary.Zones) > 0 {
		zones := make([]rawMaterialBatchOptimizerDiffZone, 0, len(plan.GeometryLayoutSummary.Zones))
		for _, zone := range plan.GeometryLayoutSummary.Zones {
			zones = append(zones, rawMaterialBatchOptimizerDiffZone{
				ID:           zone.ID,
				DemandLineID: zone.DemandLineID,
				RollID:       zone.RollID,
			})
		}
		return zones
	}
	zones := make([]rawMaterialBatchOptimizerDiffZone, 0, len(plan.LayoutSummary.Zones))
	for _, zone := range plan.LayoutSummary.Zones {
		zones = append(zones, rawMaterialBatchOptimizerDiffZone{
			ID:           zone.ID,
			DemandLineID: zone.DemandLineID,
			RollID:       zone.RollID,
		})
	}
	return zones
}

func buildRawMaterialBatchOptimizerPlanDiffSummaries(
	plan models.RawMaterialBatchOptimizerPlan,
	plans []models.RawMaterialBatchOptimizerPlan,
) []models.RawMaterialBatchOptimizerPlanDiffSummary {
	if len(plans) == 0 {
		return []models.RawMaterialBatchOptimizerPlanDiffSummary{}
	}
	diffs := make([]models.RawMaterialBatchOptimizerPlanDiffSummary, 0, len(plans))
	for _, baseline := range plans {
		diffs = append(diffs, buildRawMaterialBatchOptimizerPlanDiffSummary(plan, baseline))
	}
	sort.SliceStable(diffs, func(i, j int) bool {
		return diffs[i].BaselinePlanRank < diffs[j].BaselinePlanRank
	})
	return diffs
}

func buildRawMaterialBatchOptimizerChangedDemandLineIDs(
	plan models.RawMaterialBatchOptimizerPlan,
	baseline models.RawMaterialBatchOptimizerPlan,
) []string {
	planDemandMap := make(map[string]models.RawMaterialBatchOptimizerPlanLayoutDemandSummary, len(plan.LayoutSummary.DemandLines))
	baselineDemandMap := make(map[string]models.RawMaterialBatchOptimizerPlanLayoutDemandSummary, len(baseline.LayoutSummary.DemandLines))
	for _, line := range plan.LayoutSummary.DemandLines {
		planDemandMap[line.DemandLineID] = line
	}
	for _, line := range baseline.LayoutSummary.DemandLines {
		baselineDemandMap[line.DemandLineID] = line
	}
	ids := make(map[string]struct{})
	for demandLineID, line := range planDemandMap {
		baselineLine, exists := baselineDemandMap[demandLineID]
		if !exists || line.AllocatedSets != baselineLine.AllocatedSets || line.RollCount != baselineLine.RollCount || line.CoveragePercent != baselineLine.CoveragePercent {
			ids[demandLineID] = struct{}{}
		}
	}
	for demandLineID := range baselineDemandMap {
		if _, exists := planDemandMap[demandLineID]; !exists {
			ids[demandLineID] = struct{}{}
		}
	}
	return toSortedRawMaterialBatchOptimizerStrings(ids)
}

func buildRawMaterialBatchOptimizerChangedRollIDs(
	plan models.RawMaterialBatchOptimizerPlan,
	baseline models.RawMaterialBatchOptimizerPlan,
) []string {
	planRollMap := make(map[string]models.RawMaterialBatchOptimizerPlanLayoutRollSummary, len(plan.LayoutSummary.Rolls))
	baselineRollMap := make(map[string]models.RawMaterialBatchOptimizerPlanLayoutRollSummary, len(baseline.LayoutSummary.Rolls))
	for _, roll := range plan.LayoutSummary.Rolls {
		planRollMap[roll.RollID] = roll
	}
	for _, roll := range baseline.LayoutSummary.Rolls {
		baselineRollMap[roll.RollID] = roll
	}
	ids := make(map[string]struct{})
	for rollID, roll := range planRollMap {
		baselineRoll, exists := baselineRollMap[rollID]
		if !exists || roll.AllocatedSets != baselineRoll.AllocatedSets || roll.UtilizationPercent != baselineRoll.UtilizationPercent || roll.IsUsed != baselineRoll.IsUsed {
			ids[rollID] = struct{}{}
		}
	}
	for rollID := range baselineRollMap {
		if _, exists := planRollMap[rollID]; !exists {
			ids[rollID] = struct{}{}
		}
	}
	return toSortedRawMaterialBatchOptimizerStrings(ids)
}

func toRawMaterialBatchOptimizerStringSet(values []string) map[string]struct{} {
	set := make(map[string]struct{}, len(values))
	for _, value := range values {
		if value == "" {
			continue
		}
		set[value] = struct{}{}
	}
	return set
}

func toSortedRawMaterialBatchOptimizerStrings(values map[string]struct{}) []string {
	result := make([]string, 0, len(values))
	for value := range values {
		result = append(result, value)
	}
	sort.Strings(result)
	return result
}
