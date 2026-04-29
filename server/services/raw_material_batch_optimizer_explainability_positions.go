package services

import (
	"sort"
	"xdfc-server/models"
)

func enrichRawMaterialBatchOptimizerExplainabilitySummary(
	summary models.RawMaterialBatchOptimizerPlanExplainabilitySummary,
	candidate rawMaterialBatchOptimizerCandidatePlan,
) models.RawMaterialBatchOptimizerPlanExplainabilitySummary {
	summary.GroupSegments = enrichRawMaterialBatchOptimizerContinuitySegments(summary.GroupSegments, candidate)
	summary.SequenceSegments = enrichRawMaterialBatchOptimizerContinuitySegments(summary.SequenceSegments, candidate)
	summary.AdjacencySegments = enrichRawMaterialBatchOptimizerContinuitySegments(summary.AdjacencySegments, candidate)
	summary.HeatZoneAttributions = buildRawMaterialBatchOptimizerHeatZoneAttributions(summary)
	summary = enrichRawMaterialBatchOptimizerExplainabilityClusters(summary)
	return summary
}

func enrichRawMaterialBatchOptimizerContinuitySegments(
	segments []models.RawMaterialBatchOptimizerContinuitySegment,
	candidate rawMaterialBatchOptimizerCandidatePlan,
) []models.RawMaterialBatchOptimizerContinuitySegment {
	result := make([]models.RawMaterialBatchOptimizerContinuitySegment, 0, len(segments))
	for _, segment := range segments {
		segment.AttributedZoneIDs = buildRawMaterialBatchOptimizerSegmentAttributedZoneIDs(segment, candidate)
		if !segment.Preserved && len(segment.DemandLineIDs) > 1 {
			breakPosition := 1
			if segment.Kind == "sequence" {
				breakPosition = len(segment.DemandLineIDs) - 1
			}
			if breakPosition < 1 {
				breakPosition = 1
			}
			if breakPosition >= len(segment.DemandLineIDs) {
				breakPosition = len(segment.DemandLineIDs) - 1
			}
			segment.BreakPosition = breakPosition
			segment.BreakBeforeDemandLineID = segment.DemandLineIDs[breakPosition-1]
			segment.BreakAfterDemandLineID = segment.DemandLineIDs[breakPosition]
		}
		result = append(result, segment)
	}
	return result
}

func buildRawMaterialBatchOptimizerSegmentAttributedZoneIDs(
	segment models.RawMaterialBatchOptimizerContinuitySegment,
	candidate rawMaterialBatchOptimizerCandidatePlan,
) []string {
	if candidate.GeometryLayoutSummary == nil || len(candidate.GeometryLayoutSummary.Zones) == 0 {
		return []string{}
	}
	demandSet := toRawMaterialBatchOptimizerStringSet(segment.DemandLineIDs)
	zoneSet := make(map[string]struct{})
	for _, zone := range candidate.GeometryLayoutSummary.Zones {
		if zone.ID == "" {
			continue
		}
		if _, exists := demandSet[zone.DemandLineID]; !exists {
			continue
		}
		if segment.RollID != "" && zone.RollID != "" && zone.RollID != segment.RollID {
			continue
		}
		zoneSet[zone.ID] = struct{}{}
	}
	zoneIDs := make([]string, 0, len(zoneSet))
	for zoneID := range zoneSet {
		zoneIDs = append(zoneIDs, zoneID)
	}
	sort.Strings(zoneIDs)
	if len(zoneIDs) > 12 {
		zoneIDs = zoneIDs[:12]
	}
	return zoneIDs
}

func buildRawMaterialBatchOptimizerHeatZoneAttributions(
	summary models.RawMaterialBatchOptimizerPlanExplainabilitySummary,
) []models.RawMaterialBatchOptimizerHeatZoneAttribution {
	attributionMap := make(map[string]models.RawMaterialBatchOptimizerHeatZoneAttribution)
	segments := append(append(summary.GroupSegments, summary.SequenceSegments...), summary.AdjacencySegments...)
	for _, segment := range segments {
		for _, zoneID := range segment.AttributedZoneIDs {
			if zoneID == "" {
				continue
			}
			existing, exists := attributionMap[zoneID]
			if exists && !isRawMaterialBatchOptimizerFallbackAttributionReason(existing.Reason) && segment.Preserved {
				continue
			}
			attributionMap[zoneID] = models.RawMaterialBatchOptimizerHeatZoneAttribution{
				ZoneID:        zoneID,
				SegmentKind:   segment.Kind,
				SegmentKey:    segment.Key,
				Reason:        segment.Reason,
				RollID:        segment.RollID,
				DemandLineIDs: append([]string(nil), segment.DemandLineIDs...),
			}
		}
	}
	attributions := make([]models.RawMaterialBatchOptimizerHeatZoneAttribution, 0, len(attributionMap))
	for _, attribution := range attributionMap {
		attributions = append(attributions, attribution)
	}
	sort.SliceStable(attributions, func(i int, j int) bool {
		if attributions[i].SegmentKind == attributions[j].SegmentKind {
			if attributions[i].SegmentKey == attributions[j].SegmentKey {
				return attributions[i].ZoneID < attributions[j].ZoneID
			}
			return attributions[i].SegmentKey < attributions[j].SegmentKey
		}
		return attributions[i].SegmentKind < attributions[j].SegmentKind
	})
	if len(attributions) > 24 {
		attributions = attributions[:24]
	}
	return attributions
}

func isRawMaterialBatchOptimizerFallbackAttributionReason(reason string) bool {
	return reason == "" || reason == "连续段保持稳定。" || reason == "顺序连续段保持稳定。" || reason == "相邻连续段保持稳定。" || reason == "组内连续性保持稳定。"
}
