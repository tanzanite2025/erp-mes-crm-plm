package services

import (
	"fmt"
	"sort"
	"strings"
	"xdfc-server/models"
)

type rawMaterialBatchOptimizerCandidateStrategy struct {
	Key         string
	Explanation string
	Order       func(context rawMaterialBatchOptimizerContext) []rawMaterialBatchOptimizerContextDemandLine
}

type rawMaterialBatchOptimizerRollAllocationState struct {
	DemandLineIDs       map[string]struct{}
	RollGroupKeys       map[string]struct{}
	YarnDirectionModes  map[string]struct{}
	HasMixRestricted    bool
	HasDirectionLocked  bool
	HasAdjacentGrouping bool
}

func seedRawMaterialBatchOptimizerCandidates(
	context rawMaterialBatchOptimizerContext,
) []rawMaterialBatchOptimizerCandidatePlan {
	if len(context.DemandLines) == 0 {
		return []rawMaterialBatchOptimizerCandidatePlan{}
	}

	strategies := buildRawMaterialBatchOptimizerCandidateStrategies(context)

	candidates := make([]rawMaterialBatchOptimizerCandidatePlan, 0, len(strategies))
	seen := make(map[string]struct{}, len(strategies))
	for _, strategy := range strategies {
		candidate := buildRawMaterialBatchOptimizerGreedyCandidate(context, strategy.Order(context), strategy.Key, strategy.Explanation)
		signature := buildRawMaterialBatchOptimizerCandidateSignature(candidate)
		if _, exists := seen[signature]; exists {
			continue
		}
		seen[signature] = struct{}{}
		candidates = append(candidates, candidate)
		if len(candidates) >= context.MaxCandidatePlans {
			break
		}
	}

	return candidates
}

func buildRawMaterialBatchOptimizerCandidateStrategies(
	context rawMaterialBatchOptimizerContext,
) []rawMaterialBatchOptimizerCandidateStrategy {
	strategies := []rawMaterialBatchOptimizerCandidateStrategy{
		{
			Key:         "priority-first",
			Explanation: "按 mustFulfill、优先级与面积排序生成候选。",
			Order: func(context rawMaterialBatchOptimizerContext) []rawMaterialBatchOptimizerContextDemandLine {
				return cloneRawMaterialBatchOptimizerDemandLines(context.DemandLines)
			},
		},
	}

	if context.HasRollGroups {
		strategies = append(strategies, rawMaterialBatchOptimizerCandidateStrategy{
			Key:         "group-first",
			Explanation: "按组内连续性、mustFulfill、顺序与优先级生成候选。",
			Order: func(context rawMaterialBatchOptimizerContext) []rawMaterialBatchOptimizerContextDemandLine {
				ordered := cloneRawMaterialBatchOptimizerDemandLines(context.DemandLines)
				sort.SliceStable(ordered, func(i, j int) bool {
					left := ordered[i]
					right := ordered[j]
					if left.Input.MustFulfill != right.Input.MustFulfill {
						return left.Input.MustFulfill
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
					if left.RequiredAreaM2 == right.RequiredAreaM2 {
						return left.Input.DemandLineID < right.Input.DemandLineID
					}
					return left.RequiredAreaM2 > right.RequiredAreaM2
				})
				return ordered
			},
		})
	}

	if context.HasOrderSequence {
		strategies = append(strategies, rawMaterialBatchOptimizerCandidateStrategy{
			Key:         "sequence-first",
			Explanation: "按顺序号、mustFulfill 与优先级生成候选。",
			Order: func(context rawMaterialBatchOptimizerContext) []rawMaterialBatchOptimizerContextDemandLine {
				ordered := cloneRawMaterialBatchOptimizerDemandLines(context.DemandLines)
				sort.SliceStable(ordered, func(i, j int) bool {
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
					if left.Input.Priority != right.Input.Priority {
						return left.Input.Priority > right.Input.Priority
					}
					if left.RequiredSets == right.RequiredSets {
						return left.Input.DemandLineID < right.Input.DemandLineID
					}
					return left.RequiredSets > right.RequiredSets
				})
				return ordered
			},
		})
	}

	if context.HasDirectionModes {
		strategies = append(strategies, rawMaterialBatchOptimizerCandidateStrategy{
			Key:         "direction-first",
			Explanation: "按方向聚类、减少切换生成候选。",
			Order: func(context rawMaterialBatchOptimizerContext) []rawMaterialBatchOptimizerContextDemandLine {
				ordered := cloneRawMaterialBatchOptimizerDemandLines(context.DemandLines)
				sort.SliceStable(ordered, func(i, j int) bool {
					left := ordered[i]
					right := ordered[j]
					if left.YarnDirectionMode != right.YarnDirectionMode {
						if left.YarnDirectionMode == "" {
							return false
						}
						if right.YarnDirectionMode == "" {
							return true
						}
						return left.YarnDirectionMode < right.YarnDirectionMode
					}
					if left.Input.MustFulfill != right.Input.MustFulfill {
						return left.Input.MustFulfill
					}
					if left.Input.Priority != right.Input.Priority {
						return left.Input.Priority > right.Input.Priority
					}
					if left.RequiredAreaM2 == right.RequiredAreaM2 {
						return left.Input.DemandLineID < right.Input.DemandLineID
					}
					return left.RequiredAreaM2 > right.RequiredAreaM2
				})
				return ordered
			},
		})
	}

	strategies = append(strategies,
		rawMaterialBatchOptimizerCandidateStrategy{
			Key:         "yield-first",
			Explanation: "按单位面积利用优先生成候选。",
			Order: func(context rawMaterialBatchOptimizerContext) []rawMaterialBatchOptimizerContextDemandLine {
				ordered := cloneRawMaterialBatchOptimizerDemandLines(context.DemandLines)
				sort.SliceStable(ordered, func(i, j int) bool {
					left := ordered[i]
					right := ordered[j]
					if left.PieceAreaM2 == right.PieceAreaM2 {
						if left.RequiredAreaM2 == right.RequiredAreaM2 {
							return left.Input.DemandLineID < right.Input.DemandLineID
						}
						return left.RequiredAreaM2 > right.RequiredAreaM2
					}
					return left.PieceAreaM2 > right.PieceAreaM2
				})
				return ordered
			},
		},
		rawMaterialBatchOptimizerCandidateStrategy{
			Key:         "delivery-first",
			Explanation: "按 mustFulfill、优先级与交付需求排序生成候选。",
			Order: func(context rawMaterialBatchOptimizerContext) []rawMaterialBatchOptimizerContextDemandLine {
				ordered := cloneRawMaterialBatchOptimizerDemandLines(context.DemandLines)
				sort.SliceStable(ordered, func(i, j int) bool {
					left := ordered[i]
					right := ordered[j]
					if left.Input.MustFulfill != right.Input.MustFulfill {
						return left.Input.MustFulfill
					}
					if left.Input.Priority != right.Input.Priority {
						return left.Input.Priority > right.Input.Priority
					}
					if left.RequiredSets == right.RequiredSets {
						return left.Input.DemandLineID < right.Input.DemandLineID
					}
					return left.RequiredSets > right.RequiredSets
				})
				return ordered
			},
		},
		rawMaterialBatchOptimizerCandidateStrategy{
			Key:         "stability-first",
			Explanation: "按更少切换和更稳定的长料优先顺序生成候选。",
			Order: func(context rawMaterialBatchOptimizerContext) []rawMaterialBatchOptimizerContextDemandLine {
				ordered := cloneRawMaterialBatchOptimizerDemandLines(context.DemandLines)
				sort.SliceStable(ordered, func(i, j int) bool {
					left := ordered[i]
					right := ordered[j]
					if left.WidthMM == right.WidthMM {
						if left.LengthMM == right.LengthMM {
							return left.Input.DemandLineID < right.Input.DemandLineID
						}
						return left.LengthMM > right.LengthMM
					}
					return left.WidthMM > right.WidthMM
				})
				return ordered
			},
		},
	)

	seen := make(map[string]struct{}, len(strategies))
	unique := make([]rawMaterialBatchOptimizerCandidateStrategy, 0, len(strategies))
	for _, strategy := range strategies {
		if _, exists := seen[strategy.Key]; exists {
			continue
		}
		seen[strategy.Key] = struct{}{}
		unique = append(unique, strategy)
	}

	return unique
}

func buildRawMaterialBatchOptimizerGreedyCandidate(
	context rawMaterialBatchOptimizerContext,
	demandLines []rawMaterialBatchOptimizerContextDemandLine,
	strategyKey string,
	explanation string,
) rawMaterialBatchOptimizerCandidatePlan {
	assignments := make([]models.RawMaterialBatchOptimizerPlanAssignment, 0, len(demandLines))
	remainingSets := make(map[string]int, len(demandLines))
	remainingPieces := make(map[string]int, len(demandLines))
	remainingRollArea := make(map[string]float64, len(context.Rolls))
	rollStates := make(map[string]*rawMaterialBatchOptimizerRollAllocationState, len(context.Rolls))
	for _, demandLine := range demandLines {
		remainingSets[demandLine.Input.DemandLineID] = demandLine.RequiredSets
		remainingPieces[demandLine.Input.DemandLineID] = demandLine.RequiredPieces
	}
	for _, roll := range context.Rolls {
		remainingRollArea[roll.Input.RollID] = roll.RollAreaM2
	}

	consumedAreaM2 := 0.0
	fulfilledSets := 0
	fulfilledPieces := 0
	for _, demandLine := range demandLines {
		remainingSetCount := remainingSets[demandLine.Input.DemandLineID]
		if remainingSetCount <= 0 {
			continue
		}

		areaPerSetM2 := float64(demandLine.PieceCountPerSet*demandLine.LayupCount) * demandLine.PieceAreaM2
		if areaPerSetM2 <= 0 {
			continue
		}

		for _, roll := range orderRawMaterialBatchOptimizerRollsForDemand(context.Rolls, rollStates, demandLine) {
			remainingSetCount = remainingSets[demandLine.Input.DemandLineID]
			if remainingSetCount <= 0 {
				break
			}

			availableAreaM2 := remainingRollArea[roll.Input.RollID]
			if availableAreaM2 <= 0 {
				continue
			}

			state := ensureRawMaterialBatchOptimizerRollState(rollStates, roll.Input.RollID)
			if !isRawMaterialBatchOptimizerDemandCompatibleWithRoll(demandLine, state) {
				continue
			}

			maxAllocatableSets := int(availableAreaM2 / areaPerSetM2)
			allocatedSets := minIntRawMaterialBatchOptimizer(remainingSetCount, maxAllocatableSets)
			if allocatedSets <= 0 {
				continue
			}

			allocatedPieces := minIntRawMaterialBatchOptimizer(
				remainingPieces[demandLine.Input.DemandLineID],
				allocatedSets*demandLine.PieceCountPerSet,
			)
			assignments = append(assignments, models.RawMaterialBatchOptimizerPlanAssignment{
				RollID:          roll.Input.RollID,
				DemandLineID:    demandLine.Input.DemandLineID,
				AllocatedSets:   allocatedSets,
				AllocatedPieces: allocatedPieces,
			})

			consumedAreaM2 += float64(allocatedSets) * areaPerSetM2
			remainingRollArea[roll.Input.RollID] -= float64(allocatedSets) * areaPerSetM2
			remainingSets[demandLine.Input.DemandLineID] -= allocatedSets
			remainingPieces[demandLine.Input.DemandLineID] = maxInt(
				remainingPieces[demandLine.Input.DemandLineID]-allocatedPieces,
				0,
			)
			fulfilledSets += allocatedSets
			fulfilledPieces += allocatedPieces
			updateRawMaterialBatchOptimizerRollState(state, demandLine)
		}
	}

	unfulfilledLines := make([]models.RawMaterialBatchOptimizerUnfulfilledLine, 0)
	mustFulfillSatisfied := true
	for _, demandLine := range demandLines {
		remainingSetCount := remainingSets[demandLine.Input.DemandLineID]
		remainingPieceCount := remainingPieces[demandLine.Input.DemandLineID]
		if remainingSetCount <= 0 && remainingPieceCount <= 0 {
			continue
		}

		reason := "卷材面积不足，当前基础候选未完全覆盖。"
		if demandLine.Input.MustFulfill {
			mustFulfillSatisfied = false
			reason = "mustFulfill 需求未完全满足。"
		}
		unfulfilledLines = append(unfulfilledLines, models.RawMaterialBatchOptimizerUnfulfilledLine{
			DemandLineID:    demandLine.Input.DemandLineID,
			RemainingSets:   maxInt(remainingSetCount, 0),
			RemainingPieces: maxInt(remainingPieceCount, 0),
			Reason:          reason,
		})
	}

	return rawMaterialBatchOptimizerCandidatePlan{
		Assignments:          assignments,
		UnfulfilledLines:     unfulfilledLines,
		ConsumedAreaM2:       roundRawMaterialBatchOptimizer(consumedAreaM2, 3),
		FulfilledSets:        fulfilledSets,
		FulfilledPieces:      fulfilledPieces,
		MustFulfillSatisfied: mustFulfillSatisfied,
		StrategyKey:          strategyKey,
		Explanation:          explanation,
	}
}

func cloneRawMaterialBatchOptimizerDemandLines(
	source []rawMaterialBatchOptimizerContextDemandLine,
) []rawMaterialBatchOptimizerContextDemandLine {
	return append([]rawMaterialBatchOptimizerContextDemandLine(nil), source...)
}

func ensureRawMaterialBatchOptimizerRollState(
	states map[string]*rawMaterialBatchOptimizerRollAllocationState,
	rollID string,
) *rawMaterialBatchOptimizerRollAllocationState {
	if state, exists := states[rollID]; exists {
		return state
	}
	state := &rawMaterialBatchOptimizerRollAllocationState{
		DemandLineIDs:      make(map[string]struct{}),
		RollGroupKeys:      make(map[string]struct{}),
		YarnDirectionModes: make(map[string]struct{}),
	}
	states[rollID] = state
	return state
}

func updateRawMaterialBatchOptimizerRollState(
	state *rawMaterialBatchOptimizerRollAllocationState,
	demandLine rawMaterialBatchOptimizerContextDemandLine,
) {
	state.DemandLineIDs[demandLine.Input.DemandLineID] = struct{}{}
	if demandLine.RollGroupKey != "" {
		state.RollGroupKeys[demandLine.RollGroupKey] = struct{}{}
	}
	if demandLine.YarnDirectionMode != "" {
		state.YarnDirectionModes[demandLine.YarnDirectionMode] = struct{}{}
	}
	state.HasMixRestricted = state.HasMixRestricted || demandLine.IsMixRestricted
	state.HasDirectionLocked = state.HasDirectionLocked || demandLine.DirectionLocked
	state.HasAdjacentGrouping = state.HasAdjacentGrouping || demandLine.RequiresAdjacentGrouping
}

func isRawMaterialBatchOptimizerDemandCompatibleWithRoll(
	demandLine rawMaterialBatchOptimizerContextDemandLine,
	state *rawMaterialBatchOptimizerRollAllocationState,
) bool {
	if len(state.DemandLineIDs) == 0 {
		return true
	}
	if demandLine.IsMixRestricted && !rawMaterialBatchOptimizerRollStateContainsOnlyDemand(state, demandLine.Input.DemandLineID) {
		return false
	}
	if state.HasMixRestricted && !rawMaterialBatchOptimizerRollStateContainsDemand(state, demandLine.Input.DemandLineID) {
		return false
	}
	if demandLine.DirectionLocked && rawMaterialBatchOptimizerRollStateHasDifferentDirection(state, demandLine.YarnDirectionMode) {
		return false
	}
	if state.HasDirectionLocked && demandLine.YarnDirectionMode == "" && len(state.YarnDirectionModes) > 0 {
		return false
	}
	if state.HasDirectionLocked && rawMaterialBatchOptimizerRollStateHasDifferentDirection(state, demandLine.YarnDirectionMode) {
		return false
	}
	return true
}

func rawMaterialBatchOptimizerRollStateContainsDemand(
	state *rawMaterialBatchOptimizerRollAllocationState,
	demandLineID string,
) bool {
	_, exists := state.DemandLineIDs[demandLineID]
	return exists
}

func rawMaterialBatchOptimizerRollStateContainsOnlyDemand(
	state *rawMaterialBatchOptimizerRollAllocationState,
	demandLineID string,
) bool {
	if len(state.DemandLineIDs) == 0 {
		return true
	}
	if len(state.DemandLineIDs) > 1 {
		return false
	}
	return rawMaterialBatchOptimizerRollStateContainsDemand(state, demandLineID)
}

func rawMaterialBatchOptimizerRollStateHasDifferentDirection(
	state *rawMaterialBatchOptimizerRollAllocationState,
	direction string,
) bool {
	if len(state.YarnDirectionModes) == 0 {
		return false
	}
	if direction == "" {
		return true
	}
	if _, exists := state.YarnDirectionModes[direction]; exists && len(state.YarnDirectionModes) == 1 {
		return false
	}
	for value := range state.YarnDirectionModes {
		if value != direction {
			return true
		}
	}
	return false
}

func orderRawMaterialBatchOptimizerRollsForDemand(
	rolls []rawMaterialBatchOptimizerContextRoll,
	states map[string]*rawMaterialBatchOptimizerRollAllocationState,
	demandLine rawMaterialBatchOptimizerContextDemandLine,
) []rawMaterialBatchOptimizerContextRoll {
	ordered := append([]rawMaterialBatchOptimizerContextRoll(nil), rolls...)
	sort.SliceStable(ordered, func(i, j int) bool {
		left := ordered[i]
		right := ordered[j]
		leftScore := scoreRawMaterialBatchOptimizerRollPreference(states[left.Input.RollID], demandLine)
		rightScore := scoreRawMaterialBatchOptimizerRollPreference(states[right.Input.RollID], demandLine)
		if leftScore == rightScore {
			if left.RollAreaM2 == right.RollAreaM2 {
				return left.Input.RollID < right.Input.RollID
			}
			return left.RollAreaM2 > right.RollAreaM2
		}
		return leftScore > rightScore
	})
	return ordered
}

func scoreRawMaterialBatchOptimizerRollPreference(
	state *rawMaterialBatchOptimizerRollAllocationState,
	demandLine rawMaterialBatchOptimizerContextDemandLine,
) int {
	if state == nil || len(state.DemandLineIDs) == 0 {
		if demandLine.IsMixRestricted {
			return 120
		}
		return 80
	}
	score := 0
	if demandLine.RollGroupKey != "" {
		if _, exists := state.RollGroupKeys[demandLine.RollGroupKey]; exists {
			score += 60
		} else {
			score -= 20
		}
	}
	if demandLine.RequiresAdjacentGrouping {
		if _, exists := state.RollGroupKeys[demandLine.RollGroupKey]; exists {
			score += 25
		}
	}
	if demandLine.YarnDirectionMode != "" {
		if _, exists := state.YarnDirectionModes[demandLine.YarnDirectionMode]; exists {
			score += 18
		} else if len(state.YarnDirectionModes) > 0 {
			score -= 12
		}
	}
	if demandLine.IsMixRestricted {
		score -= len(state.DemandLineIDs) * 20
	} else if state.HasMixRestricted {
		score -= 30
	}
	return score
}

func buildRawMaterialBatchOptimizerCandidateSignature(candidate rawMaterialBatchOptimizerCandidatePlan) string {
	parts := make([]string, 0, len(candidate.Assignments)+len(candidate.UnfulfilledLines)+1)
	for _, assignment := range candidate.Assignments {
		parts = append(parts, fmt.Sprintf("a:%s:%s:%d:%d", assignment.RollID, assignment.DemandLineID, assignment.AllocatedSets, assignment.AllocatedPieces))
	}
	for _, line := range candidate.UnfulfilledLines {
		parts = append(parts, fmt.Sprintf("u:%s:%d:%d", line.DemandLineID, line.RemainingSets, line.RemainingPieces))
	}
	if len(parts) == 0 {
		return candidate.StrategyKey + ":empty"
	}
	sort.Strings(parts)
	return strings.Join(parts, "|")
}
