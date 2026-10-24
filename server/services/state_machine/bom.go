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
// EBOM (研发 BOM) 与 MBOM (生产 BOM) 共用以下转换表：
// DRAFT -> RELEASED
// REVIEWING -> DRAFT, RELEASED（兼容历史记录，不再进入评审或批准）
// APPROVED -> RELEASED（兼容历史记录）
// RELEASED -> OBSOLETE
// OBSOLETE -> 终态
//
// 派生 MBOM 在 service 层创建为 DRAFT、未锁定；修订已发布 MBOM 时，
// 新版本直接为 RELEASED，旧版作废。初始状态由各写入入口决定。
var bomTransitions = map[BOMStatus][]BOMStatus{
	BOMStatusDraft: {
		BOMStatusReleased,
	},
	BOMStatusReviewing: {
		BOMStatusDraft, // 退回修改
		BOMStatusReleased,
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
// 验证 BOM 类型后，EBOM 与 MBOM 共用同一组通用转换规则。
// 本函数不限制 MBOM 的状态子集；派生和修订的初始状态、来源及发布校验
// 分别由 service 层的对应写入入口处理。
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
