package services

import (
	"math"
	"sort"
	"strings"
	"xdfc-server/models"
)

type rawMaterialBatchOptimizerContext struct {
	RequestID           string
	ObjectivePreset     string
	SearchConfig        rawMaterialBatchOptimizerSearchConfig
	ScoreWeights        models.RawMaterialBatchOptimizerScoreWeights
	KnifeGapMM          float64
	DefaultEdgeTrimMM   float64
	MaxCandidatePlans   int
	TimeLimitMs         int
	Rolls               []rawMaterialBatchOptimizerContextRoll
	DemandLines         []rawMaterialBatchOptimizerContextDemandLine
	TotalRollAreaM2     float64
	TotalRequiredSets   int
	TotalRequiredPieces int
	HasMustFulfill      bool
	IsSingleDemand      bool
	IsSingleCutSize     bool
	HasRollGroups       bool
	HasOrderSequence    bool
	HasDirectionModes   bool
	HasMixRestricted    bool
	HasStructuredRules  bool
}

type rawMaterialBatchOptimizerContextRoll struct {
	Input               models.RawMaterialBatchOptimizerRollInput
	EffectiveEdgeTrimMM float64
	RollLengthMM        float64
	RollAreaM2          float64
}

type rawMaterialBatchOptimizerContextDemandLine struct {
	Input                    models.RawMaterialBatchOptimizerDemandLineInput
	ActualWidthMM            float64
	ActualLengthMM           float64
	WidthMM                  float64
	LengthMM                 float64
	CutAngleDeg              float64
	PieceCountPerSet         int
	RequiredSets             int
	RequiredPieces           int
	LayupCount               int
	ActualPieceAreaM2        float64
	ActualRequiredAreaM2     float64
	PieceAreaM2              float64
	RequiredAreaM2           float64
	RollGroupKey             string
	OrderSequence            int
	YarnDirectionMode        string
	ProcessTags              []string
	NoteKeywords             []string
	IsMixRestricted          bool
	RequiresAdjacentGrouping bool
	DirectionLocked          bool
}

type rawMaterialBatchOptimizerCandidatePlan struct {
	Assignments            []models.RawMaterialBatchOptimizerPlanAssignment
	UnfulfilledLines       []models.RawMaterialBatchOptimizerUnfulfilledLine
	ConsumedAreaM2         float64
	FulfilledSets          int
	FulfilledPieces        int
	MustFulfillSatisfied   bool
	StrategyKey            string
	Explanation            string
	GeometryReuseHitCount  int
	ReusableResidualAreaM2 float64
	SearchConfig           models.RawMaterialBatchOptimizerSearchConfigSummary
	CandidateBudgetSummary models.RawMaterialBatchOptimizerCandidateBudgetSummary
	BudgetRerankReason     string
	ExplainabilitySummary  models.RawMaterialBatchOptimizerPlanExplainabilitySummary
	GeometryLayoutSummary  *models.RawMaterialBatchOptimizerGeometryLayoutSummary
}

func buildRawMaterialBatchOptimizerContext(
	requestID string,
	input models.RawMaterialBatchOptimizerSolveRequest,
) rawMaterialBatchOptimizerContext {
	rolls := make([]rawMaterialBatchOptimizerContextRoll, 0, len(input.Rolls))
	totalRollAreaM2 := 0.0
	for _, roll := range input.Rolls {
		effectiveEdgeTrimMM := maxFloat64(roll.EdgeTrimMM, input.DefaultEdgeTrimMM)
		rollLengthMM := roll.RollLengthM * 1000
		rollAreaM2 := roll.RemainingAreaM2
		if rollAreaM2 <= 0 {
			rollAreaM2 = roundRawMaterialBatchOptimizer((roll.RollWidthMM*rollLengthMM)/1_000_000, 3)
		}
		totalRollAreaM2 += rollAreaM2
		rolls = append(rolls, rawMaterialBatchOptimizerContextRoll{
			Input:               roll,
			EffectiveEdgeTrimMM: effectiveEdgeTrimMM,
			RollLengthMM:        rollLengthMM,
			RollAreaM2:          rollAreaM2,
		})
	}
	sort.SliceStable(rolls, func(i, j int) bool {
		if rolls[i].RollAreaM2 == rolls[j].RollAreaM2 {
			return rolls[i].Input.RollID < rolls[j].Input.RollID
		}
		return rolls[i].RollAreaM2 > rolls[j].RollAreaM2
	})

	demandLines := make([]rawMaterialBatchOptimizerContextDemandLine, 0, len(input.DemandLines))
	totalRequiredSets := 0
	totalRequiredPieces := 0
	hasMustFulfill := false
	hasRollGroups := false
	hasOrderSequence := false
	hasDirectionModes := false
	hasMixRestricted := false
	hasStructuredRules := false
	cutSizeSet := make(map[string]struct{}, len(input.DemandLines))
	for _, demandLine := range input.DemandLines {
		requiredSets := demandLine.RequiredSets
		if requiredSets <= 0 {
			requiredSets = int(math.Ceil(float64(maxInt(demandLine.RequiredPieces, 1)) / float64(maxInt(demandLine.PieceCountPerSet, 1))))
		}
		requiredPieces := demandLine.RequiredPieces
		if requiredPieces <= 0 {
			requiredPieces = requiredSets * maxInt(demandLine.PieceCountPerSet, 1)
		}
		geometry := resolveRawMaterialCutGeometry(demandLine.WidthMM, demandLine.LengthMM, demandLine.CutAngle)
		actualPieceAreaM2 := geometry.BaseAreaM2
		pieceAreaM2 := geometry.EnvelopeAreaM2
		actualRequiredAreaM2 := float64(requiredSets*maxInt(demandLine.PieceCountPerSet, 1)*maxInt(demandLine.LayupCount, 1)) * actualPieceAreaM2
		requiredAreaM2 := float64(requiredSets*maxInt(demandLine.PieceCountPerSet, 1)*maxInt(demandLine.LayupCount, 1)) * pieceAreaM2
		rollGroupKey := normalizeRawMaterialBatchOptimizerRuleString(demandLine.RollGroupKey)
		orderSequence := maxInt(demandLine.OrderSequence, 0)
		yarnDirectionMode := normalizeRawMaterialBatchOptimizerRuleString(demandLine.YarnDirectionMode)
		processTags := normalizeRawMaterialBatchOptimizerRuleStringSlice(demandLine.ProcessTags)
		noteKeywords := normalizeRawMaterialBatchOptimizerRuleStringSlice(demandLine.NoteKeywords)
		isMixRestricted := !demandLine.AllowMixedPlan || rawMaterialBatchOptimizerHasRuleToken(processTags, noteKeywords, "no-mix")
		requiresAdjacentGrouping := rawMaterialBatchOptimizerHasRuleToken(processTags, noteKeywords, "must-adjacent")
		directionLocked := rawMaterialBatchOptimizerHasRuleToken(processTags, noteKeywords, "direction-lock", "same-direction")
		totalRequiredSets += requiredSets
		totalRequiredPieces += requiredPieces
		hasMustFulfill = hasMustFulfill || demandLine.MustFulfill
		hasRollGroups = hasRollGroups || rollGroupKey != ""
		hasOrderSequence = hasOrderSequence || orderSequence > 0
		hasDirectionModes = hasDirectionModes || yarnDirectionMode != ""
		hasMixRestricted = hasMixRestricted || isMixRestricted
		hasStructuredRules = hasStructuredRules || rollGroupKey != "" || orderSequence > 0 || yarnDirectionMode != "" || len(processTags) > 0 || len(noteKeywords) > 0
		cutSizeSet[demandLine.CutSizeUnitID] = struct{}{}
		demandLines = append(demandLines, rawMaterialBatchOptimizerContextDemandLine{
			Input:                    demandLine,
			ActualWidthMM:            geometry.BaseWidthMM,
			ActualLengthMM:           geometry.BaseLengthMM,
			WidthMM:                  geometry.EnvelopeWidthMM,
			LengthMM:                 geometry.EnvelopeLengthMM,
			CutAngleDeg:              geometry.AngleDeg,
			PieceCountPerSet:         maxInt(demandLine.PieceCountPerSet, 1),
			RequiredSets:             requiredSets,
			RequiredPieces:           requiredPieces,
			LayupCount:               maxInt(demandLine.LayupCount, 1),
			ActualPieceAreaM2:        actualPieceAreaM2,
			ActualRequiredAreaM2:     roundRawMaterialBatchOptimizer(actualRequiredAreaM2, 3),
			PieceAreaM2:              pieceAreaM2,
			RequiredAreaM2:           roundRawMaterialBatchOptimizer(requiredAreaM2, 3),
			RollGroupKey:             rollGroupKey,
			OrderSequence:            orderSequence,
			YarnDirectionMode:        yarnDirectionMode,
			ProcessTags:              processTags,
			NoteKeywords:             noteKeywords,
			IsMixRestricted:          isMixRestricted,
			RequiresAdjacentGrouping: requiresAdjacentGrouping,
			DirectionLocked:          directionLocked,
		})
	}
	sort.SliceStable(demandLines, func(i, j int) bool {
		left := demandLines[i]
		right := demandLines[j]
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
		if left.RollGroupKey != right.RollGroupKey {
			if left.RollGroupKey == "" {
				return false
			}
			if right.RollGroupKey == "" {
				return true
			}
			return left.RollGroupKey < right.RollGroupKey
		}
		if left.RequiredAreaM2 == right.RequiredAreaM2 {
			return left.Input.DemandLineID < right.Input.DemandLineID
		}
		return left.RequiredAreaM2 > right.RequiredAreaM2
	})

	return rawMaterialBatchOptimizerContext{
		RequestID:           requestID,
		ObjectivePreset:     input.ObjectivePreset,
		SearchConfig:        buildRawMaterialBatchOptimizerSearchConfig(input),
		ScoreWeights:        buildRawMaterialBatchOptimizerScoreWeights(input),
		KnifeGapMM:          input.KnifeGapMM,
		DefaultEdgeTrimMM:   input.DefaultEdgeTrimMM,
		MaxCandidatePlans:   input.MaxCandidatePlans,
		TimeLimitMs:         input.TimeLimitMs,
		Rolls:               rolls,
		DemandLines:         demandLines,
		TotalRollAreaM2:     roundRawMaterialBatchOptimizer(totalRollAreaM2, 3),
		TotalRequiredSets:   totalRequiredSets,
		TotalRequiredPieces: totalRequiredPieces,
		HasMustFulfill:      hasMustFulfill,
		IsSingleDemand:      len(demandLines) == 1,
		IsSingleCutSize:     len(cutSizeSet) == 1,
		HasRollGroups:       hasRollGroups,
		HasOrderSequence:    hasOrderSequence,
		HasDirectionModes:   hasDirectionModes,
		HasMixRestricted:    hasMixRestricted,
		HasStructuredRules:  hasStructuredRules,
	}
}

func normalizeRawMaterialBatchOptimizerRuleString(value string) string {
	return strings.ToLower(strings.TrimSpace(value))
}

func normalizeRawMaterialBatchOptimizerRuleStringSlice(values []string) []string {
	if len(values) == 0 {
		return []string{}
	}
	seen := make(map[string]struct{}, len(values))
	result := make([]string, 0, len(values))
	for _, value := range values {
		normalized := normalizeRawMaterialBatchOptimizerRuleString(value)
		if normalized == "" {
			continue
		}
		if _, exists := seen[normalized]; exists {
			continue
		}
		seen[normalized] = struct{}{}
		result = append(result, normalized)
	}
	return result
}

func rawMaterialBatchOptimizerHasRuleToken(processTags []string, noteKeywords []string, targets ...string) bool {
	if len(targets) == 0 {
		return false
	}
	targetSet := make(map[string]struct{}, len(targets))
	for _, target := range targets {
		normalized := normalizeRawMaterialBatchOptimizerRuleString(target)
		if normalized == "" {
			continue
		}
		targetSet[normalized] = struct{}{}
	}
	for _, value := range processTags {
		if _, exists := targetSet[value]; exists {
			return true
		}
	}
	for _, value := range noteKeywords {
		if _, exists := targetSet[value]; exists {
			return true
		}
	}
	return false
}

func buildRawMaterialBatchOptimizerScoreWeights(
	input models.RawMaterialBatchOptimizerSolveRequest,
) models.RawMaterialBatchOptimizerScoreWeights {
	defaults := models.RawMaterialBatchOptimizerScoreWeights{
		FulfilledWeight:          35,
		UtilizationWeight:        55,
		StabilityWeight:          10,
		AssignmentPenaltyWeight:  4,
		UnfulfilledPenaltyWeight: 12,
		SplitPenaltyWeight:       6,
		MustPenaltyWeight:        45,
	}
	switch input.ObjectivePreset {
	case "delivery-first":
		defaults.FulfilledWeight = 60
		defaults.UtilizationWeight = 25
		defaults.StabilityWeight = 15
	case "stability-first":
		defaults.FulfilledWeight = 40
		defaults.UtilizationWeight = 30
		defaults.StabilityWeight = 30
	}
	weights := input.ScoreWeights
	if weights == (models.RawMaterialBatchOptimizerScoreWeights{}) {
		return defaults
	}
	return models.RawMaterialBatchOptimizerScoreWeights{
		FulfilledWeight:          pickRawMaterialBatchOptimizerWeight(weights.FulfilledWeight, defaults.FulfilledWeight),
		UtilizationWeight:        pickRawMaterialBatchOptimizerWeight(weights.UtilizationWeight, defaults.UtilizationWeight),
		StabilityWeight:          pickRawMaterialBatchOptimizerWeight(weights.StabilityWeight, defaults.StabilityWeight),
		AssignmentPenaltyWeight:  pickRawMaterialBatchOptimizerWeight(weights.AssignmentPenaltyWeight, defaults.AssignmentPenaltyWeight),
		UnfulfilledPenaltyWeight: pickRawMaterialBatchOptimizerWeight(weights.UnfulfilledPenaltyWeight, defaults.UnfulfilledPenaltyWeight),
		SplitPenaltyWeight:       pickRawMaterialBatchOptimizerWeight(weights.SplitPenaltyWeight, defaults.SplitPenaltyWeight),
		MustPenaltyWeight:        pickRawMaterialBatchOptimizerWeight(weights.MustPenaltyWeight, defaults.MustPenaltyWeight),
	}
}

func pickRawMaterialBatchOptimizerWeight(value float64, fallback float64) float64 {
	if value == 0 {
		return fallback
	}
	return maxFloat64(value, 0)
}

func roundRawMaterialBatchOptimizer(value float64, digits int) float64 {
	factor := math.Pow(10, float64(digits))
	return math.Round(value*factor) / factor
}

func maxInt(left int, right int) int {
	if left > right {
		return left
	}
	return right
}

func minIntRawMaterialBatchOptimizer(left int, right int) int {
	if left < right {
		return left
	}
	return right
}

func maxFloat64(left float64, right float64) float64 {
	if left > right {
		return left
	}
	return right
}
