package services

import (
	"fmt"
	"sort"
	"xdfc-server/models"
)

const rawMaterialBatchOptimizerCanvasRollWidthMM = 180.0
const rawMaterialBatchOptimizerCanvasRollHeightMM = 960.0
const rawMaterialBatchOptimizerCanvasRollGapMM = 40.0

func buildRawMaterialBatchOptimizerPlanLayoutSummary(
	candidate rawMaterialBatchOptimizerCandidatePlan,
	context rawMaterialBatchOptimizerContext,
) models.RawMaterialBatchOptimizerPlanLayoutSummary {
	demandLookup := make(map[string]rawMaterialBatchOptimizerContextDemandLine, len(context.DemandLines))
	for _, demandLine := range context.DemandLines {
		demandLookup[demandLine.Input.DemandLineID] = demandLine
	}

	rollAssignments := make(map[string][]models.RawMaterialBatchOptimizerPlanAssignment, len(context.Rolls))
	rollAreaUsage := make(map[string]float64, len(context.Rolls))
	demandAllocatedSets := make(map[string]int, len(context.DemandLines))
	demandAllocatedPieces := make(map[string]int, len(context.DemandLines))
	demandRolls := make(map[string]map[string]struct{}, len(context.DemandLines))
	demandZones := make(map[string][]string, len(context.DemandLines))
	for _, assignment := range candidate.Assignments {
		rollAssignments[assignment.RollID] = append(rollAssignments[assignment.RollID], assignment)
		demandLine := demandLookup[assignment.DemandLineID]
		areaPerSetM2 := float64(demandLine.PieceCountPerSet*demandLine.LayupCount) * demandLine.PieceAreaM2
		rollAreaUsage[assignment.RollID] += float64(assignment.AllocatedSets) * areaPerSetM2
		demandAllocatedSets[assignment.DemandLineID] += assignment.AllocatedSets
		demandAllocatedPieces[assignment.DemandLineID] += assignment.AllocatedPieces
		if demandRolls[assignment.DemandLineID] == nil {
			demandRolls[assignment.DemandLineID] = make(map[string]struct{})
		}
		demandRolls[assignment.DemandLineID][assignment.RollID] = struct{}{}
	}

	rollSummaries := make([]models.RawMaterialBatchOptimizerPlanLayoutRollSummary, 0, len(context.Rolls))
	zones := make([]models.RawMaterialBatchOptimizerPlanLayoutZone, 0, len(context.Rolls)*8)
	for index, roll := range context.Rolls {
		usedArea := roundRawMaterialBatchOptimizer(rollAreaUsage[roll.Input.RollID], 3)
		rollUtilizationPercent := 0.0
		if roll.RollAreaM2 > 0 {
			rollUtilizationPercent = roundRawMaterialBatchOptimizer((usedArea/roll.RollAreaM2)*100, 2)
		}
		assignmentSlice := rollAssignments[roll.Input.RollID]
		allocatedSets := 0
		allocatedPieces := 0
		for _, assignment := range assignmentSlice {
			allocatedSets += assignment.AllocatedSets
			allocatedPieces += assignment.AllocatedPieces
		}
		unusedArea := roundRawMaterialBatchOptimizer(maxFloat64(roll.RollAreaM2-usedArea, 0), 3)
		rollSummaries = append(rollSummaries, models.RawMaterialBatchOptimizerPlanLayoutRollSummary{
			RollID:             roll.Input.RollID,
			AllocatedSets:      allocatedSets,
			AllocatedPieces:    allocatedPieces,
			UtilizedAreaM2:     usedArea,
			UtilizationPercent: rollUtilizationPercent,
			UnusedAreaM2:       unusedArea,
			IsUsed:             allocatedSets > 0 || allocatedPieces > 0,
		})

		x := float64(index) * (rawMaterialBatchOptimizerCanvasRollWidthMM + rawMaterialBatchOptimizerCanvasRollGapMM)
		leftTrimWidthMM := rawMaterialBatchOptimizerCanvasRollWidthMM * safeDivide(roll.EffectiveEdgeTrimMM, roll.Input.RollWidthMM)
		rightTrimWidthMM := leftTrimWidthMM
		usableWidthMM := maxFloat64(rawMaterialBatchOptimizerCanvasRollWidthMM-leftTrimWidthMM-rightTrimWidthMM, 24)
		zones = append(zones, models.RawMaterialBatchOptimizerPlanLayoutZone{
			ID:                   fmt.Sprintf("plan-roll-%s", roll.Input.RollID),
			Kind:                 "roll",
			UsageCategory:        "roll",
			Label:                fmt.Sprintf("Roll %d", index+1),
			Detail:               fmt.Sprintf("%s / %.2f%%", roll.Input.RollID, rollUtilizationPercent),
			RollID:               roll.Input.RollID,
			AreaM2:               roundRawMaterialBatchOptimizer(roll.RollAreaM2, 3),
			AllocatedSets:        allocatedSets,
			AllocatedPieces:      allocatedPieces,
			CoverageSharePercent: rollUtilizationPercent,
			TooltipLines: []string{
				fmt.Sprintf("卷材: %s", roll.Input.RollID),
				fmt.Sprintf("利用率: %.2f%%", rollUtilizationPercent),
				fmt.Sprintf("已用面积: %.3f m2", usedArea),
				fmt.Sprintf("剩余面积: %.3f m2", unusedArea),
			},
			X:      x,
			Y:      0,
			Width:  rawMaterialBatchOptimizerCanvasRollWidthMM,
			Height: rawMaterialBatchOptimizerCanvasRollHeightMM,
		})

		if leftTrimWidthMM > 0 {
			trimArea := roundRawMaterialBatchOptimizer((roll.EffectiveEdgeTrimMM*roll.RollLengthMM)/1_000_000, 3)
			zones = append(zones, models.RawMaterialBatchOptimizerPlanLayoutZone{
				ID:                   fmt.Sprintf("plan-roll-%s-trim-left", roll.Input.RollID),
				Kind:                 "loss",
				UsageCategory:        "trim",
				Label:                "Left Trim",
				Detail:               fmt.Sprintf("%.1f mm edge trim", roll.EffectiveEdgeTrimMM),
				RollID:               roll.Input.RollID,
				AreaM2:               trimArea,
				CoverageSharePercent: 0,
				TooltipLines: []string{
					fmt.Sprintf("卷材: %s", roll.Input.RollID),
					fmt.Sprintf("左侧修边: %.1f mm", roll.EffectiveEdgeTrimMM),
					fmt.Sprintf("面积: %.3f m2", trimArea),
				},
				X:      x,
				Y:      0,
				Width:  leftTrimWidthMM,
				Height: rawMaterialBatchOptimizerCanvasRollHeightMM,
			})
			zones = append(zones, models.RawMaterialBatchOptimizerPlanLayoutZone{
				ID:                   fmt.Sprintf("plan-roll-%s-trim-right", roll.Input.RollID),
				Kind:                 "loss",
				UsageCategory:        "trim",
				Label:                "Right Trim",
				Detail:               fmt.Sprintf("%.1f mm edge trim", roll.EffectiveEdgeTrimMM),
				RollID:               roll.Input.RollID,
				AreaM2:               trimArea,
				CoverageSharePercent: 0,
				TooltipLines: []string{
					fmt.Sprintf("卷材: %s", roll.Input.RollID),
					fmt.Sprintf("右侧修边: %.1f mm", roll.EffectiveEdgeTrimMM),
					fmt.Sprintf("面积: %.3f m2", trimArea),
				},
				X:      x + rawMaterialBatchOptimizerCanvasRollWidthMM - rightTrimWidthMM,
				Y:      0,
				Width:  rightTrimWidthMM,
				Height: rawMaterialBatchOptimizerCanvasRollHeightMM,
			})
		}

		totalDemandWidthMM := 0.0
		for _, assignment := range assignmentSlice {
			demandLine := demandLookup[assignment.DemandLineID]
			totalDemandWidthMM += maxFloat64(demandLine.WidthMM, 1)
		}
		if totalDemandWidthMM <= 0 {
			totalDemandWidthMM = float64(maxInt(len(assignmentSlice), 1))
		}

		currentX := x + leftTrimWidthMM
		for assignmentIndex, assignment := range assignmentSlice {
			demandLine := demandLookup[assignment.DemandLineID]
			zoneArea := roundRawMaterialBatchOptimizer(float64(assignment.AllocatedSets*demandLine.PieceCountPerSet*demandLine.LayupCount)*demandLine.PieceAreaM2, 3)
			coverageSharePercent := 0.0
			if usedArea > 0 {
				coverageSharePercent = roundRawMaterialBatchOptimizer((zoneArea/usedArea)*100, 2)
			}
			laneWidthMM := usableWidthMM * safeDivide(maxFloat64(demandLine.WidthMM, 1), totalDemandWidthMM)
			if assignmentIndex == len(assignmentSlice)-1 {
				laneWidthMM = x + rawMaterialBatchOptimizerCanvasRollWidthMM - rightTrimWidthMM - currentX
			}
			laneWidthMM = maxFloat64(laneWidthMM, 24)
			pieceHeightMM := rawMaterialBatchOptimizerCanvasRollHeightMM * safeDivide(zoneArea, roll.RollAreaM2)
			pieceHeightMM = maxFloat64(pieceHeightMM, 48)
			pieceHeightMM = minFloat64(pieceHeightMM, rawMaterialBatchOptimizerCanvasRollHeightMM)
			stripZoneID := fmt.Sprintf("plan-roll-%s-demand-%s-strip-%d", roll.Input.RollID, assignment.DemandLineID, assignmentIndex+1)
			zones = append(zones, models.RawMaterialBatchOptimizerPlanLayoutZone{
				ID:                   stripZoneID,
				Kind:                 "strip",
				UsageCategory:        "strip",
				Label:                fmt.Sprintf("%s Strip", assignment.DemandLineID),
				Detail:               fmt.Sprintf("%d sets / %.1fmm", assignment.AllocatedSets, demandLine.WidthMM),
				RollID:               roll.Input.RollID,
				DemandLineID:         assignment.DemandLineID,
				AreaM2:               zoneArea,
				AllocatedSets:        assignment.AllocatedSets,
				AllocatedPieces:      assignment.AllocatedPieces,
				CoverageSharePercent: coverageSharePercent,
				TooltipLines: []string{
					fmt.Sprintf("需求行: %s", assignment.DemandLineID),
					fmt.Sprintf("卷材: %s", roll.Input.RollID),
					fmt.Sprintf("条带宽度: %.1f mm", demandLine.WidthMM),
					fmt.Sprintf("分配: %d sets / %d pieces", assignment.AllocatedSets, assignment.AllocatedPieces),
				},
				X:      currentX,
				Y:      0,
				Width:  laneWidthMM,
				Height: rawMaterialBatchOptimizerCanvasRollHeightMM,
			})
			pieceZoneID := fmt.Sprintf("plan-roll-%s-demand-%s-piece-%d", roll.Input.RollID, assignment.DemandLineID, assignmentIndex+1)
			zones = append(zones, models.RawMaterialBatchOptimizerPlanLayoutZone{
				ID:                   pieceZoneID,
				Kind:                 "piece",
				UsageCategory:        "piece",
				Label:                assignment.DemandLineID,
				Detail:               fmt.Sprintf("%d sets / %d pieces", assignment.AllocatedSets, assignment.AllocatedPieces),
				RollID:               roll.Input.RollID,
				DemandLineID:         assignment.DemandLineID,
				AreaM2:               zoneArea,
				AllocatedSets:        assignment.AllocatedSets,
				AllocatedPieces:      assignment.AllocatedPieces,
				CoverageSharePercent: coverageSharePercent,
				TooltipLines: []string{
					fmt.Sprintf("需求行: %s", assignment.DemandLineID),
					fmt.Sprintf("卷材: %s", roll.Input.RollID),
					fmt.Sprintf("面积: %.3f m2", zoneArea),
					fmt.Sprintf("覆盖占比: %.2f%%", coverageSharePercent),
				},
				X:      currentX,
				Y:      0,
				Width:  laneWidthMM,
				Height: pieceHeightMM,
			})
			demandZones[assignment.DemandLineID] = append(demandZones[assignment.DemandLineID], stripZoneID, pieceZoneID)
			if pieceHeightMM < rawMaterialBatchOptimizerCanvasRollHeightMM {
				leftoverArea := roundRawMaterialBatchOptimizer(maxFloat64((roll.RollAreaM2*safeDivide(laneWidthMM, rawMaterialBatchOptimizerCanvasRollWidthMM))-zoneArea, 0), 3)
				zones = append(zones, models.RawMaterialBatchOptimizerPlanLayoutZone{
					ID:                   fmt.Sprintf("plan-roll-%s-demand-%s-leftover-%d", roll.Input.RollID, assignment.DemandLineID, assignmentIndex+1),
					Kind:                 "loss",
					UsageCategory:        "leftover",
					Label:                "Leftover",
					Detail:               fmt.Sprintf("%s unused tail", assignment.DemandLineID),
					RollID:               roll.Input.RollID,
					DemandLineID:         assignment.DemandLineID,
					AreaM2:               leftoverArea,
					CoverageSharePercent: 0,
					TooltipLines: []string{
						fmt.Sprintf("需求行: %s", assignment.DemandLineID),
						fmt.Sprintf("卷材: %s", roll.Input.RollID),
						fmt.Sprintf("尾料面积: %.3f m2", leftoverArea),
					},
					X:      currentX,
					Y:      pieceHeightMM,
					Width:  laneWidthMM,
					Height: rawMaterialBatchOptimizerCanvasRollHeightMM - pieceHeightMM,
				})
			}
			currentX += laneWidthMM
		}

		if currentX < x+rawMaterialBatchOptimizerCanvasRollWidthMM-rightTrimWidthMM {
			zones = append(zones, models.RawMaterialBatchOptimizerPlanLayoutZone{
				ID:                   fmt.Sprintf("plan-roll-%s-leftover", roll.Input.RollID),
				Kind:                 "loss",
				UsageCategory:        "leftover",
				Label:                "Unused Width",
				Detail:               fmt.Sprintf("%.3f m2", unusedArea),
				RollID:               roll.Input.RollID,
				AreaM2:               unusedArea,
				CoverageSharePercent: 0,
				TooltipLines: []string{
					fmt.Sprintf("卷材: %s", roll.Input.RollID),
					fmt.Sprintf("剩余面积: %.3f m2", unusedArea),
				},
				X:      currentX,
				Y:      0,
				Width:  x + rawMaterialBatchOptimizerCanvasRollWidthMM - rightTrimWidthMM - currentX,
				Height: rawMaterialBatchOptimizerCanvasRollHeightMM,
			})
		}
	}
	if candidate.GeometryLayoutSummary != nil {
		for _, zone := range candidate.GeometryLayoutSummary.Zones {
			if zone.DemandLineID == "" {
				continue
			}
			demandZones[zone.DemandLineID] = append(demandZones[zone.DemandLineID], zone.ID)
		}
	}

	demandSummaries := make([]models.RawMaterialBatchOptimizerPlanLayoutDemandSummary, 0, len(context.DemandLines))
	fulfilledDemandLineCount := 0
	unfulfilledLookup := make(map[string]models.RawMaterialBatchOptimizerUnfulfilledLine, len(candidate.UnfulfilledLines))
	for _, line := range candidate.UnfulfilledLines {
		unfulfilledLookup[line.DemandLineID] = line
	}
	for _, demandLine := range context.DemandLines {
		unfulfilled, hasUnfulfilled := unfulfilledLookup[demandLine.Input.DemandLineID]
		remainingSets := 0
		remainingPieces := 0
		fulfilled := !hasUnfulfilled
		if hasUnfulfilled {
			remainingSets = unfulfilled.RemainingSets
			remainingPieces = unfulfilled.RemainingPieces
		} else {
			fulfilledDemandLineCount += 1
		}
		rollIDs := make([]string, 0, len(demandRolls[demandLine.Input.DemandLineID]))
		for rollID := range demandRolls[demandLine.Input.DemandLineID] {
			rollIDs = append(rollIDs, rollID)
		}
		sort.Strings(rollIDs)
		zoneIDs := append([]string(nil), demandZones[demandLine.Input.DemandLineID]...)
		coveragePercent := 0.0
		if demandLine.RequiredSets > 0 {
			coveragePercent = roundRawMaterialBatchOptimizer((float64(demandAllocatedSets[demandLine.Input.DemandLineID])/float64(demandLine.RequiredSets))*100, 2)
		}
		demandSummaries = append(demandSummaries, models.RawMaterialBatchOptimizerPlanLayoutDemandSummary{
			DemandLineID:       demandLine.Input.DemandLineID,
			AllocatedSets:      demandAllocatedSets[demandLine.Input.DemandLineID],
			AllocatedPieces:    demandAllocatedPieces[demandLine.Input.DemandLineID],
			RollCount:          len(demandRolls[demandLine.Input.DemandLineID]),
			RemainingSets:      remainingSets,
			RemainingPieces:    remainingPieces,
			RequiredSets:       demandLine.RequiredSets,
			RequiredPieces:     demandLine.RequiredPieces,
			Fulfilled:          fulfilled,
			MustFulfill:        demandLine.Input.MustFulfill,
			IsSplitAcrossRolls: len(rollIDs) > 1,
			CoveragePercent:    coveragePercent,
			UsageType:          demandLine.Input.UsageType,
			Priority:           demandLine.Input.Priority,
			RollIDs:            rollIDs,
			ZoneIDs:            zoneIDs,
		})
	}
	sort.SliceStable(demandSummaries, func(i, j int) bool {
		if demandSummaries[i].RemainingSets == demandSummaries[j].RemainingSets {
			return demandSummaries[i].DemandLineID < demandSummaries[j].DemandLineID
		}
		return demandSummaries[i].RemainingSets > demandSummaries[j].RemainingSets
	})

	canvasWidthMM := float64(maxInt(len(context.Rolls), 1))*rawMaterialBatchOptimizerCanvasRollWidthMM + float64(maxInt(len(context.Rolls)-1, 0))*rawMaterialBatchOptimizerCanvasRollGapMM
	return models.RawMaterialBatchOptimizerPlanLayoutSummary{
		CanvasWidthMM:              canvasWidthMM,
		CanvasHeightMM:             rawMaterialBatchOptimizerCanvasRollHeightMM,
		RollCount:                  len(context.Rolls),
		AssignmentCount:            len(candidate.Assignments),
		FulfilledDemandLineCount:   fulfilledDemandLineCount,
		UnfulfilledDemandLineCount: len(candidate.UnfulfilledLines),
		Rolls:                      rollSummaries,
		DemandLines:                demandSummaries,
		Zones:                      zones,
	}
}

func buildRawMaterialBatchOptimizerPlanLossBreakdown(
	candidate rawMaterialBatchOptimizerCandidatePlan,
	context rawMaterialBatchOptimizerContext,
	lossAreaM2 float64,
) models.RawMaterialBatchOptimizerPlanLossBreakdown {
	trimLossAreaM2 := 0.0
	for _, roll := range context.Rolls {
		trimWidthMM := roll.EffectiveEdgeTrimMM * 2
		trimLossAreaM2 += ((trimWidthMM * roll.Input.RollLengthM * 1000) / 1_000_000)
	}

	demandLookup := make(map[string]rawMaterialBatchOptimizerContextDemandLine, len(context.DemandLines))
	for _, demandLine := range context.DemandLines {
		demandLookup[demandLine.Input.DemandLineID] = demandLine
	}
	unfulfilledAreaM2 := 0.0
	for _, line := range candidate.UnfulfilledLines {
		demandLine := demandLookup[line.DemandLineID]
		areaPerSetM2 := float64(demandLine.PieceCountPerSet*demandLine.LayupCount) * demandLine.PieceAreaM2
		unfulfilledAreaM2 += float64(line.RemainingSets) * areaPerSetM2
	}

	unusedRollAreaM2 := maxFloat64(lossAreaM2-unfulfilledAreaM2, 0)
	message := fmt.Sprintf(
		"未用卷材 %.3f m2，未满足需求面积 %.3f m2，预估修边损耗 %.3f m2。",
		roundRawMaterialBatchOptimizer(unusedRollAreaM2, 3),
		roundRawMaterialBatchOptimizer(unfulfilledAreaM2, 3),
		roundRawMaterialBatchOptimizer(trimLossAreaM2, 3),
	)

	return models.RawMaterialBatchOptimizerPlanLossBreakdown{
		UnusedRollAreaM2:  roundRawMaterialBatchOptimizer(unusedRollAreaM2, 3),
		UnfulfilledAreaM2: roundRawMaterialBatchOptimizer(unfulfilledAreaM2, 3),
		TrimLossAreaM2:    roundRawMaterialBatchOptimizer(trimLossAreaM2, 3),
		Message:           message,
	}
}

func safeDivide(left float64, right float64) float64 {
	if right <= 0 {
		return 0
	}
	return left / right
}

func minFloat64(left float64, right float64) float64 {
	if left < right {
		return left
	}
	return right
}
