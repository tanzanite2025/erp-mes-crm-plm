package services

import (
	"fmt"
	"math"
	"xdfc-server/models"
)

func canSolveRawMaterialBatchOptimizerPhase1Geometry(context rawMaterialBatchOptimizerContext) bool {
	if len(context.Rolls) != 1 || len(context.DemandLines) != 1 {
		return false
	}
	demandLine := context.DemandLines[0]
	if demandLine.WidthMM <= 0 || demandLine.LengthMM <= 0 {
		return false
	}
	return demandLine.CutAngleDeg == 0 || demandLine.CutAngleDeg == 45
}

func seedRawMaterialBatchOptimizerPhase1GeometryCandidates(
	context rawMaterialBatchOptimizerContext,
) []rawMaterialBatchOptimizerCandidatePlan {
	if !canSolveRawMaterialBatchOptimizerPhase1Geometry(context) {
		return []rawMaterialBatchOptimizerCandidatePlan{}
	}
	return []rawMaterialBatchOptimizerCandidatePlan{buildRawMaterialBatchOptimizerPhase1GeometryCandidate(context)}
}

func buildRawMaterialBatchOptimizerPhase1GeometryCandidate(
	context rawMaterialBatchOptimizerContext,
) rawMaterialBatchOptimizerCandidatePlan {
	roll := context.Rolls[0]
	demandLine := context.DemandLines[0]
	usableX := roll.EffectiveEdgeTrimMM
	usableY := roll.EffectiveEdgeTrimMM
	usableWidthMM := maxFloat64(roll.Input.RollWidthMM-roll.EffectiveEdgeTrimMM*2, 0)
	usableLengthMM := maxFloat64(roll.RollLengthMM-roll.EffectiveEdgeTrimMM*2, 0)
	pieceWidthMM := maxFloat64(demandLine.WidthMM, 0)
	pieceLengthMM := maxFloat64(demandLine.LengthMM, 0)
	pitchX := pieceWidthMM + maxFloat64(context.KnifeGapMM, 0)
	pitchY := pieceLengthMM + maxFloat64(context.KnifeGapMM, 0)
	stripCount := resolveRawMaterialBatchOptimizerPhase1RepeatCount(usableWidthMM, pieceWidthMM, context.KnifeGapMM)
	rowCount := resolveRawMaterialBatchOptimizerPhase1RepeatCount(usableLengthMM, pieceLengthMM, context.KnifeGapMM)
	totalSlots := stripCount * rowCount
	piecesPerSet := maxInt(demandLine.PieceCountPerSet*demandLine.LayupCount, 1)
	maxAllocatableSets := 0
	if piecesPerSet > 0 {
		maxAllocatableSets = totalSlots / piecesPerSet
	}
	allocatedSets := minIntRawMaterialBatchOptimizer(demandLine.RequiredSets, maxAllocatableSets)
	allocatedPieces := allocatedSets * demandLine.PieceCountPerSet
	placedPhysicalPieces := allocatedSets * piecesPerSet
	assignments := make([]models.RawMaterialBatchOptimizerPlanAssignment, 0, 1)
	if allocatedSets > 0 {
		assignments = append(assignments, models.RawMaterialBatchOptimizerPlanAssignment{
			RollID:          roll.Input.RollID,
			DemandLineID:    demandLine.Input.DemandLineID,
			AllocatedSets:   allocatedSets,
			AllocatedPieces: allocatedPieces,
		})
	}
	remainingSets := maxInt(demandLine.RequiredSets-allocatedSets, 0)
	remainingPieces := maxInt(demandLine.RequiredPieces-allocatedPieces, 0)
	unfulfilledLines := make([]models.RawMaterialBatchOptimizerUnfulfilledLine, 0, 1)
	mustFulfillSatisfied := true
	if remainingSets > 0 || remainingPieces > 0 {
		if demandLine.Input.MustFulfill {
			mustFulfillSatisfied = false
		}
		unfulfilledLines = append(unfulfilledLines, models.RawMaterialBatchOptimizerUnfulfilledLine{
			DemandLineID:    demandLine.Input.DemandLineID,
			RemainingSets:   remainingSets,
			RemainingPieces: remainingPieces,
			Reason:          "第一批真几何 MVP 下当前卷材可放置数量不足。",
		})
	}
	consumedAreaM2 := float64(allocatedSets*demandLine.PieceCountPerSet*demandLine.LayupCount) * demandLine.PieceAreaM2
	geometryLayout := buildRawMaterialBatchOptimizerPhase1GeometryLayoutSummary(
		roll,
		demandLine,
		stripCount,
		rowCount,
		placedPhysicalPieces,
		usableX,
		usableY,
		usableWidthMM,
		usableLengthMM,
		pieceWidthMM,
		pieceLengthMM,
		pitchX,
		pitchY,
	)
	return rawMaterialBatchOptimizerCandidatePlan{
		Assignments:           assignments,
		UnfulfilledLines:      unfulfilledLines,
		ConsumedAreaM2:        roundRawMaterialBatchOptimizer(consumedAreaM2, 3),
		FulfilledSets:         allocatedSets,
		FulfilledPieces:       allocatedPieces,
		MustFulfillSatisfied:  mustFulfillSatisfied,
		StrategyKey:           "phase1-geometry",
		Explanation:           "第一批真几何 MVP 已按单卷材/单尺寸 0°/45° 场景生成真实 polygon placement。",
		GeometryLayoutSummary: geometryLayout,
	}
}

func resolveRawMaterialBatchOptimizerPhase1RepeatCount(
	usableLength float64,
	pieceLength float64,
	knifeGap float64,
) int {
	if usableLength <= 0 || pieceLength <= 0 {
		return 0
	}
	pitch := pieceLength + maxFloat64(knifeGap, 0)
	if pitch <= 0 {
		return 0
	}
	return maxInt(int(math.Floor((usableLength+maxFloat64(knifeGap, 0))/pitch)), 0)
}

func buildRawMaterialBatchOptimizerPhase1GeometryLayoutSummary(
	roll rawMaterialBatchOptimizerContextRoll,
	demandLine rawMaterialBatchOptimizerContextDemandLine,
	stripCount int,
	rowCount int,
	placedPhysicalPieces int,
	usableX float64,
	usableY float64,
	usableWidthMM float64,
	usableLengthMM float64,
	pieceWidthMM float64,
	pieceLengthMM float64,
	pitchX float64,
	pitchY float64,
) *models.RawMaterialBatchOptimizerGeometryLayoutSummary {
	zones := make([]models.RawMaterialBatchOptimizerGeometryLayoutZone, 0, 8+placedPhysicalPieces*5)
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
	if roll.EffectiveEdgeTrimMM > 0 {
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
	}
	totalPlacedAreaM2 := float64(placedPhysicalPieces) * demandLine.ActualPieceAreaM2
	for pieceIndex := 0; pieceIndex < placedPhysicalPieces; pieceIndex += 1 {
		column := 0
		if stripCount > 0 {
			column = pieceIndex % stripCount
		}
		row := 0
		if stripCount > 0 {
			row = pieceIndex / stripCount
		}
		envelopeX := usableX + float64(column)*pitchX
		envelopeY := usableY + float64(row)*pitchY
		piecePolygon := buildRawMaterialCenteredRotatedRectanglePolygon(
			demandLine.ActualWidthMM,
			demandLine.ActualLengthMM,
			demandLine.CutAngleDeg,
			envelopeX+pieceWidthMM/2,
			envelopeY+pieceLengthMM/2,
		)
		pieceAreaM2 := roundRawMaterialBatchOptimizer(rawMaterialGeometryPolygonArea(piecePolygon), 6)
		coverageSharePercent := 0.0
		if totalPlacedAreaM2 > 0 {
			coverageSharePercent = roundRawMaterialBatchOptimizer((pieceAreaM2/totalPlacedAreaM2)*100, 2)
		}
		zones = append(zones, models.RawMaterialBatchOptimizerGeometryLayoutZone{
			ID:                   fmt.Sprintf("geo-piece-%s-%d", demandLine.Input.DemandLineID, pieceIndex+1),
			Kind:                 "piece",
			UsageCategory:        "piece",
			Label:                fmt.Sprintf("P%d", pieceIndex+1),
			Detail:               fmt.Sprintf("%s / %.1f°", demandLine.Input.DemandLineID, demandLine.CutAngleDeg),
			RollID:               roll.Input.RollID,
			DemandLineID:         demandLine.Input.DemandLineID,
			AreaM2:               pieceAreaM2,
			AllocatedPieces:      1,
			CoverageSharePercent: coverageSharePercent,
			TooltipLines: []string{
				fmt.Sprintf("需求行: %s", demandLine.Input.DemandLineID),
				fmt.Sprintf("裁切角度: %.1f°", demandLine.CutAngleDeg),
				fmt.Sprintf("实际面积: %.6f m2", pieceAreaM2),
			},
			PolygonPoints: toRawMaterialBatchOptimizerGeometryPoints(piecePolygon.Points),
		})
		for residualIndex, residualPolygon := range buildRawMaterialBatchOptimizerPhase1CellResidualPolygons(envelopeX, envelopeY, pieceWidthMM, pieceLengthMM, demandLine.CutAngleDeg, piecePolygon) {
			residualAreaM2 := roundRawMaterialBatchOptimizer(rawMaterialGeometryPolygonArea(residualPolygon), 6)
			if residualAreaM2 <= 0 {
				continue
			}
			zones = append(zones, models.RawMaterialBatchOptimizerGeometryLayoutZone{
				ID:            fmt.Sprintf("geo-residual-%s-%d-%d", demandLine.Input.DemandLineID, pieceIndex+1, residualIndex+1),
				Kind:          "loss",
				UsageCategory: "residual",
				Label:         "Residual",
				Detail:        fmt.Sprintf("P%d residual", pieceIndex+1),
				RollID:        roll.Input.RollID,
				DemandLineID:  demandLine.Input.DemandLineID,
				AreaM2:        residualAreaM2,
				TooltipLines: []string{
					fmt.Sprintf("需求行: %s", demandLine.Input.DemandLineID),
					fmt.Sprintf("余料面积: %.6f m2", residualAreaM2),
				},
				PolygonPoints: toRawMaterialBatchOptimizerGeometryPoints(residualPolygon.Points),
			})
		}
	}
	usedWidthMM := 0.0
	if stripCount > 0 {
		usedWidthMM = float64(stripCount)*pieceWidthMM + float64(maxInt(stripCount-1, 0))*maxFloat64(pitchX-pieceWidthMM, 0)
	}
	usedLengthMM := 0.0
	if rowCount > 0 {
		usedLengthMM = float64(rowCount)*pieceLengthMM + float64(maxInt(rowCount-1, 0))*maxFloat64(pitchY-pieceLengthMM, 0)
	}
	if usedWidthMM < usableWidthMM {
		unusedWidthPolygon := buildRawMaterialRectanglePolygon(usableX+usedWidthMM, usableY, usableWidthMM-usedWidthMM, usableLengthMM)
		unusedArea := roundRawMaterialBatchOptimizer(rawMaterialGeometryPolygonArea(unusedWidthPolygon), 3)
		if unusedArea > 0 {
			zones = append(zones, models.RawMaterialBatchOptimizerGeometryLayoutZone{
				ID:            fmt.Sprintf("geo-roll-%s-unused-width", roll.Input.RollID),
				Kind:          "loss",
				UsageCategory: "leftover",
				Label:         "Unused Width",
				Detail:        fmt.Sprintf("%.3f m2", unusedArea),
				RollID:        roll.Input.RollID,
				AreaM2:        unusedArea,
				TooltipLines:  []string{fmt.Sprintf("卷材: %s", roll.Input.RollID), fmt.Sprintf("剩余面积: %.3f m2", unusedArea)},
				PolygonPoints: toRawMaterialBatchOptimizerGeometryPoints(unusedWidthPolygon.Points),
			})
		}
	}
	if usedLengthMM < usableLengthMM {
		unusedTailPolygon := buildRawMaterialRectanglePolygon(usableX, usableY+usedLengthMM, minFloat64(usedWidthMM, usableWidthMM), usableLengthMM-usedLengthMM)
		unusedArea := roundRawMaterialBatchOptimizer(rawMaterialGeometryPolygonArea(unusedTailPolygon), 3)
		if unusedArea > 0 {
			zones = append(zones, models.RawMaterialBatchOptimizerGeometryLayoutZone{
				ID:            fmt.Sprintf("geo-roll-%s-unused-tail", roll.Input.RollID),
				Kind:          "loss",
				UsageCategory: "leftover",
				Label:         "Unused Tail",
				Detail:        fmt.Sprintf("%.3f m2", unusedArea),
				RollID:        roll.Input.RollID,
				AreaM2:        unusedArea,
				TooltipLines:  []string{fmt.Sprintf("卷材: %s", roll.Input.RollID), fmt.Sprintf("尾料面积: %.3f m2", unusedArea)},
				PolygonPoints: toRawMaterialBatchOptimizerGeometryPoints(unusedTailPolygon.Points),
			})
		}
	}
	return &models.RawMaterialBatchOptimizerGeometryLayoutSummary{
		CanvasWidthMM:  roundRawMaterialBatchOptimizer(roll.Input.RollWidthMM, 3),
		CanvasHeightMM: roundRawMaterialBatchOptimizer(roll.RollLengthMM, 3),
		Zones:          zones,
	}
}

func buildRawMaterialBatchOptimizerPhase1CellResidualPolygons(
	envelopeX float64,
	envelopeY float64,
	envelopeWidth float64,
	envelopeHeight float64,
	cutAngleDeg float64,
	piecePolygon rawMaterialGeometryPolygon,
) []rawMaterialGeometryPolygon {
	if cutAngleDeg == 0 {
		return nil
	}
	bounds := rawMaterialGeometryBounds{
		MinX: envelopeX,
		MinY: envelopeY,
		MaxX: envelopeX + envelopeWidth,
		MaxY: envelopeY + envelopeHeight,
	}
	points := piecePolygon.Points
	if len(points) < 4 {
		return nil
	}
	top := points[0]
	right := points[0]
	bottom := points[0]
	left := points[0]
	for _, point := range points[1:] {
		if point.Y < top.Y || (point.Y == top.Y && point.X < top.X) {
			top = point
		}
		if point.X > right.X || (point.X == right.X && point.Y < right.Y) {
			right = point
		}
		if point.Y > bottom.Y || (point.Y == bottom.Y && point.X > bottom.X) {
			bottom = point
		}
		if point.X < left.X || (point.X == left.X && point.Y > left.Y) {
			left = point
		}
	}
	triangles := []rawMaterialGeometryPolygon{
		{Points: []rawMaterialGeometryPoint{{X: bounds.MinX, Y: bounds.MinY}, top, left}},
		{Points: []rawMaterialGeometryPoint{top, {X: bounds.MaxX, Y: bounds.MinY}, right}},
		{Points: []rawMaterialGeometryPoint{right, {X: bounds.MaxX, Y: bounds.MaxY}, bottom}},
		{Points: []rawMaterialGeometryPoint{left, bottom, {X: bounds.MinX, Y: bounds.MaxY}}},
	}
	result := make([]rawMaterialGeometryPolygon, 0, len(triangles))
	for _, triangle := range triangles {
		if rawMaterialGeometryPolygonArea(triangle) <= 0 {
			continue
		}
		result = append(result, triangle)
	}
	return result
}
