package statemachine

import (
	"fmt"
	"strings"
)

type BOMStatus string
type BOMType string

const (
	BOMStatusDraft      BOMStatus = "DRAFT"
	BOMStatusReviewing  BOMStatus = "REVIEWING"
	BOMStatusApproved   BOMStatus = "APPROVED"
	BOMStatusValidating BOMStatus = "VALIDATING"
	BOMStatusReleased   BOMStatus = "RELEASED"
	BOMStatusObsolete   BOMStatus = "OBSOLETE"
)

const (
	BOMTypeEBOM BOMType = "EBOM"
	BOMTypeMBOM BOMType = "MBOM"
)

const (
	BOMDenyTransitionNotAllowed = "BOM_TRANSITION_NOT_ALLOWED"
	BOMDenyInvalidStatus        = "BOM_INVALID_STATUS"
	BOMDenyInvalidBOMType       = "BOM_INVALID_TYPE"
)

// BOM状态转换规则
// EBOM和MBOM有不同的转换规则
// 
// EBOM (工程BOM):
// DRAFT -> REVIEWING, APPROVED (快速通道)
// REVIEWING -> DRAFT (退回修改), APPROVED
// APPROVED -> RELEASED (EBOM可以直接发布，跳过VALIDATING)
// RELEASED -> OBSOLETE (只能废弃，不能回退)
// OBSOLETE -> 终态，不可转换
//
// MBOM (制造BOM):
// DRAFT -> REVIEWING, APPROVED (快速通道)
// REVIEWING -> DRAFT (退回修改), APPROVED
// APPROVED -> VALIDATING (MBOM必须经过验证)
// VALIDATING -> APPROVED (验证失败), RELEASED
// RELEASED -> OBSOLETE (只能废弃，不能回退)
// OBSOLETE -> 终态，不可转换
var bomTransitions = map[BOMStatus][]BOMStatus{
	BOMStatusDraft: {
		BOMStatusReviewing,
		BOMStatusApproved, // 快速通道：跳过评审直接批准
	},
	BOMStatusReviewing: {
		BOMStatusDraft,    // 退回修改
		BOMStatusApproved,
	},
	BOMStatusApproved: {
		BOMStatusValidating, // MBOM必须验证
		BOMStatusReleased,   // EBOM可以直接发布
	},
	BOMStatusValidating: {
		BOMStatusApproved, // 验证失败，退回批准状态
		BOMStatusReleased,
	},
	BOMStatusReleased: {
		BOMStatusObsolete, // 只能废弃，不能回退
	},
	BOMStatusObsolete: {}, // 终态，不可转换
}

// EBOM特定的转换规则（可以跳过VALIDATING直接发布）
var ebomOnlyTransitions = map[BOMStatus][]BOMStatus{
	BOMStatusApproved: {
		BOMStatusReleased, // EBOM可以从APPROVED直接到RELEASED
	},
}

// MBOM特定的转换规则（必须经过VALIDATING）
var mbomOnlyTransitions = map[BOMStatus][]BOMStatus{
	BOMStatusApproved: {
		BOMStatusValidating, // MBOM必须先验证
	},
}

// NormalizeBOMStatus 规范化BOM状态字符串
// 如果状态无效，返回空字符串而不是默认值，让调用者决定如何处理
func NormalizeBOMStatus(raw string) BOMStatus {
	normalized := BOMStatus(strings.ToUpper(strings.TrimSpace(raw)))
	switch normalized {
	case BOMStatusDraft, BOMStatusReviewing, BOMStatusApproved, BOMStatusValidating, BOMStatusReleased, BOMStatusObsolete:
		return normalized
	default:
		// ✅ 返回空字符串，让调用者检测到无效状态
		return ""
	}
}

// NormalizeBOMStatusWithFallback 规范化BOM状态字符串，无效时使用回退值
// 仅在明确需要回退逻辑的场景使用（如前端显示）
func NormalizeBOMStatusWithFallback(raw string, fallback BOMStatus) BOMStatus {
	normalized := NormalizeBOMStatus(raw)
	if normalized == "" {
		return fallback
	}
	return normalized
}

func CanTransitionBOMStatus(currentRaw string, targetRaw string) GuardResult {
	current := NormalizeBOMStatus(currentRaw)
	target := NormalizeBOMStatus(targetRaw)

	// ✅ 检测无效的当前状态
	if current == "" {
		return Deny(BOMDenyInvalidStatus, fmt.Sprintf("invalid current BOM status: %s", currentRaw))
	}

	// ✅ 检测无效的目标状态
	if target == "" {
		return Deny(BOMDenyInvalidStatus, fmt.Sprintf("invalid target BOM status: %s", targetRaw))
	}

	// 相同状态，允许（幂等操作）
	if current == target {
		return Allow()
	}

	// 检查当前状态是否有效
	allowedTargets, exists := bomTransitions[current]
	if !exists {
		return Deny(BOMDenyInvalidStatus, fmt.Sprintf("invalid current BOM status: %s", current))
	}

	// 检查目标状态是否在允许的转换列表中
	for _, allowed := range allowedTargets {
		if allowed == target {
			return Allow()
		}
	}

	return Deny(BOMDenyTransitionNotAllowed, fmt.Sprintf("cannot transition BOM from %s to %s", current, target))
}

// NormalizeBOMType 规范化BOM类型字符串
func NormalizeBOMType(raw string) BOMType {
	normalized := BOMType(strings.ToUpper(strings.TrimSpace(raw)))
	switch normalized {
	case BOMTypeEBOM, BOMTypeMBOM:
		return normalized
	default:
		return ""
	}
}

// CanTransitionBOMStatusWithType 检查BOM状态转换是否允许（考虑BOM类型）
// 这是更严格的版本，区分EBOM和MBOM的转换规则
func CanTransitionBOMStatusWithType(currentRaw string, targetRaw string, bomTypeRaw string) GuardResult {
	current := NormalizeBOMStatus(currentRaw)
	target := NormalizeBOMStatus(targetRaw)
	bomType := NormalizeBOMType(bomTypeRaw)

	// ✅ 检测无效的当前状态
	if current == "" {
		return Deny(BOMDenyInvalidStatus, fmt.Sprintf("invalid current BOM status: %s", currentRaw))
	}

	// ✅ 检测无效的目标状态
	if target == "" {
		return Deny(BOMDenyInvalidStatus, fmt.Sprintf("invalid target BOM status: %s", targetRaw))
	}

	// ✅ 检测无效的BOM类型
	if bomType == "" {
		return Deny(BOMDenyInvalidBOMType, fmt.Sprintf("invalid BOM type: %s", bomTypeRaw))
	}

	// 相同状态，允许（幂等操作）
	if current == target {
		return Allow()
	}

	// 检查通用转换规则
	allowedTargets, exists := bomTransitions[current]
	if !exists {
		return Deny(BOMDenyInvalidStatus, fmt.Sprintf("invalid current BOM status: %s", current))
	}

	// 检查目标状态是否在通用规则中
	isGenerallyAllowed := false
	for _, allowed := range allowedTargets {
		if allowed == target {
			isGenerallyAllowed = true
			break
		}
	}

	if !isGenerallyAllowed {
		return Deny(BOMDenyTransitionNotAllowed, fmt.Sprintf("cannot transition BOM from %s to %s", current, target))
	}

	// ✅ 应用BOM类型特定的规则
	if bomType == BOMTypeEBOM {
		// EBOM: APPROVED可以直接到RELEASED（跳过VALIDATING）
		if current == BOMStatusApproved && target == BOMStatusReleased {
			return Allow()
		}
		// EBOM: 不允许APPROVED到VALIDATING（EBOM不需要验证）
		if current == BOMStatusApproved && target == BOMStatusValidating {
			return Deny(BOMDenyTransitionNotAllowed, "EBOM should not go through VALIDATING state, use APPROVED -> RELEASED instead")
		}
	} else if bomType == BOMTypeMBOM {
		// MBOM: 不允许APPROVED直接到RELEASED（必须经过VALIDATING）
		if current == BOMStatusApproved && target == BOMStatusReleased {
			return Deny(BOMDenyTransitionNotAllowed, "MBOM must go through VALIDATING state before RELEASED, use APPROVED -> VALIDATING -> RELEASED")
		}
		// MBOM: 允许APPROVED到VALIDATING
		if current == BOMStatusApproved && target == BOMStatusValidating {
			return Allow()
		}
	}

	// 其他转换按通用规则
	return Allow()
}

// ShouldLockBOMStatus 判断指定状态的BOM是否应该被锁定
// 锁定的状态不允许编辑BOM内容，只能进行状态流转
func ShouldLockBOMStatus(status BOMStatus) bool {
	switch status {
	case BOMStatusApproved, BOMStatusValidating, BOMStatusReleased, BOMStatusObsolete:
		return true
	case BOMStatusDraft, BOMStatusReviewing:
		return false
	default:
		// 未知状态默认不锁定
		return false
	}
}

// ShouldLockBOMStatusString 字符串版本的ShouldLockBOMStatus
func ShouldLockBOMStatusString(status string) bool {
	return ShouldLockBOMStatus(NormalizeBOMStatus(status))
}
