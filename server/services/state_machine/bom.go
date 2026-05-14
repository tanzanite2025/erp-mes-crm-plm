package statemachine

import (
	"fmt"
	"strings"
)

type BOMStatus string
type BOMType string

const (
	BOMStatusDraft     BOMStatus = "DRAFT"
	BOMStatusReviewing BOMStatus = "REVIEWING"
	BOMStatusApproved  BOMStatus = "APPROVED"
	BOMStatusReleased  BOMStatus = "RELEASED"
	BOMStatusObsolete  BOMStatus = "OBSOLETE"
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

// BOM 状态转换规则
//
// EBOM (研发 BOM):
// DRAFT -> REVIEWING, APPROVED (快速通道)
// REVIEWING -> DRAFT (退回修改), APPROVED
// APPROVED -> RELEASED (设计审批通过即发布)
// RELEASED -> OBSOLETE
// OBSOLETE -> 终态
//
// MBOM (生产 BOM):
// 数据层只用 RELEASED / OBSOLETE（派生即生效，无草稿/审批中间态）
// RELEASED -> OBSOLETE
// OBSOLETE -> 终态
var bomTransitions = map[BOMStatus][]BOMStatus{
	BOMStatusDraft: {
		BOMStatusReviewing,
		BOMStatusApproved, // 快速通道：跳过评审直接批准
	},
	BOMStatusReviewing: {
		BOMStatusDraft, // 退回修改
		BOMStatusApproved,
	},
	BOMStatusApproved: {
		BOMStatusReleased,
	},
	BOMStatusReleased: {
		BOMStatusObsolete,
	},
	BOMStatusObsolete: {}, // 终态
}

// NormalizeBOMStatus 规范化 BOM 状态字符串
// 如果状态无效，返回空字符串而不是默认值，让调用者决定如何处理
func NormalizeBOMStatus(raw string) BOMStatus {
	normalized := BOMStatus(strings.ToUpper(strings.TrimSpace(raw)))
	switch normalized {
	case BOMStatusDraft, BOMStatusReviewing, BOMStatusApproved, BOMStatusReleased, BOMStatusObsolete:
		return normalized
	default:
		return ""
	}
}

// NormalizeBOMStatusWithFallback 规范化 BOM 状态字符串，无效时使用回退值
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

	if current == "" {
		return Deny(BOMDenyInvalidStatus, fmt.Sprintf("invalid current BOM status: %s", currentRaw))
	}
	if target == "" {
		return Deny(BOMDenyInvalidStatus, fmt.Sprintf("invalid target BOM status: %s", targetRaw))
	}

	if current == target {
		return Allow()
	}

	allowedTargets, exists := bomTransitions[current]
	if !exists {
		return Deny(BOMDenyInvalidStatus, fmt.Sprintf("invalid current BOM status: %s", current))
	}

	for _, allowed := range allowedTargets {
		if allowed == target {
			return Allow()
		}
	}

	return Deny(BOMDenyTransitionNotAllowed, fmt.Sprintf("cannot transition BOM from %s to %s", current, target))
}

// NormalizeBOMType 规范化 BOM 类型字符串
func NormalizeBOMType(raw string) BOMType {
	normalized := BOMType(strings.ToUpper(strings.TrimSpace(raw)))
	switch normalized {
	case BOMTypeEBOM, BOMTypeMBOM:
		return normalized
	default:
		return ""
	}
}

// CanTransitionBOMStatusWithType 检查 BOM 状态转换是否允许（考虑 BOM 类型）
//
// EBOM 与 MBOM 当前共用同一组通用转换规则。
// MBOM 在数据层应只出现 RELEASED / OBSOLETE，但本函数仍接受 EBOM 全部 5 个状态以
// 兼容存量数据。MBOM 不允许进入 DRAFT/REVIEWING/APPROVED 由 service 层（写入入口）保证。
func CanTransitionBOMStatusWithType(currentRaw string, targetRaw string, bomTypeRaw string) GuardResult {
	current := NormalizeBOMStatus(currentRaw)
	target := NormalizeBOMStatus(targetRaw)
	bomType := NormalizeBOMType(bomTypeRaw)

	if current == "" {
		return Deny(BOMDenyInvalidStatus, fmt.Sprintf("invalid current BOM status: %s", currentRaw))
	}
	if target == "" {
		return Deny(BOMDenyInvalidStatus, fmt.Sprintf("invalid target BOM status: %s", targetRaw))
	}
	if bomType == "" {
		return Deny(BOMDenyInvalidBOMType, fmt.Sprintf("invalid BOM type: %s", bomTypeRaw))
	}

	if current == target {
		return Allow()
	}

	allowedTargets, exists := bomTransitions[current]
	if !exists {
		return Deny(BOMDenyInvalidStatus, fmt.Sprintf("invalid current BOM status: %s", current))
	}

	for _, allowed := range allowedTargets {
		if allowed == target {
			return Allow()
		}
	}

	return Deny(BOMDenyTransitionNotAllowed, fmt.Sprintf("cannot transition BOM from %s to %s", current, target))
}

// ShouldLockBOMStatus 判断指定状态的 BOM 是否应该被锁定
// 锁定的状态不允许编辑 BOM 内容，只能进行状态流转
func ShouldLockBOMStatus(status BOMStatus) bool {
	switch status {
	case BOMStatusApproved, BOMStatusReleased, BOMStatusObsolete:
		return true
	case BOMStatusDraft, BOMStatusReviewing:
		return false
	default:
		return false
	}
}

// ShouldLockBOMStatusString 字符串版本的 ShouldLockBOMStatus
func ShouldLockBOMStatusString(status string) bool {
	return ShouldLockBOMStatus(NormalizeBOMStatus(status))
}
