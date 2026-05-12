package statemachine

import (
	"fmt"
	"strings"
)

type BOMStatus string

const (
	BOMStatusDraft      BOMStatus = "DRAFT"
	BOMStatusReviewing  BOMStatus = "REVIEWING"
	BOMStatusApproved   BOMStatus = "APPROVED"
	BOMStatusValidating BOMStatus = "VALIDATING"
	BOMStatusReleased   BOMStatus = "RELEASED"
	BOMStatusObsolete   BOMStatus = "OBSOLETE"
)

const (
	BOMDenyTransitionNotAllowed = "BOM_TRANSITION_NOT_ALLOWED"
	BOMDenyInvalidStatus        = "BOM_INVALID_STATUS"
)

// BOM状态转换规则
// DRAFT -> REVIEWING, APPROVED (快速通道)
// REVIEWING -> DRAFT (退回修改), APPROVED
// APPROVED -> VALIDATING, RELEASED (EBOM可以直接发布)
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
		BOMStatusValidating,
		BOMStatusReleased, // EBOM可以直接发布
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

func NormalizeBOMStatus(raw string) BOMStatus {
	normalized := BOMStatus(strings.ToUpper(strings.TrimSpace(raw)))
	switch normalized {
	case BOMStatusDraft, BOMStatusReviewing, BOMStatusApproved, BOMStatusValidating, BOMStatusReleased, BOMStatusObsolete:
		return normalized
	default:
		return BOMStatusDraft
	}
}

func CanTransitionBOMStatus(currentRaw string, targetRaw string) GuardResult {
	current := NormalizeBOMStatus(currentRaw)
	target := NormalizeBOMStatus(targetRaw)

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
