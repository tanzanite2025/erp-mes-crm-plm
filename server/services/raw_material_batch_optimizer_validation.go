package services

import (
	"fmt"
	"strings"
	"xdfc-server/models"
)

type RawMaterialBatchOptimizerValidationError struct {
	Message string
}

func (e RawMaterialBatchOptimizerValidationError) Error() string {
	return e.Message
}

func newRawMaterialBatchOptimizerValidationError(format string, args ...any) error {
	return RawMaterialBatchOptimizerValidationError{Message: fmt.Sprintf(format, args...)}
}

func validateRawMaterialBatchOptimizerSolveRequest(input models.RawMaterialBatchOptimizerSolveRequest) error {
	if len(input.Rolls) == 0 {
		return newRawMaterialBatchOptimizerValidationError("请至少提供一条卷材输入")
	}
	if len(input.DemandLines) == 0 {
		return newRawMaterialBatchOptimizerValidationError("请至少提供一条需求行输入")
	}
	if input.KnifeGapMM < 0 {
		return newRawMaterialBatchOptimizerValidationError("刀缝不能为负数")
	}
	if input.DefaultEdgeTrimMM < 0 {
		return newRawMaterialBatchOptimizerValidationError("默认修边不能为负数")
	}
	if input.MaxCandidatePlans <= 0 {
		return newRawMaterialBatchOptimizerValidationError("候选方案数必须大于 0")
	}
	if input.TimeLimitMs <= 0 {
		return newRawMaterialBatchOptimizerValidationError("求解时限必须大于 0")
	}
	if !isSupportedRawMaterialBatchObjectivePreset(input.ObjectivePreset) {
		return newRawMaterialBatchOptimizerValidationError("不支持的求解目标预设: %s", strings.TrimSpace(input.ObjectivePreset))
	}
	if err := validateRawMaterialBatchOptimizerScoreWeights(input.ScoreWeights); err != nil {
		return err
	}

	seenRollIDs := make(map[string]struct{}, len(input.Rolls))
	for index, roll := range input.Rolls {
		if err := validateRawMaterialBatchOptimizerRollInput(index, roll, seenRollIDs); err != nil {
			return err
		}
	}

	seenDemandLineIDs := make(map[string]struct{}, len(input.DemandLines))
	for index, demandLine := range input.DemandLines {
		if err := validateRawMaterialBatchOptimizerDemandLineInput(index, demandLine, seenDemandLineIDs); err != nil {
			return err
		}
	}

	return nil
}

func validateRawMaterialBatchOptimizerRollInput(
	index int,
	roll models.RawMaterialBatchOptimizerRollInput,
	seen map[string]struct{},
) error {
	label := fmt.Sprintf("卷材[%d]", index+1)
	rollID := strings.TrimSpace(roll.RollID)
	if rollID == "" {
		return newRawMaterialBatchOptimizerValidationError("%s 缺少 rollId", label)
	}
	if _, exists := seen[rollID]; exists {
		return newRawMaterialBatchOptimizerValidationError("%s rollId 重复: %s", label, rollID)
	}
	seen[rollID] = struct{}{}
	if strings.TrimSpace(roll.PrepregSpecID) == "" {
		return newRawMaterialBatchOptimizerValidationError("%s 缺少 prepregSpecId", label)
	}
	if roll.RollWidthMM <= 0 {
		return newRawMaterialBatchOptimizerValidationError("%s 卷宽必须大于 0", label)
	}
	if roll.RollLengthM <= 0 {
		return newRawMaterialBatchOptimizerValidationError("%s 卷长必须大于 0", label)
	}
	if roll.RemainingAreaM2 <= 0 {
		return newRawMaterialBatchOptimizerValidationError("%s 剩余面积必须大于 0", label)
	}
	if roll.EdgeTrimMM < 0 {
		return newRawMaterialBatchOptimizerValidationError("%s 修边不能为负数", label)
	}
	if strings.TrimSpace(roll.Status) == "" {
		return newRawMaterialBatchOptimizerValidationError("%s 缺少状态字段", label)
	}
	return nil
}

func validateRawMaterialBatchOptimizerDemandLineInput(
	index int,
	demandLine models.RawMaterialBatchOptimizerDemandLineInput,
	seen map[string]struct{},
) error {
	label := fmt.Sprintf("需求行[%d]", index+1)
	demandLineID := strings.TrimSpace(demandLine.DemandLineID)
	if demandLineID == "" {
		return newRawMaterialBatchOptimizerValidationError("%s 缺少 demandLineId", label)
	}
	if _, exists := seen[demandLineID]; exists {
		return newRawMaterialBatchOptimizerValidationError("%s demandLineId 重复: %s", label, demandLineID)
	}
	seen[demandLineID] = struct{}{}
	if strings.TrimSpace(demandLine.CutSizeUnitID) == "" {
		return newRawMaterialBatchOptimizerValidationError("%s 缺少 cutSizeUnitId", label)
	}
	if demandLine.WidthMM <= 0 {
		return newRawMaterialBatchOptimizerValidationError("%s 宽度必须大于 0", label)
	}
	if demandLine.LengthMM <= 0 {
		return newRawMaterialBatchOptimizerValidationError("%s 长度必须大于 0", label)
	}
	if demandLine.PieceCountPerSet <= 0 {
		return newRawMaterialBatchOptimizerValidationError("%s 每套块数必须大于 0", label)
	}
	if demandLine.RequiredSets <= 0 && demandLine.RequiredPieces <= 0 {
		return newRawMaterialBatchOptimizerValidationError("%s 必须至少提供 requiredSets 或 requiredPieces", label)
	}
	if demandLine.LayupCount <= 0 {
		return newRawMaterialBatchOptimizerValidationError("%s 叠层数必须大于 0", label)
	}
	if demandLine.OrderSequence < 0 {
		return newRawMaterialBatchOptimizerValidationError("%s orderSequence 不能为负数", label)
	}
	return nil
}

func isSupportedRawMaterialBatchObjectivePreset(value string) bool {
	switch strings.TrimSpace(value) {
	case "yield-first", "delivery-first", "stability-first":
		return true
	default:
		return false
	}
}

func validateRawMaterialBatchOptimizerScoreWeights(weights models.RawMaterialBatchOptimizerScoreWeights) error {
	if weights == (models.RawMaterialBatchOptimizerScoreWeights{}) {
		return nil
	}
	if weights.FulfilledWeight < 0 || weights.UtilizationWeight < 0 || weights.StabilityWeight < 0 || weights.AssignmentPenaltyWeight < 0 || weights.UnfulfilledPenaltyWeight < 0 || weights.SplitPenaltyWeight < 0 || weights.MustPenaltyWeight < 0 {
		return newRawMaterialBatchOptimizerValidationError("scoreWeights 不能为负数")
	}
	if weights.FulfilledWeight == 0 && weights.UtilizationWeight == 0 && weights.StabilityWeight == 0 {
		return newRawMaterialBatchOptimizerValidationError("scoreWeights 至少需要一个正向评分权重")
	}
	return nil
}
