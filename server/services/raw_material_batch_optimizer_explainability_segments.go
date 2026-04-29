package services

import (
	"fmt"
	"sort"
	"strings"
	"xdfc-server/models"
)

func buildRawMaterialBatchOptimizerExplainabilitySummary(
	candidate rawMaterialBatchOptimizerCandidatePlan,
	context rawMaterialBatchOptimizerContext,
) models.RawMaterialBatchOptimizerPlanExplainabilitySummary {
	groupSegments := buildRawMaterialBatchOptimizerGroupContinuitySegments(candidate, context)
	sequenceSegments := buildRawMaterialBatchOptimizerSequenceContinuitySegments(candidate, context)
	adjacencySegments := buildRawMaterialBatchOptimizerAdjacencySegments(candidate, context)
	primaryBreakReasons := collectRawMaterialBatchOptimizerPrimaryBreakReasons(groupSegments, sequenceSegments, adjacencySegments)
	return models.RawMaterialBatchOptimizerPlanExplainabilitySummary{
		GroupSegments:       groupSegments,
		SequenceSegments:    sequenceSegments,
		AdjacencySegments:   adjacencySegments,
		PrimaryBreakReasons: primaryBreakReasons,
	}
}

func buildRawMaterialBatchOptimizerGroupContinuitySegments(
	candidate rawMaterialBatchOptimizerCandidatePlan,
	context rawMaterialBatchOptimizerContext,
) []models.RawMaterialBatchOptimizerContinuitySegment {
	demandLookup := buildRawMaterialBatchOptimizerDemandLookup(context)
	groupDemandIDs := make(map[string][]string)
	groupRolls := make(map[string]map[string]struct{})
	for _, demandLine := range context.DemandLines {
		if demandLine.RollGroupKey == "" {
			continue
		}
		groupDemandIDs[demandLine.RollGroupKey] = append(groupDemandIDs[demandLine.RollGroupKey], demandLine.Input.DemandLineID)
	}
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
	keys := make([]string, 0, len(groupDemandIDs))
	for key := range groupDemandIDs {
		keys = append(keys, key)
	}
	sort.Strings(keys)
	segments := make([]models.RawMaterialBatchOptimizerContinuitySegment, 0, len(keys))
	for _, key := range keys {
		demandIDs := append([]string(nil), groupDemandIDs[key]...)
		sort.Strings(demandIDs)
		rollIDs := extractRawMaterialBatchOptimizerSortedKeys(groupRolls[key])
		preserved := len(rollIDs) <= 1 && len(rollIDs) > 0
		reason := "组内连续性保持稳定。"
		rollID := ""
		if len(rollIDs) == 1 {
			rollID = rollIDs[0]
		}
		if len(rollIDs) == 0 {
			preserved = false
			reason = "组内需求尚未形成有效连续段。"
		} else if len(rollIDs) > 1 {
			reason = fmt.Sprintf("组 %s 被拆分到 %d 个卷材，连续段被打断。", key, len(rollIDs))
		}
		segments = append(segments, models.RawMaterialBatchOptimizerContinuitySegment{
			Kind:          "group",
			Key:           key,
			RollID:        rollID,
			DemandLineIDs: demandIDs,
			Preserved:     preserved,
			Reason:        reason,
		})
	}
	return segments
}

func buildRawMaterialBatchOptimizerSequenceContinuitySegments(
	candidate rawMaterialBatchOptimizerCandidatePlan,
	context rawMaterialBatchOptimizerContext,
) []models.RawMaterialBatchOptimizerContinuitySegment {
	rollAssignments := buildRawMaterialBatchOptimizerAssignmentsByRoll(candidate)
	demandLookup := buildRawMaterialBatchOptimizerDemandLookup(context)
	rollIDs := make([]string, 0, len(rollAssignments))
	for rollID := range rollAssignments {
		rollIDs = append(rollIDs, rollID)
	}
	sort.Strings(rollIDs)
	segments := make([]models.RawMaterialBatchOptimizerContinuitySegment, 0, len(rollIDs))
	for _, rollID := range rollIDs {
		assignments := append([]models.RawMaterialBatchOptimizerPlanAssignment(nil), rollAssignments[rollID]...)
		sort.SliceStable(assignments, func(i int, j int) bool {
			left := demandLookup[assignments[i].DemandLineID]
			right := demandLookup[assignments[j].DemandLineID]
			if left.OrderSequence == right.OrderSequence {
				return assignments[i].DemandLineID < assignments[j].DemandLineID
			}
			return left.OrderSequence < right.OrderSequence
		})
		demandIDs := make([]string, 0, len(assignments))
		preserved := true
		breakAt := ""
		previousSequence := 0
		for _, assignment := range assignments {
			demandLine, exists := demandLookup[assignment.DemandLineID]
			if !exists || demandLine.OrderSequence <= 0 {
				continue
			}
			demandIDs = append(demandIDs, assignment.DemandLineID)
			if previousSequence > 0 && demandLine.OrderSequence < previousSequence {
				preserved = false
				breakAt = assignment.DemandLineID
				break
			}
			previousSequence = demandLine.OrderSequence
		}
		if len(demandIDs) == 0 {
			continue
		}
		reason := "顺序连续段保持稳定。"
		if !preserved {
			reason = fmt.Sprintf("卷 %s 在需求 %s 处发生顺序回退。", rollID, breakAt)
		}
		segments = append(segments, models.RawMaterialBatchOptimizerContinuitySegment{
			Kind:          "sequence",
			Key:           rollID,
			RollID:        rollID,
			DemandLineIDs: demandIDs,
			Preserved:     preserved,
			Reason:        reason,
		})
	}
	return segments
}

func buildRawMaterialBatchOptimizerAdjacencySegments(
	candidate rawMaterialBatchOptimizerCandidatePlan,
	context rawMaterialBatchOptimizerContext,
) []models.RawMaterialBatchOptimizerContinuitySegment {
	demandLookup := buildRawMaterialBatchOptimizerDemandLookup(context)
	adjacencyGroups := make(map[string][]string)
	adjacencyRolls := make(map[string]map[string]struct{})
	for _, demandLine := range context.DemandLines {
		if !demandLine.RequiresAdjacentGrouping {
			continue
		}
		key := demandLine.RollGroupKey
		if key == "" {
			key = demandLine.Input.DemandLineID
		}
		adjacencyGroups[key] = append(adjacencyGroups[key], demandLine.Input.DemandLineID)
	}
	for _, assignment := range candidate.Assignments {
		demandLine, exists := demandLookup[assignment.DemandLineID]
		if !exists || !demandLine.RequiresAdjacentGrouping {
			continue
		}
		key := demandLine.RollGroupKey
		if key == "" {
			key = demandLine.Input.DemandLineID
		}
		if adjacencyRolls[key] == nil {
			adjacencyRolls[key] = make(map[string]struct{})
		}
		adjacencyRolls[key][assignment.RollID] = struct{}{}
	}
	keys := make([]string, 0, len(adjacencyGroups))
	for key := range adjacencyGroups {
		keys = append(keys, key)
	}
	sort.Strings(keys)
	segments := make([]models.RawMaterialBatchOptimizerContinuitySegment, 0, len(keys))
	for _, key := range keys {
		demandIDs := append([]string(nil), adjacencyGroups[key]...)
		sort.Strings(demandIDs)
		rollIDs := extractRawMaterialBatchOptimizerSortedKeys(adjacencyRolls[key])
		preserved := len(rollIDs) <= 1 && len(rollIDs) > 0
		reason := "相邻连续段保持稳定。"
		rollID := ""
		if len(rollIDs) == 1 {
			rollID = rollIDs[0]
		}
		if len(rollIDs) == 0 {
			preserved = false
			reason = "相邻要求未形成有效连续段。"
		} else if len(rollIDs) > 1 {
			reason = fmt.Sprintf("相邻要求被拆到 %d 个卷材，连续段被破坏。", len(rollIDs))
		}
		segments = append(segments, models.RawMaterialBatchOptimizerContinuitySegment{
			Kind:          "adjacency",
			Key:           key,
			RollID:        rollID,
			DemandLineIDs: demandIDs,
			Preserved:     preserved,
			Reason:        reason,
		})
	}
	return segments
}

func collectRawMaterialBatchOptimizerPrimaryBreakReasons(
	groupSegments []models.RawMaterialBatchOptimizerContinuitySegment,
	sequenceSegments []models.RawMaterialBatchOptimizerContinuitySegment,
	adjacencySegments []models.RawMaterialBatchOptimizerContinuitySegment,
) []string {
	reasons := make([]string, 0, 4)
	seen := make(map[string]struct{})
	for _, segment := range append(append(groupSegments, sequenceSegments...), adjacencySegments...) {
		if segment.Preserved {
			continue
		}
		reason := strings.TrimSpace(segment.Reason)
		if reason == "" {
			continue
		}
		if _, exists := seen[reason]; exists {
			continue
		}
		seen[reason] = struct{}{}
		reasons = append(reasons, reason)
		if len(reasons) >= 4 {
			break
		}
	}
	if len(reasons) == 0 {
		return []string{"连续段保持稳定"}
	}
	return reasons
}

func extractRawMaterialBatchOptimizerSortedKeys(values map[string]struct{}) []string {
	if len(values) == 0 {
		return []string{}
	}
	keys := make([]string, 0, len(values))
	for key := range values {
		keys = append(keys, key)
	}
	sort.Strings(keys)
	return keys
}
