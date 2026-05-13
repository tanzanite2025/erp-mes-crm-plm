package statemachine

import (
	"context"
	"testing"
	"xdfc-server/audit"

	"github.com/stretchr/testify/require"
)

func TestHasAnyPermission(t *testing.T) {
	// 用户拥有权限
	userPermissions := []string{PermissionBOMEdit, PermissionBOMReview}
	
	// 测试：用户拥有所需权限
	require.True(t, HasAnyPermission(userPermissions, []string{PermissionBOMEdit}))
	require.True(t, HasAnyPermission(userPermissions, []string{PermissionBOMReview}))
	require.True(t, HasAnyPermission(userPermissions, []string{PermissionBOMEdit, PermissionBOMApprove}))
	
	// 测试：用户没有所需权限
	require.False(t, HasAnyPermission(userPermissions, []string{PermissionBOMApprove}))
	require.False(t, HasAnyPermission(userPermissions, []string{PermissionBOMRelease}))
	
	// 测试：空权限列表
	require.True(t, HasAnyPermission(userPermissions, []string{}))
	require.False(t, HasAnyPermission([]string{}, []string{PermissionBOMEdit}))
}

func TestCanUserPromoteBOMStatus_WithPermissions(t *testing.T) {
	// 创建带权限的context
	actor := audit.AuditActor{
		UserID:   "user-123",
		Username: "engineer",
		IP:       "127.0.0.1",
		Source:   "test",
	}
	
	// 测试场景1: 工程师有编辑权限，可以从DRAFT到REVIEWING
	ctx := audit.NewContextWithActorAndPermissions(context.Background(), actor, []string{PermissionBOMEdit})
	result := CanUserPromoteBOMStatus(ctx, "DRAFT", "REVIEWING")
	require.True(t, result.Allowed, "Engineer with bom:edit should be able to promote DRAFT to REVIEWING")
	
	// 测试场景2: 工程师没有批准权限，不能从DRAFT到APPROVED
	result = CanUserPromoteBOMStatus(ctx, "DRAFT", "APPROVED")
	require.False(t, result.Allowed, "Engineer without bom:approve should not be able to promote DRAFT to APPROVED")
	require.Equal(t, "BOM_INSUFFICIENT_PERMISSIONS", result.ReasonCode)
	
	// 测试场景3: 评审员有评审权限，可以从REVIEWING到APPROVED
	ctx = audit.NewContextWithActorAndPermissions(context.Background(), actor, []string{PermissionBOMReview, PermissionBOMApprove})
	result = CanUserPromoteBOMStatus(ctx, "REVIEWING", "APPROVED")
	require.True(t, result.Allowed, "Reviewer with bom:review and bom:approve should be able to promote REVIEWING to APPROVED")
	
	// 测试场景4: 评审员可以退回到DRAFT
	result = CanUserPromoteBOMStatus(ctx, "REVIEWING", "DRAFT")
	require.True(t, result.Allowed, "Reviewer should be able to return REVIEWING to DRAFT")
	
	// 测试场景5: 质量经理有验证权限，可以从APPROVED到VALIDATING
	ctx = audit.NewContextWithActorAndPermissions(context.Background(), actor, []string{PermissionBOMValidate})
	result = CanUserPromoteBOMStatus(ctx, "APPROVED", "VALIDATING")
	require.True(t, result.Allowed, "Quality manager with bom:validate should be able to promote APPROVED to VALIDATING")
	
	// 测试场景6: 发布经理有发布权限，可以从APPROVED到RELEASED
	ctx = audit.NewContextWithActorAndPermissions(context.Background(), actor, []string{PermissionBOMRelease})
	result = CanUserPromoteBOMStatus(ctx, "APPROVED", "RELEASED")
	require.True(t, result.Allowed, "Release manager with bom:release should be able to promote APPROVED to RELEASED")
	
	// 测试场景7: 管理员有废弃权限，可以从RELEASED到OBSOLETE
	ctx = audit.NewContextWithActorAndPermissions(context.Background(), actor, []string{PermissionBOMObsolete})
	result = CanUserPromoteBOMStatus(ctx, "RELEASED", "OBSOLETE")
	require.True(t, result.Allowed, "Admin with bom:obsolete should be able to promote RELEASED to OBSOLETE")
	
	// 测试场景8: 系统管理员有manage权限，可以执行所有操作
	ctx = audit.NewContextWithActorAndPermissions(context.Background(), actor, []string{PermissionManage})
	result = CanUserPromoteBOMStatus(ctx, "DRAFT", "REVIEWING")
	require.True(t, result.Allowed, "System admin with manage permission should be able to perform any transition")
	
	result = CanUserPromoteBOMStatus(ctx, "APPROVED", "RELEASED")
	require.True(t, result.Allowed, "System admin with manage permission should be able to perform any transition")
	
	// 测试场景9: BOM管理员有bom:manage权限，可以执行所有BOM操作
	ctx = audit.NewContextWithActorAndPermissions(context.Background(), actor, []string{PermissionBOMManage})
	result = CanUserPromoteBOMStatus(ctx, "DRAFT", "APPROVED")
	require.True(t, result.Allowed, "BOM manager with bom:manage permission should be able to perform any BOM transition")
}

func TestCanUserPromoteBOMStatus_WithoutPermissions(t *testing.T) {
	actor := audit.AuditActor{
		UserID:   "user-456",
		Username: "viewer",
		IP:       "127.0.0.1",
		Source:   "test",
	}
	
	// 测试场景1: 没有任何权限的用户不能执行任何状态转换
	ctx := audit.NewContextWithActorAndPermissions(context.Background(), actor, []string{})
	result := CanUserPromoteBOMStatus(ctx, "DRAFT", "REVIEWING")
	require.False(t, result.Allowed, "User without permissions should not be able to promote BOM status")
	require.Equal(t, "BOM_INSUFFICIENT_PERMISSIONS", result.ReasonCode)
	
	// 测试场景2: 只有查看权限的用户不能执行状态转换
	ctx = audit.NewContextWithActorAndPermissions(context.Background(), actor, []string{"bom:view"})
	result = CanUserPromoteBOMStatus(ctx, "DRAFT", "REVIEWING")
	require.False(t, result.Allowed, "User with only view permission should not be able to promote BOM status")
}

func TestCanUserPromoteBOMStatus_IdempotentOperation(t *testing.T) {
	actor := audit.AuditActor{
		UserID:   "user-789",
		Username: "user",
		IP:       "127.0.0.1",
		Source:   "test",
	}
	
	// 测试场景: 相同状态的转换（幂等操作）应该总是允许，不需要权限
	ctx := audit.NewContextWithActorAndPermissions(context.Background(), actor, []string{})
	result := CanUserPromoteBOMStatus(ctx, "DRAFT", "DRAFT")
	require.True(t, result.Allowed, "Idempotent operation (same status) should always be allowed")
	
	result = CanUserPromoteBOMStatus(ctx, "RELEASED", "RELEASED")
	require.True(t, result.Allowed, "Idempotent operation (same status) should always be allowed")
}

func TestCanUserPromoteBOMStatus_NoContext(t *testing.T) {
	// 测试场景: 没有actor的context应该被拒绝
	ctx := context.Background()
	result := CanUserPromoteBOMStatus(ctx, "DRAFT", "REVIEWING")
	require.False(t, result.Allowed, "Operation without actor context should be denied")
	require.Equal(t, "BOM_NO_ACTOR", result.ReasonCode)
}

func TestCanUserPromoteBOMStatus_InvalidTransition(t *testing.T) {
	actor := audit.AuditActor{
		UserID:   "user-999",
		Username: "admin",
		IP:       "127.0.0.1",
		Source:   "test",
	}
	
	// 即使有所有权限，非法的状态转换也应该被拒绝
	ctx := audit.NewContextWithActorAndPermissions(context.Background(), actor, []string{PermissionManage})
	
	// 测试场景1: 从RELEASED回退到DRAFT（不允许）
	result := CanUserPromoteBOMStatus(ctx, "RELEASED", "DRAFT")
	require.False(t, result.Allowed, "Invalid transition should be denied even with full permissions")
	require.Equal(t, "BOM_TRANSITION_NOT_ALLOWED", result.ReasonCode)
	
	// 测试场景2: 从OBSOLETE恢复到RELEASED（不允许）
	result = CanUserPromoteBOMStatus(ctx, "OBSOLETE", "RELEASED")
	require.False(t, result.Allowed, "Invalid transition from terminal state should be denied")
	require.Equal(t, "BOM_TRANSITION_NOT_ALLOWED", result.ReasonCode)
	
	// 测试场景3: 从DRAFT直接到RELEASED（跳过审批，不允许）
	result = CanUserPromoteBOMStatus(ctx, "DRAFT", "RELEASED")
	require.False(t, result.Allowed, "Skipping approval process should be denied")
	require.Equal(t, "BOM_TRANSITION_NOT_ALLOWED", result.ReasonCode)
}

func TestGetRequiredPermissionsForTransition(t *testing.T) {
	// 测试获取状态转换所需的权限列表
	
	// DRAFT -> REVIEWING
	perms := GetRequiredPermissionsForTransition("DRAFT", "REVIEWING")
	require.Contains(t, perms, PermissionBOMEdit)
	require.Contains(t, perms, PermissionBOMManage)
	require.Contains(t, perms, PermissionManage)
	
	// REVIEWING -> APPROVED
	perms = GetRequiredPermissionsForTransition("REVIEWING", "APPROVED")
	require.Contains(t, perms, PermissionBOMReview)
	require.Contains(t, perms, PermissionBOMApprove)
	
	// APPROVED -> RELEASED
	perms = GetRequiredPermissionsForTransition("APPROVED", "RELEASED")
	require.Contains(t, perms, PermissionBOMRelease)
	
	// RELEASED -> OBSOLETE
	perms = GetRequiredPermissionsForTransition("RELEASED", "OBSOLETE")
	require.Contains(t, perms, PermissionBOMObsolete)
	
	// 非法转换应该返回空列表
	perms = GetRequiredPermissionsForTransition("RELEASED", "DRAFT")
	require.Empty(t, perms)
}

func TestPermissionCheckResult_Err(t *testing.T) {
	// 测试允许的结果不返回错误
	result := AllowPermission()
	require.Nil(t, result.Err())
	
	// 测试拒绝的结果返回错误
	result = DenyPermission("TEST_CODE", "Test error message")
	err := result.Err()
	require.NotNil(t, err)
	require.Contains(t, err.Error(), "[FORBIDDEN]")
	require.Contains(t, err.Error(), "Test error message")
}
