package statemachine

import (
	"testing"

	"github.com/stretchr/testify/require"
)

func TestCanTransitionBOMStatus(t *testing.T) {
	// 正常流转路径
	require.True(t, CanTransitionBOMStatus("DRAFT", "REVIEWING").Allowed)
	require.True(t, CanTransitionBOMStatus("DRAFT", "APPROVED").Allowed) // 快速通道
	require.True(t, CanTransitionBOMStatus("REVIEWING", "APPROVED").Allowed)
	require.True(t, CanTransitionBOMStatus("REVIEWING", "DRAFT").Allowed) // 退回修改
	require.True(t, CanTransitionBOMStatus("APPROVED", "VALIDATING").Allowed)
	require.True(t, CanTransitionBOMStatus("APPROVED", "RELEASED").Allowed)
	require.True(t, CanTransitionBOMStatus("VALIDATING", "RELEASED").Allowed)
	require.True(t, CanTransitionBOMStatus("VALIDATING", "APPROVED").Allowed) // 验证失败
	require.True(t, CanTransitionBOMStatus("RELEASED", "OBSOLETE").Allowed)

	// 幂等操作（相同状态）
	require.True(t, CanTransitionBOMStatus("DRAFT", "DRAFT").Allowed)
	require.True(t, CanTransitionBOMStatus("RELEASED", "RELEASED").Allowed)

	// 非法转换
	result := CanTransitionBOMStatus("RELEASED", "DRAFT")
	require.False(t, result.Allowed)
	require.Equal(t, BOMDenyTransitionNotAllowed, result.ReasonCode)

	result = CanTransitionBOMStatus("RELEASED", "APPROVED")
	require.False(t, result.Allowed)
	require.Equal(t, BOMDenyTransitionNotAllowed, result.ReasonCode)

	result = CanTransitionBOMStatus("OBSOLETE", "RELEASED")
	require.False(t, result.Allowed)
	require.Equal(t, BOMDenyTransitionNotAllowed, result.ReasonCode)

	result = CanTransitionBOMStatus("DRAFT", "RELEASED")
	require.False(t, result.Allowed)
	require.Equal(t, BOMDenyTransitionNotAllowed, result.ReasonCode)

	// 大小写不敏感
	require.True(t, CanTransitionBOMStatus("draft", "reviewing").Allowed)
	require.True(t, CanTransitionBOMStatus("Draft", "Approved").Allowed)
}

func TestNormalizeBOMStatus(t *testing.T) {
	require.Equal(t, BOMStatusDraft, NormalizeBOMStatus("DRAFT"))
	require.Equal(t, BOMStatusDraft, NormalizeBOMStatus("draft"))
	require.Equal(t, BOMStatusDraft, NormalizeBOMStatus("  Draft  "))
	require.Equal(t, BOMStatusReleased, NormalizeBOMStatus("RELEASED"))
	require.Equal(t, BOMStatusObsolete, NormalizeBOMStatus("obsolete"))

	// ✅ 无效状态返回空字符串，不再默认为DRAFT
	require.Equal(t, BOMStatus(""), NormalizeBOMStatus("INVALID"))
	require.Equal(t, BOMStatus(""), NormalizeBOMStatus(""))
	require.Equal(t, BOMStatus(""), NormalizeBOMStatus("UNKNOWN_STATUS"))
}

func TestNormalizeBOMStatusWithFallback(t *testing.T) {
	// 有效状态返回规范化后的值
	require.Equal(t, BOMStatusDraft, NormalizeBOMStatusWithFallback("draft", BOMStatusDraft))
	require.Equal(t, BOMStatusReleased, NormalizeBOMStatusWithFallback("RELEASED", BOMStatusDraft))

	// 无效状态使用回退值
	require.Equal(t, BOMStatusDraft, NormalizeBOMStatusWithFallback("INVALID", BOMStatusDraft))
	require.Equal(t, BOMStatusReleased, NormalizeBOMStatusWithFallback("", BOMStatusReleased))
}

func TestNormalizeBOMType(t *testing.T) {
	require.Equal(t, BOMTypeEBOM, NormalizeBOMType("EBOM"))
	require.Equal(t, BOMTypeEBOM, NormalizeBOMType("ebom"))
	require.Equal(t, BOMTypeEBOM, NormalizeBOMType("  EBOM  "))
	require.Equal(t, BOMTypeMBOM, NormalizeBOMType("MBOM"))
	require.Equal(t, BOMTypeMBOM, NormalizeBOMType("mbom"))

	// 无效类型返回空字符串
	require.Equal(t, BOMType(""), NormalizeBOMType("INVALID"))
	require.Equal(t, BOMType(""), NormalizeBOMType(""))
	require.Equal(t, BOMType(""), NormalizeBOMType("PBOM"))
}

func TestCanTransitionBOMStatus_InvalidStatus(t *testing.T) {
	// ✅ 测试无效状态会被检测到
	result := CanTransitionBOMStatus("INVALID_STATUS", "REVIEWING")
	require.False(t, result.Allowed)
	require.Equal(t, BOMDenyInvalidStatus, result.ReasonCode)
	require.Contains(t, result.Reason, "invalid current BOM status")

	result = CanTransitionBOMStatus("DRAFT", "INVALID_TARGET")
	require.False(t, result.Allowed)
	require.Equal(t, BOMDenyInvalidStatus, result.ReasonCode)
	require.Contains(t, result.Reason, "invalid target BOM status")
}

func TestCanTransitionBOMStatusWithType_EBOM(t *testing.T) {
	// EBOM: APPROVED可以直接到RELEASED（跳过VALIDATING）
	result := CanTransitionBOMStatusWithType("APPROVED", "RELEASED", "EBOM")
	require.True(t, result.Allowed, "EBOM should be able to go from APPROVED to RELEASED directly")

	// EBOM: 不应该从APPROVED到VALIDATING
	result = CanTransitionBOMStatusWithType("APPROVED", "VALIDATING", "EBOM")
	require.False(t, result.Allowed, "EBOM should not go through VALIDATING state")
	require.Equal(t, BOMDenyTransitionNotAllowed, result.ReasonCode)
	require.Contains(t, result.Reason, "should not go through VALIDATING")

	// EBOM: 其他正常转换
	result = CanTransitionBOMStatusWithType("DRAFT", "REVIEWING", "EBOM")
	require.True(t, result.Allowed)

	result = CanTransitionBOMStatusWithType("REVIEWING", "APPROVED", "EBOM")
	require.True(t, result.Allowed)
}

func TestCanTransitionBOMStatusWithType_MBOM(t *testing.T) {
	// MBOM: 不允许APPROVED直接到RELEASED（必须经过VALIDATING）
	result := CanTransitionBOMStatusWithType("APPROVED", "RELEASED", "MBOM")
	require.False(t, result.Allowed, "MBOM must go through VALIDATING before RELEASED")
	require.Equal(t, BOMDenyTransitionNotAllowed, result.ReasonCode)
	require.Contains(t, result.Reason, "must go through VALIDATING")

	// MBOM: 允许APPROVED到VALIDATING
	result = CanTransitionBOMStatusWithType("APPROVED", "VALIDATING", "MBOM")
	require.True(t, result.Allowed, "MBOM should be able to go from APPROVED to VALIDATING")

	// MBOM: 允许VALIDATING到RELEASED
	result = CanTransitionBOMStatusWithType("VALIDATING", "RELEASED", "MBOM")
	require.True(t, result.Allowed, "MBOM should be able to go from VALIDATING to RELEASED")

	// MBOM: 其他正常转换
	result = CanTransitionBOMStatusWithType("DRAFT", "REVIEWING", "MBOM")
	require.True(t, result.Allowed)

	result = CanTransitionBOMStatusWithType("REVIEWING", "APPROVED", "MBOM")
	require.True(t, result.Allowed)
}

func TestCanTransitionBOMStatusWithType_InvalidType(t *testing.T) {
	// 无效的BOM类型应该被拒绝
	result := CanTransitionBOMStatusWithType("DRAFT", "REVIEWING", "INVALID_TYPE")
	require.False(t, result.Allowed)
	require.Equal(t, BOMDenyInvalidBOMType, result.ReasonCode)
	require.Contains(t, result.Reason, "invalid BOM type")
}

func TestCanTransitionBOMStatusWithType_IdempotentOperation(t *testing.T) {
	// 幂等操作应该总是允许
	result := CanTransitionBOMStatusWithType("DRAFT", "DRAFT", "EBOM")
	require.True(t, result.Allowed)

	result = CanTransitionBOMStatusWithType("RELEASED", "RELEASED", "MBOM")
	require.True(t, result.Allowed)
}

func TestShouldLockBOMStatus(t *testing.T) {
	// 应该被锁定的状态
	require.True(t, ShouldLockBOMStatus(BOMStatusApproved), "APPROVED status should be locked")
	require.True(t, ShouldLockBOMStatus(BOMStatusValidating), "VALIDATING status should be locked")
	require.True(t, ShouldLockBOMStatus(BOMStatusReleased), "RELEASED status should be locked")
	require.True(t, ShouldLockBOMStatus(BOMStatusObsolete), "OBSOLETE status should be locked")

	// 不应该被锁定的状态
	require.False(t, ShouldLockBOMStatus(BOMStatusDraft), "DRAFT status should not be locked")
	require.False(t, ShouldLockBOMStatus(BOMStatusReviewing), "REVIEWING status should not be locked")
}

func TestShouldLockBOMStatusString(t *testing.T) {
	// 测试字符串版本
	require.True(t, ShouldLockBOMStatusString("APPROVED"))
	require.True(t, ShouldLockBOMStatusString("approved"))
	require.True(t, ShouldLockBOMStatusString("  VALIDATING  "))
	require.True(t, ShouldLockBOMStatusString("RELEASED"))
	require.True(t, ShouldLockBOMStatusString("OBSOLETE"))

	require.False(t, ShouldLockBOMStatusString("DRAFT"))
	require.False(t, ShouldLockBOMStatusString("draft"))
	require.False(t, ShouldLockBOMStatusString("REVIEWING"))

	// 未知状态默认不锁定
	require.False(t, ShouldLockBOMStatusString("UNKNOWN"))
	require.False(t, ShouldLockBOMStatusString(""))
}
