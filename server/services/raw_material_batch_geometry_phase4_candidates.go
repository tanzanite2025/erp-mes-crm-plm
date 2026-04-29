package services

import (
	"fmt"
	"sort"
	"xdfc-server/models"
)

type rawMaterialBatchGeometryPhase4SearchState struct {
	RollSlots              map[string][]rawMaterialBatchGeometryPhase3Slot
	RollStates             map[string]*rawMaterialBatchOptimizerRollAllocationState
	GroupAssignedRolls     map[string]string
	Placements             []rawMaterialBatchGeometryPhase3Placement
	AssignmentLookup       map[string]*models.RawMaterialBatchOptimizerPlanAssignment
	DemandSummaries        map[string]*rawMaterialBatchGeometryDemandPlacementSummary
	ConsumedAreaM2         float64
	FulfilledSets          int
	FulfilledPieces        int
	GeometryReuseHitCount  int
	ReusableResidualAreaM2 float64
}

type rawMaterialBatchGeometryPhase4PlacementOption struct {
	RollID                 string
	Placements             []rawMaterialBatchGeometryPhase3Placement
	NextSlots              []rawMaterialBatchGeometryPhase3Slot
	GeometryReuseHitCount  int
	ReusableResidualAreaM2 float64
}

func canSolveRawMaterialBatchOptimizerPhase4Geometry(context rawMaterialBatchOptimizerContext) bool {
	return canSolveRawMaterialBatchOptimizerPhase3Geometry(context)
}

func seedRawMaterialBatchOptimizerPhase4GeometryCandidates(
	context rawMaterialBatchOptimizerContext,
) []rawMaterialBatchOptimizerCandidatePlan {
	if !canSolveRawMaterialBatchOptimizerPhase4Geometry(context) {
		return []rawMaterialBatchOptimizerCandidatePlan{}
	}
	strategies := []struct {
		key         string
		explanation string
		order       []rawMaterialBatchOptimizerContextDemandLine
	}{
		{key: "phase4-geometry-priority-first", explanation: "第四批真几何按 mustFulfill、priority 与更强 residual search 生成候选。", order: cloneRawMaterialBatchOptimizerDemandLines(context.DemandLines)},
		{key: "phase4-geometry-area-first", explanation: "第四批真几何按面积优先并结合更强 residual search 生成候选。", order: orderRawMaterialBatchOptimizerPhase2DemandLinesByArea(context.DemandLines)},
	}
	if context.HasRollGroups {
		strategies = append(strategies, struct {
			key         string
			explanation string
			order       []rawMaterialBatchOptimizerContextDemandLine
		}{key: "phase4-geometry-group-first", explanation: "第四批真几何优先保持 group / adjacency 连续性。", order: orderRawMaterialBatchOptimizerPhase3DemandLinesByGroup(context.DemandLines)})
	}
	if context.HasOrderSequence {
		strategies = append(strategies, struct {
			key         string
			explanation string
			order       []rawMaterialBatchOptimizerContextDemandLine
		}{key: "phase4-geometry-sequence-first", explanation: "第四批真几何优先保持顺序与多卷切换稳定性。", order: orderRawMaterialBatchOptimizerPhase3DemandLinesBySequence(context.DemandLines)})
	}
	seen := make(map[string]struct{})
	candidates := make([]rawMaterialBatchOptimizerCandidatePlan, 0, maxInt(context.MaxCandidatePlans, 1))
	for _, strategy := range strategies {
		states := buildRawMaterialBatchOptimizerPhase4SearchStates(context, strategy.order)
		for index, state := range states {
			candidate := buildRawMaterialBatchOptimizerPhase4CandidateFromState(context, strategy.order, state, strategy.key, strategy.explanation, index)
			signature := buildRawMaterialBatchOptimizerCandidateSignature(candidate)
			if _, exists := seen[signature]; exists {
				continue
			}
			seen[signature] = struct{}{}
			candidates = append(candidates, candidate)
			if len(candidates) >= maxInt(context.MaxCandidatePlans, 1) {
				return candidates
			}
		}
	}
	if len(candidates) == 0 {
		return seedRawMaterialBatchOptimizerPhase3GeometryCandidates(context)
	}
	return candidates
}

func buildRawMaterialBatchOptimizerPhase4SearchStates(
	context rawMaterialBatchOptimizerContext,
	orderedDemandLines []rawMaterialBatchOptimizerContextDemandLine,
) []rawMaterialBatchGeometryPhase4SearchState {
	states := []rawMaterialBatchGeometryPhase4SearchState{buildRawMaterialBatchOptimizerPhase4InitialSearchState(context)}
	beamWidth := minIntRawMaterialBatchOptimizer(maxInt(context.MaxCandidatePlans, 1), maxInt(context.SearchConfig.BeamWidth, 1))
	searchDepth := minIntRawMaterialBatchOptimizer(maxInt(context.SearchConfig.MaxSearchDepth, 1), maxInt(len(orderedDemandLines), 1))
	for demandIndex, demandLine := range orderedDemandLines {
		branchLimit := 1
		if demandIndex < searchDepth {
			branchLimit = maxInt(context.SearchConfig.PerDemandBranchingLimit, 1)
		}
		nextStates := make([]rawMaterialBatchGeometryPhase4SearchState, 0, len(states))
		for _, searchState := range states {
			branchStates := []rawMaterialBatchGeometryPhase4SearchState{cloneRawMaterialBatchOptimizerPhase4SearchState(searchState)}
			for setIndex := 0; setIndex < demandLine.RequiredSets; setIndex += 1 {
				expandedStates := make([]rawMaterialBatchGeometryPhase4SearchState, 0, len(branchStates)*maxInt(branchLimit, 1))
				placedAny := false
				for _, branchState := range branchStates {
					options := buildRawMaterialBatchOptimizerPhase4PlacementOptions(branchState, context.Rolls, demandLine, branchLimit, context.SearchConfig.ResidualReuseBias)
					if len(options) == 0 {
						expandedStates = append(expandedStates, branchState)
						continue
					}
					placedAny = true
					for _, option := range options {
						expandedStates = append(expandedStates, applyRawMaterialBatchOptimizerPhase4PlacementOption(branchState, demandLine, option))
					}
				}
				branchStates = pruneRawMaterialBatchOptimizerPhase4SearchStates(expandedStates, beamWidth)
				if !placedAny {
					break
				}
			}
			nextStates = append(nextStates, branchStates...)
		}
		states = pruneRawMaterialBatchOptimizerPhase4SearchStates(nextStates, beamWidth)
	}
	return states
}

func buildRawMaterialBatchOptimizerPhase4InitialSearchState(
	context rawMaterialBatchOptimizerContext,
) rawMaterialBatchGeometryPhase4SearchState {
	rollSlots := make(map[string][]rawMaterialBatchGeometryPhase3Slot, len(context.Rolls))
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
	return rawMaterialBatchGeometryPhase4SearchState{
		RollSlots:          rollSlots,
		RollStates:         make(map[string]*rawMaterialBatchOptimizerRollAllocationState),
		GroupAssignedRolls: make(map[string]string),
		Placements:         make([]rawMaterialBatchGeometryPhase3Placement, 0),
		AssignmentLookup:   make(map[string]*models.RawMaterialBatchOptimizerPlanAssignment),
		DemandSummaries:    make(map[string]*rawMaterialBatchGeometryDemandPlacementSummary),
	}
}

func buildRawMaterialBatchOptimizerPhase4PlacementOptions(
	state rawMaterialBatchGeometryPhase4SearchState,
	rolls []rawMaterialBatchOptimizerContextRoll,
	demandLine rawMaterialBatchOptimizerContextDemandLine,
	maxOptions int,
	residualReuseBias int,
) []rawMaterialBatchGeometryPhase4PlacementOption {
	options := make([]rawMaterialBatchGeometryPhase4PlacementOption, 0, maxOptions)
	for _, roll := range orderRawMaterialBatchOptimizerPhase3RollsForDemand(rolls, state.RollStates, state.RollSlots, state.GroupAssignedRolls, demandLine) {
		rollState := ensureRawMaterialBatchOptimizerRollState(state.RollStates, roll.Input.RollID)
		if !isRawMaterialBatchOptimizerPhase3DemandCompatibleWithRoll(demandLine, rollState, state.GroupAssignedRolls, roll.Input.RollID) {
			continue
		}
		rollOptions := buildRawMaterialBatchOptimizerPhase4DemandSetPlacementOptions(state.RollSlots[roll.Input.RollID], roll, demandLine, maxOptions)
		options = append(options, rollOptions...)
	}
	sort.SliceStable(options, func(i int, j int) bool {
		left := options[i]
		right := options[j]
		leftReuseScore := left.GeometryReuseHitCount * maxInt(residualReuseBias, 0)
		rightReuseScore := right.GeometryReuseHitCount * maxInt(residualReuseBias, 0)
		if leftReuseScore == rightReuseScore {
			if left.ReusableResidualAreaM2 == right.ReusableResidualAreaM2 {
				if len(left.Placements) == len(right.Placements) {
					return left.RollID < right.RollID
				}
				return len(left.Placements) < len(right.Placements)
			}
			return left.ReusableResidualAreaM2 > right.ReusableResidualAreaM2
		}
		return leftReuseScore > rightReuseScore
	})
	if len(options) <= maxOptions {
		return options
	}
	return options[:maxOptions]
}

func buildRawMaterialBatchOptimizerPhase4DemandSetPlacementOptions(
	slots []rawMaterialBatchGeometryPhase3Slot,
	roll rawMaterialBatchOptimizerContextRoll,
	demandLine rawMaterialBatchOptimizerContextDemandLine,
	maxOptions int,
) []rawMaterialBatchGeometryPhase4PlacementOption {
	if len(slots) == 0 {
		return nil
	}
	orderedSlotIndexes := orderRawMaterialBatchOptimizerPhase3SlotIndexes(slots)
	options := make([]rawMaterialBatchGeometryPhase4PlacementOption, 0, maxOptions)
	for _, orderedIndex := range orderedSlotIndexes {
		option, ok := buildRawMaterialBatchOptimizerPhase4DemandSetPlacementOptionWithSeedSlot(slots, orderedIndex, roll, demandLine)
		if !ok {
			continue
		}
		options = append(options, option)
		if len(options) >= maxOptions {
			break
		}
	}
	return options
}

func buildRawMaterialBatchOptimizerPhase4DemandSetPlacementOptionWithSeedSlot(
	slots []rawMaterialBatchGeometryPhase3Slot,
	seedSlotIndex int,
	roll rawMaterialBatchOptimizerContextRoll,
	demandLine rawMaterialBatchOptimizerContextDemandLine,
) (rawMaterialBatchGeometryPhase4PlacementOption, bool) {
	piecesPerSetPhysical := maxInt(demandLine.PieceCountPerSet*demandLine.LayupCount, 1)
	workingSlots := cloneRawMaterialBatchOptimizerPhase3Slots(slots)
	placements := make([]rawMaterialBatchGeometryPhase3Placement, 0, piecesPerSetPhysical)
	geometryReuseHits := 0
	for pieceIndex := 0; pieceIndex < piecesPerSetPhysical; pieceIndex += 1 {
		selectedIndex := -1
		if pieceIndex == 0 {
			selectedIndex = seedSlotIndex
		} else {
			orderedSlotIndexes := orderRawMaterialBatchOptimizerPhase3SlotIndexes(workingSlots)
			for _, candidateIndex := range orderedSlotIndexes {
				if rawMaterialBatchOptimizerPhase4SlotFitsDemand(workingSlots[candidateIndex], demandLine) {
					selectedIndex = candidateIndex
					break
				}
			}
		}
		if selectedIndex < 0 || selectedIndex >= len(workingSlots) {
			return rawMaterialBatchGeometryPhase4PlacementOption{}, false
		}
		selectedSlot := workingSlots[selectedIndex]
		placement, nextSlots, ok := placeRawMaterialBatchOptimizerPhase4PieceOnSlot(workingSlots, selectedIndex, roll, demandLine)
		if !ok {
			return rawMaterialBatchGeometryPhase4PlacementOption{}, false
		}
		if selectedSlot.Source == "residual" {
			geometryReuseHits += 1
		}
		placements = append(placements, placement)
		workingSlots = nextSlots
	}
	return rawMaterialBatchGeometryPhase4PlacementOption{
		RollID:                 roll.Input.RollID,
		Placements:             placements,
		NextSlots:              workingSlots,
		GeometryReuseHitCount:  geometryReuseHits,
		ReusableResidualAreaM2: sumRawMaterialBatchOptimizerReusableResidualArea(workingSlots),
	}, true
}

func rawMaterialBatchOptimizerPhase4SlotFitsDemand(
	slot rawMaterialBatchGeometryPhase3Slot,
	demandLine rawMaterialBatchOptimizerContextDemandLine,
) bool {
	slotBounds := rawMaterialGeometryPolygonBounds(slot.Polygon)
	envelopePolygon := buildRawMaterialRectanglePolygon(slotBounds.MinX, slotBounds.MinY, demandLine.WidthMM, demandLine.LengthMM)
	if !rawMaterialGeometryPolygonContainsPolygon(slot.Polygon, envelopePolygon) {
		return false
	}
	envelopeBounds := rawMaterialGeometryPolygonBounds(envelopePolygon)
	actualPolygon := buildRawMaterialCenteredRotatedRectanglePolygon(
		demandLine.ActualWidthMM,
		demandLine.ActualLengthMM,
		demandLine.CutAngleDeg,
		envelopeBounds.MinX+demandLine.WidthMM/2,
		envelopeBounds.MinY+demandLine.LengthMM/2,
	)
	return rawMaterialGeometryPolygonContainsPolygon(slot.Polygon, actualPolygon)
}

func placeRawMaterialBatchOptimizerPhase4PieceOnSlot(
	slots []rawMaterialBatchGeometryPhase3Slot,
	selectedIndex int,
	roll rawMaterialBatchOptimizerContextRoll,
	demandLine rawMaterialBatchOptimizerContextDemandLine,
) (rawMaterialBatchGeometryPhase3Placement, []rawMaterialBatchGeometryPhase3Slot, bool) {
	selectedSlot := slots[selectedIndex]
	slotBounds := rawMaterialGeometryPolygonBounds(selectedSlot.Polygon)
	envelopePolygon := buildRawMaterialRectanglePolygon(slotBounds.MinX, slotBounds.MinY, demandLine.WidthMM, demandLine.LengthMM)
	if !rawMaterialGeometryPolygonContainsPolygon(selectedSlot.Polygon, envelopePolygon) {
		return rawMaterialBatchGeometryPhase3Placement{}, nil, false
	}
	envelopeBounds := rawMaterialGeometryPolygonBounds(envelopePolygon)
	actualPolygon := buildRawMaterialCenteredRotatedRectanglePolygon(
		demandLine.ActualWidthMM,
		demandLine.ActualLengthMM,
		demandLine.CutAngleDeg,
		envelopeBounds.MinX+demandLine.WidthMM/2,
		envelopeBounds.MinY+demandLine.LengthMM/2,
	)
	if !rawMaterialGeometryPolygonContainsPolygon(selectedSlot.Polygon, actualPolygon) {
		return rawMaterialBatchGeometryPhase3Placement{}, nil, false
	}
	residualPolygons := buildRawMaterialBatchOptimizerPhase1CellResidualPolygons(
		envelopeBounds.MinX,
		envelopeBounds.MinY,
		demandLine.WidthMM,
		demandLine.LengthMM,
		demandLine.CutAngleDeg,
		actualPolygon,
	)
	nextSlots := append(cloneRawMaterialBatchOptimizerPhase3Slots(slots[:selectedIndex]), cloneRawMaterialBatchOptimizerPhase3Slots(slots[selectedIndex+1:])...)
	for _, nextPolygon := range splitRawMaterialGeometryRectangleSlotByEnvelope(selectedSlot.Polygon, envelopePolygon) {
		nextSlots = append(nextSlots, rawMaterialBatchGeometryPhase3Slot{Polygon: nextPolygon, Source: "residual"})
	}
	return rawMaterialBatchGeometryPhase3Placement{
		RollID:           roll.Input.RollID,
		DemandLine:       demandLine,
		EnvelopePolygon:  envelopePolygon,
		ActualPolygon:    actualPolygon,
		ResidualPolygons: residualPolygons,
		UsedResidualSlot: selectedSlot.Source == "residual",
	}, nextSlots, true
}

func applyRawMaterialBatchOptimizerPhase4PlacementOption(
	state rawMaterialBatchGeometryPhase4SearchState,
	demandLine rawMaterialBatchOptimizerContextDemandLine,
	option rawMaterialBatchGeometryPhase4PlacementOption,
) rawMaterialBatchGeometryPhase4SearchState {
	nextState := cloneRawMaterialBatchOptimizerPhase4SearchState(state)
	nextState.RollSlots[option.RollID] = cloneRawMaterialBatchOptimizerPhase3Slots(option.NextSlots)
	rollState := ensureRawMaterialBatchOptimizerRollState(nextState.RollStates, option.RollID)
	updateRawMaterialBatchOptimizerRollState(rollState, demandLine)
	if demandLine.RollGroupKey != "" {
		if _, exists := nextState.GroupAssignedRolls[demandLine.RollGroupKey]; !exists {
			nextState.GroupAssignedRolls[demandLine.RollGroupKey] = option.RollID
		}
	}
	nextState.Placements = append(nextState.Placements, option.Placements...)
	summary := nextState.DemandSummaries[demandLine.Input.DemandLineID]
	if summary == nil {
		summary = &rawMaterialBatchGeometryDemandPlacementSummary{DemandLineID: demandLine.Input.DemandLineID}
		nextState.DemandSummaries[demandLine.Input.DemandLineID] = summary
	}
	summary.AllocatedSets += 1
	summary.AllocatedPieces += demandLine.PieceCountPerSet
	summary.PlacedPhysicalPieces += len(option.Placements)
	assignmentKey := fmt.Sprintf("%s::%s", option.RollID, demandLine.Input.DemandLineID)
	assignment := nextState.AssignmentLookup[assignmentKey]
	if assignment == nil {
		assignment = &models.RawMaterialBatchOptimizerPlanAssignment{RollID: option.RollID, DemandLineID: demandLine.Input.DemandLineID}
		nextState.AssignmentLookup[assignmentKey] = assignment
	}
	assignment.AllocatedSets += 1
	assignment.AllocatedPieces += demandLine.PieceCountPerSet
	nextState.ConsumedAreaM2 += float64(demandLine.PieceCountPerSet*demandLine.LayupCount) * demandLine.PieceAreaM2
	nextState.FulfilledSets += 1
	nextState.FulfilledPieces += demandLine.PieceCountPerSet
	nextState.GeometryReuseHitCount += option.GeometryReuseHitCount
	nextState.ReusableResidualAreaM2 = calculateRawMaterialBatchOptimizerReusableResidualArea(nextState.RollSlots)
	return nextState
}

func pruneRawMaterialBatchOptimizerPhase4SearchStates(
	states []rawMaterialBatchGeometryPhase4SearchState,
	beamWidth int,
) []rawMaterialBatchGeometryPhase4SearchState {
	if len(states) <= beamWidth {
		return states
	}
	sort.SliceStable(states, func(i int, j int) bool {
		if states[i].FulfilledPieces == states[j].FulfilledPieces {
			if states[i].GeometryReuseHitCount == states[j].GeometryReuseHitCount {
				if states[i].ReusableResidualAreaM2 == states[j].ReusableResidualAreaM2 {
					return len(states[i].Placements) < len(states[j].Placements)
				}
				return states[i].ReusableResidualAreaM2 > states[j].ReusableResidualAreaM2
			}
			return states[i].GeometryReuseHitCount > states[j].GeometryReuseHitCount
		}
		return states[i].FulfilledPieces > states[j].FulfilledPieces
	})
	return states[:beamWidth]
}

func buildRawMaterialBatchOptimizerPhase4CandidateFromState(
	context rawMaterialBatchOptimizerContext,
	orderedDemandLines []rawMaterialBatchOptimizerContextDemandLine,
	state rawMaterialBatchGeometryPhase4SearchState,
	strategyKey string,
	explanation string,
	index int,
) rawMaterialBatchOptimizerCandidatePlan {
	assignments := make([]models.RawMaterialBatchOptimizerPlanAssignment, 0, len(state.AssignmentLookup))
	for _, assignment := range state.AssignmentLookup {
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
		summary := state.DemandSummaries[demandLine.Input.DemandLineID]
		allocatedSets := 0
		allocatedPieces := 0
		if summary != nil {
			allocatedSets = summary.AllocatedSets
			allocatedPieces = summary.AllocatedPieces
		}
		remainingSets := maxInt(demandLine.RequiredSets-allocatedSets, 0)
		remainingPieces := maxInt(demandLine.RequiredPieces-allocatedPieces, 0)
		if remainingSets > 0 || remainingPieces > 0 {
			if demandLine.Input.MustFulfill {
				mustFulfillSatisfied = false
			}
			unfulfilledLines = append(unfulfilledLines, models.RawMaterialBatchOptimizerUnfulfilledLine{
				DemandLineID:    demandLine.Input.DemandLineID,
				RemainingSets:   remainingSets,
				RemainingPieces: remainingPieces,
				Reason:          buildRawMaterialBatchOptimizerPhase3UnfulfilledReason(demandLine, state.GroupAssignedRolls),
			})
		}
	}
	geometryLayoutSummary, _ := buildRawMaterialBatchOptimizerPhase3GeometryLayoutSummary(context.Rolls, state.Placements, state.RollSlots)
	candidateExplanation := explanation
	if index > 0 {
		candidateExplanation = fmt.Sprintf("%s；第 %d 条受控 residual search 分支候选。", explanation, index+1)
	}
	return rawMaterialBatchOptimizerCandidatePlan{
		Assignments:            assignments,
		UnfulfilledLines:       unfulfilledLines,
		ConsumedAreaM2:         roundRawMaterialBatchOptimizer(state.ConsumedAreaM2, 3),
		FulfilledSets:          state.FulfilledSets,
		FulfilledPieces:        state.FulfilledPieces,
		MustFulfillSatisfied:   mustFulfillSatisfied,
		StrategyKey:            strategyKey,
		Explanation:            candidateExplanation,
		GeometryReuseHitCount:  state.GeometryReuseHitCount,
		ReusableResidualAreaM2: roundRawMaterialBatchOptimizer(state.ReusableResidualAreaM2, 6),
		GeometryLayoutSummary:  geometryLayoutSummary,
	}
}

func cloneRawMaterialBatchOptimizerPhase4SearchState(
	state rawMaterialBatchGeometryPhase4SearchState,
) rawMaterialBatchGeometryPhase4SearchState {
	rollSlots := make(map[string][]rawMaterialBatchGeometryPhase3Slot, len(state.RollSlots))
	for rollID, slots := range state.RollSlots {
		rollSlots[rollID] = cloneRawMaterialBatchOptimizerPhase3Slots(slots)
	}
	rollStates := make(map[string]*rawMaterialBatchOptimizerRollAllocationState, len(state.RollStates))
	for rollID, rollState := range state.RollStates {
		rollStates[rollID] = cloneRawMaterialBatchOptimizerRollAllocationState(rollState)
	}
	groupAssignedRolls := make(map[string]string, len(state.GroupAssignedRolls))
	for key, value := range state.GroupAssignedRolls {
		groupAssignedRolls[key] = value
	}
	placements := append([]rawMaterialBatchGeometryPhase3Placement(nil), state.Placements...)
	assignmentLookup := make(map[string]*models.RawMaterialBatchOptimizerPlanAssignment, len(state.AssignmentLookup))
	for key, assignment := range state.AssignmentLookup {
		copyValue := *assignment
		assignmentLookup[key] = &copyValue
	}
	demandSummaries := make(map[string]*rawMaterialBatchGeometryDemandPlacementSummary, len(state.DemandSummaries))
	for key, summary := range state.DemandSummaries {
		copyValue := *summary
		demandSummaries[key] = &copyValue
	}
	return rawMaterialBatchGeometryPhase4SearchState{
		RollSlots:              rollSlots,
		RollStates:             rollStates,
		GroupAssignedRolls:     groupAssignedRolls,
		Placements:             placements,
		AssignmentLookup:       assignmentLookup,
		DemandSummaries:        demandSummaries,
		ConsumedAreaM2:         state.ConsumedAreaM2,
		FulfilledSets:          state.FulfilledSets,
		FulfilledPieces:        state.FulfilledPieces,
		GeometryReuseHitCount:  state.GeometryReuseHitCount,
		ReusableResidualAreaM2: state.ReusableResidualAreaM2,
	}
}

func cloneRawMaterialBatchOptimizerRollAllocationState(
	state *rawMaterialBatchOptimizerRollAllocationState,
) *rawMaterialBatchOptimizerRollAllocationState {
	if state == nil {
		return &rawMaterialBatchOptimizerRollAllocationState{
			DemandLineIDs:      make(map[string]struct{}),
			RollGroupKeys:      make(map[string]struct{}),
			YarnDirectionModes: make(map[string]struct{}),
		}
	}
	clone := &rawMaterialBatchOptimizerRollAllocationState{
		DemandLineIDs:       make(map[string]struct{}, len(state.DemandLineIDs)),
		RollGroupKeys:       make(map[string]struct{}, len(state.RollGroupKeys)),
		YarnDirectionModes:  make(map[string]struct{}, len(state.YarnDirectionModes)),
		HasMixRestricted:    state.HasMixRestricted,
		HasDirectionLocked:  state.HasDirectionLocked,
		HasAdjacentGrouping: state.HasAdjacentGrouping,
	}
	for key := range state.DemandLineIDs {
		clone.DemandLineIDs[key] = struct{}{}
	}
	for key := range state.RollGroupKeys {
		clone.RollGroupKeys[key] = struct{}{}
	}
	for key := range state.YarnDirectionModes {
		clone.YarnDirectionModes[key] = struct{}{}
	}
	return clone
}

func cloneRawMaterialBatchOptimizerPhase3Slots(
	slots []rawMaterialBatchGeometryPhase3Slot,
) []rawMaterialBatchGeometryPhase3Slot {
	result := make([]rawMaterialBatchGeometryPhase3Slot, 0, len(slots))
	for _, slot := range slots {
		result = append(result, rawMaterialBatchGeometryPhase3Slot{
			Polygon: rawMaterialGeometryPolygon{Points: append([]rawMaterialGeometryPoint(nil), slot.Polygon.Points...)},
			Source:  slot.Source,
		})
	}
	return result
}

func calculateRawMaterialBatchOptimizerReusableResidualArea(
	rollSlots map[string][]rawMaterialBatchGeometryPhase3Slot,
) float64 {
	total := 0.0
	for _, slots := range rollSlots {
		total += sumRawMaterialBatchOptimizerReusableResidualArea(slots)
	}
	return roundRawMaterialBatchOptimizer(total, 6)
}

func sumRawMaterialBatchOptimizerReusableResidualArea(
	slots []rawMaterialBatchGeometryPhase3Slot,
) float64 {
	total := 0.0
	for _, slot := range slots {
		if slot.Source != "residual" {
			continue
		}
		total += rawMaterialGeometryPolygonArea(slot.Polygon)
	}
	return total
}
