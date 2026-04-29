package services

import (
	"fmt"
	"sort"
	"xdfc-server/models"
)

func enrichRawMaterialBatchOptimizerExplainabilityClusters(
	summary models.RawMaterialBatchOptimizerPlanExplainabilitySummary,
) models.RawMaterialBatchOptimizerPlanExplainabilitySummary {
	breakSlices := buildRawMaterialBatchOptimizerBreakSlices(summary)
	zoneClusters := buildRawMaterialBatchOptimizerZoneClusters(breakSlices)
	summary.BreakSlices = breakSlices
	summary.ZoneClusters = zoneClusters
	summary.HeatZoneAttributions = attachRawMaterialBatchOptimizerHeatZoneClusterMetadata(summary.HeatZoneAttributions, breakSlices, zoneClusters)
	return summary
}

func buildRawMaterialBatchOptimizerBreakSlices(
	summary models.RawMaterialBatchOptimizerPlanExplainabilitySummary,
) []models.RawMaterialBatchOptimizerBreakSliceSummary {
	segments := append(append(summary.GroupSegments, summary.SequenceSegments...), summary.AdjacencySegments...)
	breakSlices := make([]models.RawMaterialBatchOptimizerBreakSliceSummary, 0, len(segments))
	for _, segment := range segments {
		if segment.Preserved || segment.BreakPosition <= 0 {
			continue
		}
		breakSliceID := fmt.Sprintf("slice-%s-%s-%d", segment.Kind, segment.Key, segment.BreakPosition)
		clusterID := fmt.Sprintf("cluster-%s-%s", segment.Kind, segment.Key)
		severityScore := float64(len(segment.AttributedZoneIDs))*1.25 + float64(len(segment.DemandLineIDs))*0.5
		if segment.RollID != "" {
			severityScore += 0.5
		}
		breakSlices = append(breakSlices, models.RawMaterialBatchOptimizerBreakSliceSummary{
			ID:                      breakSliceID,
			SegmentKind:             segment.Kind,
			SegmentKey:              segment.Key,
			RollID:                  segment.RollID,
			BreakPosition:           segment.BreakPosition,
			BreakBeforeDemandLineID: segment.BreakBeforeDemandLineID,
			BreakAfterDemandLineID:  segment.BreakAfterDemandLineID,
			ZoneIDs:                 append([]string(nil), segment.AttributedZoneIDs...),
			ClusterID:               clusterID,
			Reason:                  segment.Reason,
			SeverityScore:           roundRawMaterialBatchOptimizer(severityScore, 2),
		})
	}
	sort.SliceStable(breakSlices, func(i int, j int) bool {
		if breakSlices[i].SeverityScore == breakSlices[j].SeverityScore {
			return breakSlices[i].ID < breakSlices[j].ID
		}
		return breakSlices[i].SeverityScore > breakSlices[j].SeverityScore
	})
	return breakSlices
}

func buildRawMaterialBatchOptimizerZoneClusters(
	breakSlices []models.RawMaterialBatchOptimizerBreakSliceSummary,
) []models.RawMaterialBatchOptimizerZoneClusterSummary {
	type clusterAccumulator struct {
		ZoneIDs              map[string]struct{}
		RollIDs              map[string]struct{}
		DemandLineIDs        map[string]struct{}
		BreakSliceIDs        []string
		DominantReason       string
		DominantDemandLineID string
		DensityScore         float64
	}
	accumulators := make(map[string]*clusterAccumulator)
	for _, breakSlice := range breakSlices {
		clusterID := breakSlice.ClusterID
		if clusterID == "" {
			clusterID = fmt.Sprintf("cluster-%s", breakSlice.ID)
		}
		accumulator := accumulators[clusterID]
		if accumulator == nil {
			accumulator = &clusterAccumulator{
				ZoneIDs:       make(map[string]struct{}),
				RollIDs:       make(map[string]struct{}),
				DemandLineIDs: make(map[string]struct{}),
			}
			accumulators[clusterID] = accumulator
		}
		for _, zoneID := range breakSlice.ZoneIDs {
			if zoneID == "" {
				continue
			}
			accumulator.ZoneIDs[zoneID] = struct{}{}
		}
		if breakSlice.RollID != "" {
			accumulator.RollIDs[breakSlice.RollID] = struct{}{}
		}
		if breakSlice.BreakBeforeDemandLineID != "" {
			accumulator.DemandLineIDs[breakSlice.BreakBeforeDemandLineID] = struct{}{}
		}
		if breakSlice.BreakAfterDemandLineID != "" {
			accumulator.DemandLineIDs[breakSlice.BreakAfterDemandLineID] = struct{}{}
		}
		accumulator.BreakSliceIDs = append(accumulator.BreakSliceIDs, breakSlice.ID)
		if accumulator.DominantReason == "" || breakSlice.SeverityScore > accumulator.DensityScore {
			accumulator.DominantReason = breakSlice.Reason
			if breakSlice.BreakAfterDemandLineID != "" {
				accumulator.DominantDemandLineID = breakSlice.BreakAfterDemandLineID
			} else {
				accumulator.DominantDemandLineID = breakSlice.BreakBeforeDemandLineID
			}
		}
		accumulator.DensityScore += breakSlice.SeverityScore
	}
	clusterIDs := make([]string, 0, len(accumulators))
	for clusterID := range accumulators {
		clusterIDs = append(clusterIDs, clusterID)
	}
	sort.Strings(clusterIDs)
	clusters := make([]models.RawMaterialBatchOptimizerZoneClusterSummary, 0, len(clusterIDs))
	for _, clusterID := range clusterIDs {
		accumulator := accumulators[clusterID]
		clusters = append(clusters, models.RawMaterialBatchOptimizerZoneClusterSummary{
			ClusterID:            clusterID,
			ZoneIDs:              toSortedRawMaterialBatchOptimizerStrings(accumulator.ZoneIDs),
			RollIDs:              toSortedRawMaterialBatchOptimizerStrings(accumulator.RollIDs),
			DemandLineIDs:        toSortedRawMaterialBatchOptimizerStrings(accumulator.DemandLineIDs),
			BreakSliceIDs:        append([]string(nil), accumulator.BreakSliceIDs...),
			DominantReason:       accumulator.DominantReason,
			DominantDemandLineID: accumulator.DominantDemandLineID,
			DensityScore:         roundRawMaterialBatchOptimizer(accumulator.DensityScore, 2),
		})
	}
	sort.SliceStable(clusters, func(i int, j int) bool {
		if clusters[i].DensityScore == clusters[j].DensityScore {
			return clusters[i].ClusterID < clusters[j].ClusterID
		}
		return clusters[i].DensityScore > clusters[j].DensityScore
	})
	return clusters
}

func attachRawMaterialBatchOptimizerHeatZoneClusterMetadata(
	attributions []models.RawMaterialBatchOptimizerHeatZoneAttribution,
	breakSlices []models.RawMaterialBatchOptimizerBreakSliceSummary,
	zoneClusters []models.RawMaterialBatchOptimizerZoneClusterSummary,
) []models.RawMaterialBatchOptimizerHeatZoneAttribution {
	zoneToClusterID := make(map[string]string)
	zoneToBreakSliceIDs := make(map[string][]string)
	for _, cluster := range zoneClusters {
		for _, zoneID := range cluster.ZoneIDs {
			if zoneID == "" {
				continue
			}
			zoneToClusterID[zoneID] = cluster.ClusterID
		}
	}
	for _, breakSlice := range breakSlices {
		for _, zoneID := range breakSlice.ZoneIDs {
			if zoneID == "" {
				continue
			}
			zoneToBreakSliceIDs[zoneID] = append(zoneToBreakSliceIDs[zoneID], breakSlice.ID)
		}
	}
	result := make([]models.RawMaterialBatchOptimizerHeatZoneAttribution, 0, len(attributions))
	for _, attribution := range attributions {
		attribution.ClusterID = zoneToClusterID[attribution.ZoneID]
		attribution.BreakSliceIDs = append([]string(nil), zoneToBreakSliceIDs[attribution.ZoneID]...)
		result = append(result, attribution)
	}
	return result
}
