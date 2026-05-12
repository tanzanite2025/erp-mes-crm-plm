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

	// 无效状态返回默认值
	require.Equal(t, BOMStatusDraft, NormalizeBOMStatus("INVALID"))
	require.Equal(t, BOMStatusDraft, NormalizeBOMStatus(""))
}
