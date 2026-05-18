// Package services - 原料卷料批次切割优化器 Phase 3(几何排版候选生成)。
//
// 这是切料优化算法的"几何阶段"。算法分多 phase:
//   - Phase 1/2: 数量级匹配 + 兼容性筛选(在 raw_material_batch_optimizer.go)
//   - Phase 3 (本文件): 把通过筛选的需求集放到具体卷料上,做 2D 几何排版,产出可视化 layout
//
// 核心算法:
//   - canSolveRawMaterialBatchOptimizerPhase3Geometry  入口判断(条件不足时跳过 Phase 3)
//   - seedRawMaterialBatchOptimizerPhase3GeometryCandidates  按 demand line 顺序生成候选解
//   - tryPlaceRawMaterialBatchOptimizerDemandSetOnRoll  贪心放置算法(尝试匹配卷料的可用 slot)
//   - countRawMaterialBatchOptimizerPhase3GeometryReuseHits  评分:残料复用度
//   - buildRawMaterialBatchOptimizerPhase3GeometryLayoutSummary 把放置结果转为前端可消费的 layout
//
// 关键不变量:
//   - 排序策略(orderBy*)是评分的关键输入,不同顺序产出不同候选
//   - scoreRawMaterialBatchOptimizerPhase3ResidualReusePreference 是优化目标(尽量复用边角料)
//   - 算法不保证全局最优,只保证 candidate 集合的多样性,由上层综合评分
package services

import (
	"fmt"
	"sort"
	"xdfc-server/models"
)

type rawMaterialBatchGeometryPhase3Slot struct {
	Polygon rawMaterialGeometryPolygon
	Source  string
}

type rawMaterialBatchGeometryPhase3Placement struct {
	RollID           string
	DemandLine       rawMaterialBatchOptimizerContextDemandLine
	EnvelopePolygon  rawMaterialGeometryPolygon
	ActualPolygon    rawMaterialGeometryPolygon
	ResidualPolygons []rawMaterialGeometryPolygon
	UsedResidualSlot bool
}

func canSolveRawMaterialBatchOptimizerPhase3Geometry(context rawMaterialBatchOptimizerContext) bool {
	if len(context.Rolls) <= 1 || len(context.DemandLines) == 0 {
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

func seedRawMaterialBatchOptimizerPhase3GeometryCandidates(
	context rawMaterialBatchOptimizerContext,
) []rawMaterialBatchOptimizerCandidatePlan {
	if !canSolveRawMaterialBatchOptimizerPhase3Geometry(context) {
		return []rawMaterialBatchOptimizerCandidatePlan{}
	}
	strategies := []struct {
		key         string
		explanation string
		order       []rawMaterialBatchOptimizerContextDemandLine
	}{
		{
			key:         "phase3-geometry-priority-first",
			explanation: "第三批真几何按 mustFulfill、priority 与多卷 residual reuse 生成候选。",
			order:       cloneRawMaterialBatchOptimizerDemandLines(context.DemandLines),
		},
		{
			key:         "phase3-geometry-area-first",
			explanation: "第三批真几何按 mustFulfill、priority 与占用面积优先生成多卷候选。",
			order:       orderRawMaterialBatchOptimizerPhase2DemandLinesByArea(context.DemandLines),
		},
	}
	if context.HasRollGroups {
		strategies = append(strategies, struct {
			key         string
			explanation string
			order       []rawMaterialBatchOptimizerContextDemandLine
		}{
			key:         "phase3-geometry-group-first",
			explanation: "第三批真几何优先保持 rollGroup 与 must-adjacent 的连续性。",
			order:       orderRawMaterialBatchOptimizerPhase3DemandLinesByGroup(context.DemandLines),
		})
	}
	if context.HasOrderSequence {
		strategies = append(strategies, struct {
			key         string
			explanation string
			order       []rawMaterialBatchOptimizerContextDemandLine
		}{
			key:         "phase3-geometry-sequence-first",
			explanation: "第三批真几何优先保持 orderSequence 的前后顺序。",
			order:       orderRawMaterialBatchOptimizerPhase3DemandLinesBySequence(context.DemandLines),
		})
	}
	if context.HasMixRestricted {
		strategies = append(strategies, struct {
			key         string
			explanation string
			order       []rawMaterialBatchOptimizerContextDemandLine
		}{
			key:         "phase3-geometry-no-mix-first",
			explanation: "第三批真几何优先处理禁混与方向锁需求，减少跨卷冲突。",
			order:       orderRawMaterialBatchOptimizerPhase2DemandLinesByMixRestriction(context.DemandLines),
		})
	}
	candidates := make([]rawMaterialBatchOptimizerCandidatePlan, 0, len(strategies))
	seen := make(map[string]struct{}, len(strategies))
	for _, strategy := range strategies {
		placementResult := buildRawMaterialBatchOptimizerPhase3GeometryPlacement(context, strategy.order)
		candidate := rawMaterialBatchOptimizerCandidatePlan{
			Assignments:            placementResult.Assignments,
			UnfulfilledLines:       placementResult.UnfulfilledLines,
			ConsumedAreaM2:         placementResult.ConsumedAreaM2,
			FulfilledSets:          placementResult.FulfilledSets,
			FulfilledPieces:        placementResult.FulfilledPieces,
			MustFulfillSatisfied:   placementResult.MustFulfillSatisfied,
			StrategyKey:            strategy.key,
			Explanation:            strategy.explanation,
			GeometryReuseHitCount:  placementResult.GeometryReuseHitCount,
			ReusableResidualAreaM2: placementResult.ReusableResidualAreaM2,
			GeometryLayoutSummary:  placementResult.GeometryLayoutSummary,
		}
		signature := buildRawMaterialBatchOptimizerCandidateSignature(candidate)
		if _, exists := seen[signature]; exists {
			continue
		}
		seen[signature] = struct{}{}
		candidates = append(candidates, candidate)
		if len(candidates) >= maxInt(context.MaxCandidatePlans, 1) {
			break
		}
	}
	if len(candidates) == 0 {
		return seedRawMaterialBatchOptimizerPhase2GeometryCandidates(context)
	}
	return candidates
}

func orderRawMaterialBatchOptimizerPhase3DemandLinesByGroup(
	demandLines []rawMaterialBatchOptimizerContextDemandLine,
) []rawMaterialBatchOptimizerContextDemandLine {
	ordered := cloneRawMaterialBatchOptimizerDemandLines(demandLines)
	sort.SliceStable(ordered, func(i int, j int) bool {
		left := ordered[i]
		right := ordered[j]
		if left.Input.MustFulfill != right.Input.MustFulfill {
			return left.Input.MustFulfill
		}
		if left.RequiresAdjacentGrouping != right.RequiresAdjacentGrouping {
			return left.RequiresAdjacentGrouping
		}
		if left.RollGroupKey != right.RollGroupKey {
			if left.RollGroupKey == "" {
				return false
			}
			if right.RollGroupKey == "" {
				return true
			}
			return left.RollGroupKey < right.RollGroupKey
		}
		if left.OrderSequence != right.OrderSequence {
			if left.OrderSequence == 0 {
				return false
			}
			if right.OrderSequence == 0 {
				return true
			}
			return left.OrderSequence < right.OrderSequence
		}
		if left.Input.Priority != right.Input.Priority {
			return left.Input.Priority > right.Input.Priority
		}
		return left.Input.DemandLineID < right.Input.DemandLineID
	})
	return ordered
}

func scoreRawMaterialBatchOptimizerPhase3ResidualReusePreference(
	slots []rawMaterialBatchGeometryPhase3Slot,
	demandLine rawMaterialBatchOptimizerContextDemandLine,
) int {
	residualFitScore := 0
	rootFitScore := 0
	for _, slot := range slots {
		slotBounds := rawMaterialGeometryPolygonBounds(slot.Polygon)
		envelopePolygon := buildRawMaterialRectanglePolygon(slotBounds.MinX, slotBounds.MinY, demandLine.WidthMM, demandLine.LengthMM)
		if !rawMaterialGeometryPolygonContainsPolygon(slot.Polygon, envelopePolygon) {
			continue
		}
		envelopeBounds := rawMaterialGeometryPolygonBounds(envelopePolygon)
		actualPolygon := buildRawMaterialCenteredRotatedRectanglePolygon(
			demandLine.ActualWidthMM,
			demandLine.ActualLengthMM,
			demandLine.CutAngleDeg,
			envelopeBounds.MinX+demandLine.WidthMM/2,
			envelopeBounds.MinY+demandLine.LengthMM/2,
		)
		if !rawMaterialGeometryPolygonContainsPolygon(slot.Polygon, actualPolygon) {
			continue
		}
		if slot.Source == "residual" {
			residualFitScore = maxInt(residualFitScore, 200)
		} else {
			rootFitScore = maxInt(rootFitScore, 100)
		}
	}
	if residualFitScore > 0 {
		return residualFitScore
	}
	return rootFitScore
}

func orderRawMaterialBatchOptimizerPhase3DemandLinesBySequence(
	demandLines []rawMaterialBatchOptimizerContextDemandLine,
) []rawMaterialBatchOptimizerContextDemandLine {
	ordered := cloneRawMaterialBatchOptimizerDemandLines(demandLines)
	sort.SliceStable(ordered, func(i int, j int) bool {
		left := ordered[i]
		right := ordered[j]
		if left.Input.MustFulfill != right.Input.MustFulfill {
			return left.Input.MustFulfill
		}
		if left.OrderSequence != right.OrderSequence {
			if left.OrderSequence == 0 {
				return false
			}
			if right.OrderSequence == 0 {
				return true
			}
			return left.OrderSequence < right.OrderSequence
		}
		if left.DirectionLocked != right.DirectionLocked {
			return left.DirectionLocked
		}
		if left.Input.Priority != right.Input.Priority {
			return left.Input.Priority > right.Input.Priority
		}
		return left.Input.DemandLineID < right.Input.DemandLineID
	})
	return ordered
}

func buildRawMaterialBatchOptimizerPhase3GeometryPlacement(
	context rawMaterialBatchOptimizerContext,
	orderedDemandLines []rawMaterialBatchOptimizerContextDemandLine,
) rawMaterialBatchGeometryPlacementResult {
	rollSlots := make(map[string][]rawMaterialBatchGeometryPhase3Slot, len(context.Rolls))
	rollStates := make(map[string]*rawMaterialBatchOptimizerRollAllocationState, len(context.Rolls))
	groupAssignedRolls := make(map[string]string)
	for _, roll := range context.Rolls {
		usableWidthMM := maxFloat64(roll.Input.RollWidthMM-roll.EffectiveEdgeTrimMM*2, 0)
		usableLengthMM := maxFloat64(roll.RollLengthMM-roll.EffectiveEdgeTrimMM*2, 0)
		if usableWidthMM <= 0 || usableLengthMM <= 0 {
			continue
		}
		rollSlots[roll.Input.RollID] = []rawMaterialBatchGeometryPhase3Slot{{
			Polygon: buildRawMaterialRectanglePolygon(roll.EffectiveEdgeTrimMM, roll.EffectiveEdgeTrimMM, usableWidthMM, usableLengthMM),
			Source:  "root",
		}}
	}
	placements := make([]rawMaterialBatchGeometryPhase3Placement, 0)
	demandSummaries := make(map[string]*rawMaterialBatchGeometryDemandPlacementSummary, len(orderedDemandLines))
	assignmentLookup := make(map[string]*models.RawMaterialBatchOptimizerPlanAssignment)
	consumedAreaM2 := 0.0
	fulfilledSets := 0
	fulfilledPieces := 0
	for _, demandLine := range orderedDemandLines {
		summary := &rawMaterialBatchGeometryDemandPlacementSummary{DemandLineID: demandLine.Input.DemandLineID}
		demandSummaries[demandLine.Input.DemandLineID] = summary
		for setIndex := 0; setIndex < demandLine.RequiredSets; setIndex += 1 {
			placedSet := false
			for _, roll := range orderRawMaterialBatchOptimizerPhase3RollsForDemand(context.Rolls, rollStates, rollSlots, groupAssignedRolls, demandLine) {
				state := ensureRawMaterialBatchOptimizerRollState(rollStates, roll.Input.RollID)
				if !isRawMaterialBatchOptimizerPhase3DemandCompatibleWithRoll(demandLine, state, groupAssignedRolls, roll.Input.RollID) {
					continue
				}
				setPlacements, nextSlots, placedWithResidual := tryPlaceRawMaterialBatchOptimizerDemandSetOnRoll(
					rollSlots[roll.Input.RollID],
					roll,
					demandLine,
				)
				if len(setPlacements) == 0 {
					continue
				}
				rollSlots[roll.Input.RollID] = nextSlots
				if demandLine.RollGroupKey != "" {
					if _, exists := groupAssignedRolls[demandLine.RollGroupKey]; !exists {
						groupAssignedRolls[demandLine.RollGroupKey] = roll.Input.RollID
					}
				}
				updateRawMaterialBatchOptimizerRollState(state, demandLine)
				if demandLine.RequiresAdjacentGrouping {
					state.HasAdjacentGrouping = true
				}
				placements = append(placements, setPlacements...)
				summary.AllocatedSets += 1
				summary.AllocatedPieces += demandLine.PieceCountPerSet
				summary.PlacedPhysicalPieces += len(setPlacements)
				assignmentKey := fmt.Sprintf("%s::%s", roll.Input.RollID, demandLine.Input.DemandLineID)
				assignment := assignmentLookup[assignmentKey]
				if assignment == nil {
					assignment = &models.RawMaterialBatchOptimizerPlanAssignment{
						RollID:       roll.Input.RollID,
						DemandLineID: demandLine.Input.DemandLineID,
					}
					assignmentLookup[assignmentKey] = assignment
				}
				assignment.AllocatedSets += 1
				assignment.AllocatedPieces += demandLine.PieceCountPerSet
				fulfilledSets += 1
				fulfilledPieces += demandLine.PieceCountPerSet
				consumedAreaM2 += float64(demandLine.PieceCountPerSet*demandLine.LayupCount) * demandLine.PieceAreaM2
				placedSet = true
				if placedWithResidual {
					state.HasAdjacentGrouping = state.HasAdjacentGrouping || demandLine.RequiresAdjacentGrouping
				}
				break
			}
			if !placedSet {
				break
			}
		}
	}
	assignments := make([]models.RawMaterialBatchOptimizerPlanAssignment, 0, len(assignmentLookup))
	for _, assignment := range assignmentLookup {
		assignments = append(assignments, *assignment)
	}
	sort.SliceStable(assignments, func(i int, j int) bool {
		if assignments[i].DemandLineID == assignments[j].DemandLineID {
			return assignments[i].RollID < assignments[j].RollID
		}
		return assignments[i].DemandLineID < assignments[j].DemandLineID
	})
	unfulfilledLines := make([]models.RawMaterialBatchOptimizerUnfulfilledLine, 0)
	mustFulfillSatisfied := true
	for _, demandLine := range orderedDemandLines {
		summary := demandSummaries[demandLine.Input.DemandLineID]
		if summary == nil {
			summary = &rawMaterialBatchGeometryDemandPlacementSummary{DemandLineID: demandLine.Input.DemandLineID}
		}
		remainingSets := maxInt(demandLine.RequiredSets-summary.AllocatedSets, 0)
		remainingPieces := maxInt(demandLine.RequiredPieces-summary.AllocatedPieces, 0)
		if remainingSets > 0 || remainingPieces > 0 {
			reason := buildRawMaterialBatchOptimizerPhase3UnfulfilledReason(demandLine, groupAssignedRolls)
			if demandLine.Input.MustFulfill {
				mustFulfillSatisfied = false
			}
			unfulfilledLines = append(unfulfilledLines, models.RawMaterialBatchOptimizerUnfulfilledLine{
				DemandLineID:    demandLine.Input.DemandLineID,
				RemainingSets:   remainingSets,
				RemainingPieces: remainingPieces,
				Reason:          reason,
			})
		}
	}
	geometryLayoutSummary, residualFragmentCount := buildRawMaterialBatchOptimizerPhase3GeometryLayoutSummary(context.Rolls, placements, rollSlots)
	return rawMaterialBatchGeometryPlacementResult{
		Assignments:            assignments,
		UnfulfilledLines:       unfulfilledLines,
		ConsumedAreaM2:         roundRawMaterialBatchOptimizer(consumedAreaM2, 3),
		FulfilledSets:          fulfilledSets,
		FulfilledPieces:        fulfilledPieces,
		MustFulfillSatisfied:   mustFulfillSatisfied,
		GeometryReuseHitCount:  countRawMaterialBatchOptimizerPhase3GeometryReuseHits(placements),
		ReusableResidualAreaM2: calculateRawMaterialBatchOptimizerReusableResidualArea(rollSlots),
		GeometryLayoutSummary:  geometryLayoutSummary,
		ResidualFragmentCount:  residualFragmentCount,
	}
}

func countRawMaterialBatchOptimizerPhase3GeometryReuseHits(
	placements []rawMaterialBatchGeometryPhase3Placement,
) int {
	count := 0
	for _, placement := range placements {
		if placement.UsedResidualSlot {
			count += 1
		}
	}
	return count
}

func orderRawMaterialBatchOptimizerPhase3RollsForDemand(
	rolls []rawMaterialBatchOptimizerContextRoll,
	states map[string]*rawMaterialBatchOptimizerRollAllocationState,
	rollSlots map[string][]rawMaterialBatchGeometryPhase3Slot,
	groupAssignedRolls map[string]string,
	demandLine rawMaterialBatchOptimizerContextDemandLine,
) []rawMaterialBatchOptimizerContextRoll {
	ordered := orderRawMaterialBatchOptimizerRollsForDemand(rolls, states, demandLine)
	assignedRollID := ""
	if demandLine.RollGroupKey != "" {
		assignedRollID = groupAssignedRolls[demandLine.RollGroupKey]
	}
	sort.SliceStable(ordered, func(i int, j int) bool {
		left := ordered[i]
		right := ordered[j]
		if assignedRollID != "" {
			if left.Input.RollID == assignedRollID && right.Input.RollID != assignedRollID {
				return true
			}
			if right.Input.RollID == assignedRollID && left.Input.RollID != assignedRollID {
				return false
			}
		}
		leftResidualReuseScore := scoreRawMaterialBatchOptimizerPhase3ResidualReusePreference(rollSlots[left.Input.RollID], demandLine)
		rightResidualReuseScore := scoreRawMaterialBatchOptimizerPhase3ResidualReusePreference(rollSlots[right.Input.RollID], demandLine)
		if leftResidualReuseScore != rightResidualReuseScore {
			return leftResidualReuseScore > rightResidualReuseScore
		}
		leftSlots := states[left.Input.RollID]
		rightSlots := states[right.Input.RollID]
		leftPreference := scoreRawMaterialBatchOptimizerRollPreference(leftSlots, demandLine)
		rightPreference := scoreRawMaterialBatchOptimizerRollPreference(rightSlots, demandLine)
		if leftPreference == rightPreference {
			return left.Input.RollID < right.Input.RollID
		}
		return leftPreference > rightPreference
	})
	return ordered
}

func isRawMaterialBatchOptimizerPhase3DemandCompatibleWithRoll(
	demandLine rawMaterialBatchOptimizerContextDemandLine,
	state *rawMaterialBatchOptimizerRollAllocationState,
	groupAssignedRolls map[string]string,
	rollID string,
) bool {
	if !isRawMaterialBatchOptimizerDemandCompatibleWithRoll(demandLine, state) {
		return false
	}
	if demandLine.RollGroupKey != "" {
		if assignedRollID, exists := groupAssignedRolls[demandLine.RollGroupKey]; exists && assignedRollID != rollID {
			return false
		}
	}
	if demandLine.RequiresAdjacentGrouping && len(state.DemandLineIDs) > 0 && demandLine.RollGroupKey == "" {
		return false
	}
	return true
}

func tryPlaceRawMaterialBatchOptimizerDemandSetOnRoll(
	slots []rawMaterialBatchGeometryPhase3Slot,
	roll rawMaterialBatchOptimizerContextRoll,
	demandLine rawMaterialBatchOptimizerContextDemandLine,
) ([]rawMaterialBatchGeometryPhase3Placement, []rawMaterialBatchGeometryPhase3Slot, bool) {
	piecesPerSetPhysical := maxInt(demandLine.PieceCountPerSet*demandLine.LayupCount, 1)
	workingSlots := append([]rawMaterialBatchGeometryPhase3Slot(nil), slots...)
	placements := make([]rawMaterialBatchGeometryPhase3Placement, 0, piecesPerSetPhysical)
	usedResidualSlot := false
	for pieceIndex := 0; pieceIndex < piecesPerSetPhysical; pieceIndex += 1 {
		slotIndex := -1
		var envelopePolygon rawMaterialGeometryPolygon
		var actualPolygon rawMaterialGeometryPolygon
		var residualPolygons []rawMaterialGeometryPolygon
		orderedSlotIndexes := orderRawMaterialBatchOptimizerPhase3SlotIndexes(workingSlots)
		for _, candidateIndex := range orderedSlotIndexes {
			slot := workingSlots[candidateIndex]
			slotBounds := rawMaterialGeometryPolygonBounds(slot.Polygon)
			envelopePolygon = buildRawMaterialRectanglePolygon(slotBounds.MinX, slotBounds.MinY, demandLine.WidthMM, demandLine.LengthMM)
			if !rawMaterialGeometryPolygonContainsPolygon(slot.Polygon, envelopePolygon) {
				continue
			}
			envelopeBounds := rawMaterialGeometryPolygonBounds(envelopePolygon)
			actualPolygon = buildRawMaterialCenteredRotatedRectanglePolygon(
				demandLine.ActualWidthMM,
				demandLine.ActualLengthMM,
				demandLine.CutAngleDeg,
				envelopeBounds.MinX+demandLine.WidthMM/2,
				envelopeBounds.MinY+demandLine.LengthMM/2,
			)
			if !rawMaterialGeometryPolygonContainsPolygon(slot.Polygon, actualPolygon) {
				continue
			}
			residualPolygons = buildRawMaterialBatchOptimizerPhase1CellResidualPolygons(
				envelopeBounds.MinX,
				envelopeBounds.MinY,
				demandLine.WidthMM,
				demandLine.LengthMM,
				demandLine.CutAngleDeg,
				actualPolygon,
			)
			slotIndex = candidateIndex
			if slot.Source == "residual" {
				usedResidualSlot = true
			}
			break
		}
		if slotIndex < 0 {
			return nil, slots, false
		}
		selectedSlot := workingSlots[slotIndex]
		workingSlots = append(append([]rawMaterialBatchGeometryPhase3Slot(nil), workingSlots[:slotIndex]...), workingSlots[slotIndex+1:]...)
		for _, nextPolygon := range splitRawMaterialGeometryRectangleSlotByEnvelope(selectedSlot.Polygon, envelopePolygon) {
			workingSlots = append(workingSlots, rawMaterialBatchGeometryPhase3Slot{Polygon: nextPolygon, Source: "residual"})
		}
		placements = append(placements, rawMaterialBatchGeometryPhase3Placement{
			RollID:           roll.Input.RollID,
			DemandLine:       demandLine,
			EnvelopePolygon:  envelopePolygon,
			ActualPolygon:    actualPolygon,
			ResidualPolygons: residualPolygons,
			UsedResidualSlot: selectedSlot.Source == "residual",
		})
	}
	return placements, workingSlots, usedResidualSlot
}

func orderRawMaterialBatchOptimizerPhase3SlotIndexes(slots []rawMaterialBatchGeometryPhase3Slot) []int {
	indexes := make([]int, 0, len(slots))
	for index := range slots {
		indexes = append(indexes, index)
	}
	sort.SliceStable(indexes, func(i int, j int) bool {
		left := slots[indexes[i]]
		right := slots[indexes[j]]
		if left.Source != right.Source {
			return left.Source == "residual"
		}
		leftArea := rawMaterialGeometryPolygonArea(left.Polygon)
		rightArea := rawMaterialGeometryPolygonArea(right.Polygon)
		if leftArea == rightArea {
			leftBounds := rawMaterialGeometryPolygonBounds(left.Polygon)
			rightBounds := rawMaterialGeometryPolygonBounds(right.Polygon)
			if leftBounds.MinY == rightBounds.MinY {
				return leftBounds.MinX < rightBounds.MinX
			}
			return leftBounds.MinY < rightBounds.MinY
		}
		return leftArea < rightArea
	})
	return indexes
}

func buildRawMaterialBatchOptimizerPhase3UnfulfilledReason(
	demandLine rawMaterialBatchOptimizerContextDemandLine,
	groupAssignedRolls map[string]string,
) string {
	if demandLine.RequiresAdjacentGrouping && demandLine.RollGroupKey != "" {
		return fmt.Sprintf("第三批真几何需要保持组 %s 的同卷连续放置，但当前多卷 residual search 未找到可行连续槽位。", demandLine.RollGroupKey)
	}
	if demandLine.RollGroupKey != "" {
		if _, exists := groupAssignedRolls[demandLine.RollGroupKey]; exists {
			return fmt.Sprintf("第三批真几何已锁定组 %s 的卷材归属，当前需求无法继续并入该卷。", demandLine.RollGroupKey)
		}
	}
	if demandLine.DirectionLocked {
		return "第三批真几何方向锁定与当前卷材已放置内容不兼容。"
	}
	if demandLine.OrderSequence > 0 {
		return fmt.Sprintf("第三批真几何顺序号 %d 的需求在当前候选中未获得稳定卷材容量。", demandLine.OrderSequence)
	}
	return "第三批真几何多卷与 residual reuse 场景下未找到稳定可行槽位。"
}

func buildRawMaterialBatchOptimizerPhase3GeometryLayoutSummary(
	rolls []rawMaterialBatchOptimizerContextRoll,
	placements []rawMaterialBatchGeometryPhase3Placement,
	finalSlots map[string][]rawMaterialBatchGeometryPhase3Slot,
) (*models.RawMaterialBatchOptimizerGeometryLayoutSummary, int) {
	rollOffsets := make(map[string]rawMaterialGeometryPoint, len(rolls))
	canvasWidthMM := 0.0
	canvasHeightMM := 0.0
	currentX := 0.0
	for index, roll := range rolls {
		rollOffsets[roll.Input.RollID] = rawMaterialGeometryPoint{X: currentX, Y: 0}
		currentX += roll.Input.RollWidthMM
		if index < len(rolls)-1 {
			currentX += rawMaterialBatchOptimizerCanvasRollGapMM
		}
		canvasHeightMM = maxFloat64(canvasHeightMM, roll.RollLengthMM)
	}
	canvasWidthMM = currentX
	zones := make([]models.RawMaterialBatchOptimizerGeometryLayoutZone, 0, len(placements)*6+len(rolls)*8)
	residualFragmentCount := 0
	pieceAreaTotalByDemand := make(map[string]float64)
	for _, placement := range placements {
		pieceAreaTotalByDemand[placement.DemandLine.Input.DemandLineID] += rawMaterialGeometryPolygonArea(placement.ActualPolygon)
	}
	demandPieceIndex := make(map[string]int)
	for _, roll := range rolls {
		offset := rollOffsets[roll.Input.RollID]
		rollPolygon := translateRawMaterialGeometryPolygon(buildRawMaterialRectanglePolygon(0, 0, roll.Input.RollWidthMM, roll.RollLengthMM), offset.X, offset.Y)
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
		for _, trimZone := range buildRawMaterialBatchOptimizerPhase1TrimZones(roll) {
			zones = append(zones, translateRawMaterialBatchOptimizerGeometryZone(trimZone, offset.X, offset.Y))
		}
	}
	for _, placement := range placements {
		offset := rollOffsets[placement.RollID]
		demandLineID := placement.DemandLine.Input.DemandLineID
		demandPieceIndex[demandLineID] += 1
		translatedPiecePolygon := translateRawMaterialGeometryPolygon(placement.ActualPolygon, offset.X, offset.Y)
		pieceAreaM2 := roundRawMaterialBatchOptimizer(rawMaterialGeometryPolygonArea(translatedPiecePolygon), 6)
		coverageSharePercent := 0.0
		if pieceAreaTotalByDemand[demandLineID] > 0 {
			coverageSharePercent = roundRawMaterialBatchOptimizer((pieceAreaM2/pieceAreaTotalByDemand[demandLineID])*100, 2)
		}
		tooltipLines := []string{
			fmt.Sprintf("需求行: %s", demandLineID),
			fmt.Sprintf("卷材: %s", placement.RollID),
			fmt.Sprintf("裁切角度: %.1f°", placement.DemandLine.CutAngleDeg),
			fmt.Sprintf("实际面积: %.6f m2", pieceAreaM2),
		}
		if placement.UsedResidualSlot {
			tooltipLines = append(tooltipLines, "本片来自 residual reuse 槽位。")
		}
		zones = append(zones, models.RawMaterialBatchOptimizerGeometryLayoutZone{
			ID:                   fmt.Sprintf("geo-piece-%s-%s-%d", placement.RollID, demandLineID, demandPieceIndex[demandLineID]),
			Kind:                 "piece",
			UsageCategory:        "piece",
			Label:                fmt.Sprintf("%s-P%d", demandLineID, demandPieceIndex[demandLineID]),
			Detail:               fmt.Sprintf("%s / %s / %.1f°", placement.RollID, demandLineID, placement.DemandLine.CutAngleDeg),
			RollID:               placement.RollID,
			DemandLineID:         demandLineID,
			AreaM2:               pieceAreaM2,
			AllocatedPieces:      1,
			CoverageSharePercent: coverageSharePercent,
			TooltipLines:         tooltipLines,
			PolygonPoints:        toRawMaterialBatchOptimizerGeometryPoints(translatedPiecePolygon.Points),
		})
		for residualIndex, residualPolygon := range placement.ResidualPolygons {
			translatedResidualPolygon := translateRawMaterialGeometryPolygon(residualPolygon, offset.X, offset.Y)
			residualAreaM2 := roundRawMaterialBatchOptimizer(rawMaterialGeometryPolygonArea(translatedResidualPolygon), 6)
			if residualAreaM2 <= 0 {
				continue
			}
			residualFragmentCount += 1
			zones = append(zones, models.RawMaterialBatchOptimizerGeometryLayoutZone{
				ID:            fmt.Sprintf("geo-residual-%s-%s-%d-%d", placement.RollID, demandLineID, demandPieceIndex[demandLineID], residualIndex+1),
				Kind:          "loss",
				UsageCategory: "residual",
				Label:         "Residual",
				Detail:        fmt.Sprintf("%s residual", demandLineID),
				RollID:        placement.RollID,
				DemandLineID:  demandLineID,
				AreaM2:        residualAreaM2,
				TooltipLines: []string{
					fmt.Sprintf("需求行: %s", demandLineID),
					fmt.Sprintf("卷材: %s", placement.RollID),
					fmt.Sprintf("余料面积: %.6f m2", residualAreaM2),
				},
				PolygonPoints: toRawMaterialBatchOptimizerGeometryPoints(translatedResidualPolygon.Points),
			})
		}
	}
	for _, roll := range rolls {
		offset := rollOffsets[roll.Input.RollID]
		for slotIndex, slot := range finalSlots[roll.Input.RollID] {
			translatedSlotPolygon := translateRawMaterialGeometryPolygon(slot.Polygon, offset.X, offset.Y)
			slotAreaM2 := roundRawMaterialBatchOptimizer(rawMaterialGeometryPolygonArea(translatedSlotPolygon), 6)
			if slotAreaM2 <= 0 {
				continue
			}
			residualFragmentCount += 1
			label := "Unused Slot"
			if slot.Source == "residual" {
				label = "Reusable Residual"
			}
			zones = append(zones, models.RawMaterialBatchOptimizerGeometryLayoutZone{
				ID:            fmt.Sprintf("geo-slot-%s-%d", roll.Input.RollID, slotIndex+1),
				Kind:          "loss",
				UsageCategory: "leftover",
				Label:         label,
				Detail:        fmt.Sprintf("%.6f m2", slotAreaM2),
				RollID:        roll.Input.RollID,
				AreaM2:        slotAreaM2,
				TooltipLines: []string{
					fmt.Sprintf("卷材: %s", roll.Input.RollID),
					fmt.Sprintf("残留槽位面积: %.6f m2", slotAreaM2),
				},
				PolygonPoints: toRawMaterialBatchOptimizerGeometryPoints(translatedSlotPolygon.Points),
			})
		}
	}
	return &models.RawMaterialBatchOptimizerGeometryLayoutSummary{
		CanvasWidthMM:  roundRawMaterialBatchOptimizer(maxFloat64(canvasWidthMM, 1), 3),
		CanvasHeightMM: roundRawMaterialBatchOptimizer(maxFloat64(canvasHeightMM, 1), 3),
		Zones:          zones,
	}, residualFragmentCount
}

func translateRawMaterialBatchOptimizerGeometryZone(
	zone models.RawMaterialBatchOptimizerGeometryLayoutZone,
	deltaX float64,
	deltaY float64,
) models.RawMaterialBatchOptimizerGeometryLayoutZone {
	points := make([]models.RawMaterialBatchOptimizerGeometryPoint, 0, len(zone.PolygonPoints))
	for _, point := range zone.PolygonPoints {
		points = append(points, models.RawMaterialBatchOptimizerGeometryPoint{
			X: roundRawMaterialBatchOptimizer(point.X+deltaX, 3),
			Y: roundRawMaterialBatchOptimizer(point.Y+deltaY, 3),
		})
	}
	zone.PolygonPoints = points
	return zone
}
