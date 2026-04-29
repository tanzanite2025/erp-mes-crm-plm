package services

import (
	"fmt"
	"sort"
	"xdfc-server/models"
)

type rawMaterialBatchGeometryPlacement struct {
	DemandLine         rawMaterialBatchOptimizerContextDemandLine
	EnvelopeX          float64
	EnvelopeY          float64
	EnvelopeWidthMM    float64
	EnvelopeLengthMM   float64
	ActualPolygon      rawMaterialGeometryPolygon
	ResidualPolygons   []rawMaterialGeometryPolygon
	PhysicalPieceIndex int
}

type rawMaterialBatchGeometryDemandPlacementSummary struct {
	DemandLineID         string
	AllocatedSets        int
	AllocatedPieces      int
	PlacedPhysicalPieces int
}

type rawMaterialBatchGeometryPlacementResult struct {
	Assignments            []models.RawMaterialBatchOptimizerPlanAssignment
	UnfulfilledLines       []models.RawMaterialBatchOptimizerUnfulfilledLine
	ConsumedAreaM2         float64
	FulfilledSets          int
	FulfilledPieces        int
	MustFulfillSatisfied   bool
	GeometryReuseHitCount  int
	ReusableResidualAreaM2 float64
	GeometryLayoutSummary  *models.RawMaterialBatchOptimizerGeometryLayoutSummary
	ResidualFragmentCount  int
}

func canSolveRawMaterialBatchOptimizerPhase2Geometry(context rawMaterialBatchOptimizerContext) bool {
	if len(context.Rolls) != 1 || len(context.DemandLines) == 0 {
		return false
	}
	for _, demandLine := range context.DemandLines {
		if demandLine.WidthMM <= 0 || demandLine.LengthMM <= 0 {
			return false
		}
		if demandLine.CutAngleDeg != 0 && demandLine.CutAngleDeg != 45 {
			return false
		}
	}
	return true
}

func seedRawMaterialBatchOptimizerPhase2GeometryCandidates(
	context rawMaterialBatchOptimizerContext,
) []rawMaterialBatchOptimizerCandidatePlan {
	if !canSolveRawMaterialBatchOptimizerPhase2Geometry(context) {
		return []rawMaterialBatchOptimizerCandidatePlan{}
	}
	strategies := []struct {
		key         string
		explanation string
		order       []rawMaterialBatchOptimizerContextDemandLine
	}{
		{
			key:         "phase2-geometry-priority-first",
			explanation: "第二批真几何按 mustFulfill、priority 与默认顺序进行多需求 placement。",
			order:       cloneRawMaterialBatchOptimizerDemandLines(context.DemandLines),
		},
		{
			key:         "phase2-geometry-area-first",
			explanation: "第二批真几何按 mustFulfill、priority 与占用面积优先进行多需求 placement。",
			order:       orderRawMaterialBatchOptimizerPhase2DemandLinesByArea(context.DemandLines),
		},
		{
			key:         "phase2-geometry-no-mix-first",
			explanation: "第二批真几何优先处理禁混需求，降低同卷混放冲突。",
			order:       orderRawMaterialBatchOptimizerPhase2DemandLinesByMixRestriction(context.DemandLines),
		},
	}
	candidates := make([]rawMaterialBatchOptimizerCandidatePlan, 0, len(strategies))
	seen := make(map[string]struct{}, len(strategies))
	for _, strategy := range strategies {
		placementResult := buildRawMaterialBatchOptimizerPhase2GeometryPlacement(context, strategy.order)
		candidate := rawMaterialBatchOptimizerCandidatePlan{
			Assignments:           placementResult.Assignments,
			UnfulfilledLines:      placementResult.UnfulfilledLines,
			ConsumedAreaM2:        placementResult.ConsumedAreaM2,
			FulfilledSets:         placementResult.FulfilledSets,
			FulfilledPieces:       placementResult.FulfilledPieces,
			MustFulfillSatisfied:  placementResult.MustFulfillSatisfied,
			StrategyKey:           strategy.key,
			Explanation:           strategy.explanation,
			GeometryLayoutSummary: placementResult.GeometryLayoutSummary,
		}
		signature := buildRawMaterialBatchOptimizerCandidateSignature(candidate)
		if _, exists := seen[signature]; exists {
			continue
		}
		seen[signature] = struct{}{}
		candidates = append(candidates, candidate)
	}
	if len(candidates) == 0 {
		return []rawMaterialBatchOptimizerCandidatePlan{buildRawMaterialBatchOptimizerPhase1GeometryCandidate(context)}
	}
	return candidates
}

func orderRawMaterialBatchOptimizerPhase2DemandLinesByArea(
	demandLines []rawMaterialBatchOptimizerContextDemandLine,
) []rawMaterialBatchOptimizerContextDemandLine {
	ordered := cloneRawMaterialBatchOptimizerDemandLines(demandLines)
	sort.SliceStable(ordered, func(i int, j int) bool {
		left := ordered[i]
		right := ordered[j]
		if left.Input.MustFulfill != right.Input.MustFulfill {
			return left.Input.MustFulfill
		}
		if left.Input.Priority != right.Input.Priority {
			return left.Input.Priority > right.Input.Priority
		}
		if left.PieceAreaM2 == right.PieceAreaM2 {
			return left.Input.DemandLineID < right.Input.DemandLineID
		}
		return left.PieceAreaM2 > right.PieceAreaM2
	})
	return ordered
}

func orderRawMaterialBatchOptimizerPhase2DemandLinesByMixRestriction(
	demandLines []rawMaterialBatchOptimizerContextDemandLine,
) []rawMaterialBatchOptimizerContextDemandLine {
	ordered := cloneRawMaterialBatchOptimizerDemandLines(demandLines)
	sort.SliceStable(ordered, func(i int, j int) bool {
		left := ordered[i]
		right := ordered[j]
		if left.Input.MustFulfill != right.Input.MustFulfill {
			return left.Input.MustFulfill
		}
		if left.IsMixRestricted != right.IsMixRestricted {
			return left.IsMixRestricted
		}
		if left.Input.Priority != right.Input.Priority {
			return left.Input.Priority > right.Input.Priority
		}
		return left.Input.DemandLineID < right.Input.DemandLineID
	})
	return ordered
}

func buildRawMaterialBatchOptimizerPhase2GeometryPlacement(
	context rawMaterialBatchOptimizerContext,
	orderedDemandLines []rawMaterialBatchOptimizerContextDemandLine,
) rawMaterialBatchGeometryPlacementResult {
	roll := context.Rolls[0]
	usableX := roll.EffectiveEdgeTrimMM
	usableY := roll.EffectiveEdgeTrimMM
	usableWidthMM := maxFloat64(roll.Input.RollWidthMM-roll.EffectiveEdgeTrimMM*2, 0)
	usableLengthMM := maxFloat64(roll.RollLengthMM-roll.EffectiveEdgeTrimMM*2, 0)
	rowX := usableX
	rowY := usableY
	rowHeight := 0.0
	rollState := ensureRawMaterialBatchOptimizerRollState(make(map[string]*rawMaterialBatchOptimizerRollAllocationState), roll.Input.RollID)
	placements := make([]rawMaterialBatchGeometryPlacement, 0)
	demandSummaries := make(map[string]*rawMaterialBatchGeometryDemandPlacementSummary, len(orderedDemandLines))
	consumedAreaM2 := 0.0
	fulfilledSets := 0
	fulfilledPieces := 0

	for _, demandLine := range orderedDemandLines {
		summary := &rawMaterialBatchGeometryDemandPlacementSummary{DemandLineID: demandLine.Input.DemandLineID}
		demandSummaries[demandLine.Input.DemandLineID] = summary
		if !isRawMaterialBatchOptimizerDemandCompatibleWithRoll(demandLine, rollState) {
			continue
		}
		piecesPerSetPhysical := maxInt(demandLine.PieceCountPerSet*demandLine.LayupCount, 1)
		for setIndex := 0; setIndex < demandLine.RequiredSets; setIndex += 1 {
			tentativePlacements := make([]rawMaterialBatchGeometryPlacement, 0, piecesPerSetPhysical)
			nextRowX := rowX
			nextRowY := rowY
			nextRowHeight := rowHeight
			canPlaceSet := true
			for pieceIndex := 0; pieceIndex < piecesPerSetPhysical; pieceIndex += 1 {
				envelopeWidthMM := maxFloat64(demandLine.WidthMM, 0)
				envelopeLengthMM := maxFloat64(demandLine.LengthMM, 0)
				placementX := nextRowX
				placementY := nextRowY
				if placementX > usableX && placementX+envelopeWidthMM > usableX+usableWidthMM {
					placementX = usableX
					placementY = nextRowY + nextRowHeight + maxFloat64(context.KnifeGapMM, 0)
					nextRowHeight = 0
				}
				if placementX == usableX && envelopeWidthMM > usableWidthMM {
					canPlaceSet = false
					break
				}
				if placementY+envelopeLengthMM > usableY+usableLengthMM {
					canPlaceSet = false
					break
				}
				actualPolygon := buildRawMaterialCenteredRotatedRectanglePolygon(
					demandLine.ActualWidthMM,
					demandLine.ActualLengthMM,
					demandLine.CutAngleDeg,
					placementX+envelopeWidthMM/2,
					placementY+envelopeLengthMM/2,
				)
				residualPolygons := buildRawMaterialBatchOptimizerPhase1CellResidualPolygons(
					placementX,
					placementY,
					envelopeWidthMM,
					envelopeLengthMM,
					demandLine.CutAngleDeg,
					actualPolygon,
				)
				tentativePlacements = append(tentativePlacements, rawMaterialBatchGeometryPlacement{
					DemandLine:         demandLine,
					EnvelopeX:          placementX,
					EnvelopeY:          placementY,
					EnvelopeWidthMM:    envelopeWidthMM,
					EnvelopeLengthMM:   envelopeLengthMM,
					ActualPolygon:      actualPolygon,
					ResidualPolygons:   residualPolygons,
					PhysicalPieceIndex: summary.PlacedPhysicalPieces + pieceIndex + 1,
				})
				nextRowX = placementX + envelopeWidthMM + maxFloat64(context.KnifeGapMM, 0)
				nextRowY = placementY
				nextRowHeight = maxFloat64(nextRowHeight, envelopeLengthMM)
			}
			if !canPlaceSet {
				break
			}
			placements = append(placements, tentativePlacements...)
			rowX = nextRowX
			rowY = nextRowY
			rowHeight = nextRowHeight
			summary.AllocatedSets += 1
			summary.AllocatedPieces += demandLine.PieceCountPerSet
			summary.PlacedPhysicalPieces += len(tentativePlacements)
			fulfilledSets += 1
			fulfilledPieces += demandLine.PieceCountPerSet
			consumedAreaM2 += float64(demandLine.PieceCountPerSet*demandLine.LayupCount) * demandLine.PieceAreaM2
		}
		if summary.AllocatedSets > 0 {
			updateRawMaterialBatchOptimizerRollState(rollState, demandLine)
		}
	}

	assignments := make([]models.RawMaterialBatchOptimizerPlanAssignment, 0, len(demandSummaries))
	unfulfilledLines := make([]models.RawMaterialBatchOptimizerUnfulfilledLine, 0)
	mustFulfillSatisfied := true
	for _, demandLine := range orderedDemandLines {
		summary := demandSummaries[demandLine.Input.DemandLineID]
		if summary == nil {
			summary = &rawMaterialBatchGeometryDemandPlacementSummary{DemandLineID: demandLine.Input.DemandLineID}
		}
		if summary.AllocatedSets > 0 {
			assignments = append(assignments, models.RawMaterialBatchOptimizerPlanAssignment{
				RollID:          roll.Input.RollID,
				DemandLineID:    demandLine.Input.DemandLineID,
				AllocatedSets:   summary.AllocatedSets,
				AllocatedPieces: summary.AllocatedPieces,
			})
		}
		remainingSets := maxInt(demandLine.RequiredSets-summary.AllocatedSets, 0)
		remainingPieces := maxInt(demandLine.RequiredPieces-summary.AllocatedPieces, 0)
		if remainingSets > 0 || remainingPieces > 0 {
			reason := "第二批真几何多需求场景下当前卷材剩余空间不足或基础规则冲突。"
			if demandLine.Input.MustFulfill {
				mustFulfillSatisfied = false
				reason = "mustFulfill 需求在第二批真几何多需求场景下未完全满足。"
			}
			if summary.AllocatedSets == 0 && !isRawMaterialBatchOptimizerDemandCompatibleWithRoll(demandLine, rollState) {
				reason = "第二批真几何基础规则判定该需求与当前卷材已放置内容不兼容。"
			}
			unfulfilledLines = append(unfulfilledLines, models.RawMaterialBatchOptimizerUnfulfilledLine{
				DemandLineID:    demandLine.Input.DemandLineID,
				RemainingSets:   remainingSets,
				RemainingPieces: remainingPieces,
				Reason:          reason,
			})
		}
	}

	geometryLayoutSummary, residualFragmentCount := buildRawMaterialBatchOptimizerPhase2GeometryLayoutSummary(
		roll,
		placements,
		usableX,
		usableY,
		usableWidthMM,
		usableLengthMM,
		rowY,
		rowHeight,
	)

	return rawMaterialBatchGeometryPlacementResult{
		Assignments:           assignments,
		UnfulfilledLines:      unfulfilledLines,
		ConsumedAreaM2:        roundRawMaterialBatchOptimizer(consumedAreaM2, 3),
		FulfilledSets:         fulfilledSets,
		FulfilledPieces:       fulfilledPieces,
		MustFulfillSatisfied:  mustFulfillSatisfied,
		GeometryLayoutSummary: geometryLayoutSummary,
		ResidualFragmentCount: residualFragmentCount,
	}
}

func buildRawMaterialBatchOptimizerPhase2GeometryLayoutSummary(
	roll rawMaterialBatchOptimizerContextRoll,
	placements []rawMaterialBatchGeometryPlacement,
	usableX float64,
	usableY float64,
	usableWidthMM float64,
	usableLengthMM float64,
	currentRowY float64,
	currentRowHeight float64,
) (*models.RawMaterialBatchOptimizerGeometryLayoutSummary, int) {
	zones := make([]models.RawMaterialBatchOptimizerGeometryLayoutZone, 0, 8+len(placements)*5)
	rollPolygon := buildRawMaterialRectanglePolygon(0, 0, roll.Input.RollWidthMM, roll.RollLengthMM)
	zones = append(zones, models.RawMaterialBatchOptimizerGeometryLayoutZone{
		ID:            fmt.Sprintf("geo-roll-%s", roll.Input.RollID),
		Kind:          "roll",
		UsageCategory: "roll",
		Label:         "Roll",
		Detail:        roll.Input.RollID,
		RollID:        roll.Input.RollID,
		AreaM2:        roundRawMaterialBatchOptimizer(rawMaterialGeometryPolygonArea(rollPolygon), 3),
		TooltipLines:  []string{fmt.Sprintf("卷材: %s", roll.Input.RollID)},
		PolygonPoints: toRawMaterialBatchOptimizerGeometryPoints(rollPolygon.Points),
	})
	residualFragmentCount := 0
	if roll.EffectiveEdgeTrimMM > 0 {
		trimZones := buildRawMaterialBatchOptimizerPhase1TrimZones(roll)
		zones = append(zones, trimZones...)
	}
	pieceAreaTotalByDemand := make(map[string]float64)
	for _, placement := range placements {
		pieceAreaTotalByDemand[placement.DemandLine.Input.DemandLineID] += rawMaterialGeometryPolygonArea(placement.ActualPolygon)
	}
	demandPieceIndex := make(map[string]int)
	for _, placement := range placements {
		demandLineID := placement.DemandLine.Input.DemandLineID
		demandPieceIndex[demandLineID] += 1
		pieceAreaM2 := roundRawMaterialBatchOptimizer(rawMaterialGeometryPolygonArea(placement.ActualPolygon), 6)
		coverageSharePercent := 0.0
		if pieceAreaTotalByDemand[demandLineID] > 0 {
			coverageSharePercent = roundRawMaterialBatchOptimizer((pieceAreaM2/pieceAreaTotalByDemand[demandLineID])*100, 2)
		}
		zones = append(zones, models.RawMaterialBatchOptimizerGeometryLayoutZone{
			ID:                   fmt.Sprintf("geo-piece-%s-%d", demandLineID, demandPieceIndex[demandLineID]),
			Kind:                 "piece",
			UsageCategory:        "piece",
			Label:                fmt.Sprintf("%s-P%d", demandLineID, demandPieceIndex[demandLineID]),
			Detail:               fmt.Sprintf("%s / %.1f°", demandLineID, placement.DemandLine.CutAngleDeg),
			RollID:               roll.Input.RollID,
			DemandLineID:         demandLineID,
			AreaM2:               pieceAreaM2,
			AllocatedPieces:      1,
			CoverageSharePercent: coverageSharePercent,
			TooltipLines: []string{
				fmt.Sprintf("需求行: %s", demandLineID),
				fmt.Sprintf("裁切角度: %.1f°", placement.DemandLine.CutAngleDeg),
				fmt.Sprintf("实际面积: %.6f m2", pieceAreaM2),
			},
			PolygonPoints: toRawMaterialBatchOptimizerGeometryPoints(placement.ActualPolygon.Points),
		})
		for residualIndex, residualPolygon := range placement.ResidualPolygons {
			residualAreaM2 := roundRawMaterialBatchOptimizer(rawMaterialGeometryPolygonArea(residualPolygon), 6)
			if residualAreaM2 <= 0 {
				continue
			}
			residualFragmentCount += 1
			zones = append(zones, models.RawMaterialBatchOptimizerGeometryLayoutZone{
				ID:            fmt.Sprintf("geo-residual-%s-%d-%d", demandLineID, demandPieceIndex[demandLineID], residualIndex+1),
				Kind:          "loss",
				UsageCategory: "residual",
				Label:         "Residual",
				Detail:        fmt.Sprintf("%s residual", demandLineID),
				RollID:        roll.Input.RollID,
				DemandLineID:  demandLineID,
				AreaM2:        residualAreaM2,
				TooltipLines: []string{
					fmt.Sprintf("需求行: %s", demandLineID),
					fmt.Sprintf("余料面积: %.6f m2", residualAreaM2),
				},
				PolygonPoints: toRawMaterialBatchOptimizerGeometryPoints(residualPolygon.Points),
			})
		}
	}
	if len(placements) > 0 {
		rowGroups := make(map[float64][]rawMaterialBatchGeometryPlacement)
		rowOrder := make([]float64, 0)
		rowSeen := make(map[float64]struct{})
		for _, placement := range placements {
			rowGroups[placement.EnvelopeY] = append(rowGroups[placement.EnvelopeY], placement)
			if _, exists := rowSeen[placement.EnvelopeY]; !exists {
				rowSeen[placement.EnvelopeY] = struct{}{}
				rowOrder = append(rowOrder, placement.EnvelopeY)
			}
		}
		sort.Float64s(rowOrder)
		for rowIndex, rowStartY := range rowOrder {
			rowPlacements := rowGroups[rowStartY]
			rowRightEdge := usableX
			rowHeight := 0.0
			for _, placement := range rowPlacements {
				rowRightEdge = maxFloat64(rowRightEdge, placement.EnvelopeX+placement.EnvelopeWidthMM)
				rowHeight = maxFloat64(rowHeight, placement.EnvelopeLengthMM)
			}
			if rowRightEdge < usableX+usableWidthMM {
				unusedWidthPolygon := buildRawMaterialRectanglePolygon(rowRightEdge, rowStartY, usableX+usableWidthMM-rowRightEdge, rowHeight)
				unusedAreaM2 := roundRawMaterialBatchOptimizer(rawMaterialGeometryPolygonArea(unusedWidthPolygon), 3)
				if unusedAreaM2 > 0 {
					residualFragmentCount += 1
					zones = append(zones, models.RawMaterialBatchOptimizerGeometryLayoutZone{
						ID:            fmt.Sprintf("geo-row-unused-width-%d", rowIndex+1),
						Kind:          "loss",
						UsageCategory: "leftover",
						Label:         "Unused Width",
						Detail:        fmt.Sprintf("%.3f m2", unusedAreaM2),
						RollID:        roll.Input.RollID,
						AreaM2:        unusedAreaM2,
						TooltipLines:  []string{fmt.Sprintf("卷材: %s", roll.Input.RollID), fmt.Sprintf("行尾余料: %.3f m2", unusedAreaM2)},
						PolygonPoints: toRawMaterialBatchOptimizerGeometryPoints(unusedWidthPolygon.Points),
					})
				}
			}
		}
	}
	usedTailStartY := usableY
	if len(placements) > 0 {
		usedTailStartY = currentRowY + currentRowHeight
	}
	if usedTailStartY < usableY+usableLengthMM {
		unusedTailPolygon := buildRawMaterialRectanglePolygon(usableX, usedTailStartY, usableWidthMM, usableY+usableLengthMM-usedTailStartY)
		unusedAreaM2 := roundRawMaterialBatchOptimizer(rawMaterialGeometryPolygonArea(unusedTailPolygon), 3)
		if unusedAreaM2 > 0 {
			residualFragmentCount += 1
			zones = append(zones, models.RawMaterialBatchOptimizerGeometryLayoutZone{
				ID:            fmt.Sprintf("geo-roll-%s-unused-tail", roll.Input.RollID),
				Kind:          "loss",
				UsageCategory: "leftover",
				Label:         "Unused Tail",
				Detail:        fmt.Sprintf("%.3f m2", unusedAreaM2),
				RollID:        roll.Input.RollID,
				AreaM2:        unusedAreaM2,
				TooltipLines:  []string{fmt.Sprintf("卷材: %s", roll.Input.RollID), fmt.Sprintf("尾料面积: %.3f m2", unusedAreaM2)},
				PolygonPoints: toRawMaterialBatchOptimizerGeometryPoints(unusedTailPolygon.Points),
			})
		}
	}
	return &models.RawMaterialBatchOptimizerGeometryLayoutSummary{
		CanvasWidthMM:  roundRawMaterialBatchOptimizer(roll.Input.RollWidthMM, 3),
		CanvasHeightMM: roundRawMaterialBatchOptimizer(roll.RollLengthMM, 3),
		Zones:          zones,
	}, residualFragmentCount
}

func buildRawMaterialBatchOptimizerPhase1TrimZones(
	roll rawMaterialBatchOptimizerContextRoll,
) []models.RawMaterialBatchOptimizerGeometryLayoutZone {
	trimPolygons := []struct {
		idSuffix string
		label    string
		polygon  rawMaterialGeometryPolygon
	}{
		{
			idSuffix: "trim-left",
			label:    "Left Trim",
			polygon:  buildRawMaterialRectanglePolygon(0, 0, roll.EffectiveEdgeTrimMM, roll.RollLengthMM),
		},
		{
			idSuffix: "trim-right",
			label:    "Right Trim",
			polygon:  buildRawMaterialRectanglePolygon(roll.Input.RollWidthMM-roll.EffectiveEdgeTrimMM, 0, roll.EffectiveEdgeTrimMM, roll.RollLengthMM),
		},
		{
			idSuffix: "trim-top",
			label:    "Top Trim",
			polygon:  buildRawMaterialRectanglePolygon(roll.EffectiveEdgeTrimMM, 0, maxFloat64(roll.Input.RollWidthMM-roll.EffectiveEdgeTrimMM*2, 0), roll.EffectiveEdgeTrimMM),
		},
		{
			idSuffix: "trim-bottom",
			label:    "Bottom Trim",
			polygon:  buildRawMaterialRectanglePolygon(roll.EffectiveEdgeTrimMM, roll.RollLengthMM-roll.EffectiveEdgeTrimMM, maxFloat64(roll.Input.RollWidthMM-roll.EffectiveEdgeTrimMM*2, 0), roll.EffectiveEdgeTrimMM),
		},
	}
	zones := make([]models.RawMaterialBatchOptimizerGeometryLayoutZone, 0, len(trimPolygons))
	for _, trim := range trimPolygons {
		if len(trim.polygon.Points) == 0 {
			continue
		}
		zones = append(zones, models.RawMaterialBatchOptimizerGeometryLayoutZone{
			ID:            fmt.Sprintf("geo-roll-%s-%s", roll.Input.RollID, trim.idSuffix),
			Kind:          "loss",
			UsageCategory: "trim",
			Label:         trim.label,
			Detail:        fmt.Sprintf("%.1f mm", roll.EffectiveEdgeTrimMM),
			RollID:        roll.Input.RollID,
			AreaM2:        roundRawMaterialBatchOptimizer(rawMaterialGeometryPolygonArea(trim.polygon), 3),
			TooltipLines:  []string{fmt.Sprintf("卷材: %s", roll.Input.RollID), fmt.Sprintf("修边: %.1f mm", roll.EffectiveEdgeTrimMM)},
			PolygonPoints: toRawMaterialBatchOptimizerGeometryPoints(trim.polygon.Points),
		})
	}
	return zones
}
