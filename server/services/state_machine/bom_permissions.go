package statemachine

import (
	"context"
	"fmt"
	"xdfc-server/audit"
)

// BOM状态流转权限定义
// 基于最小权限原则，不同状态转换需要不同的权限

const (
	// BOM权限常量
	PermissionBOMEdit     = "bom:edit"      // 编辑BOM（DRAFT状态）
	PermissionBOMReview   = "bom:review"    // 评审BOM（REVIEWING状态）
	PermissionBOMApprove  = "bom:approve"   // 批准BOM（APPROVED状态）
	PermissionBOMValidate = "bom:validate"  // 验证BOM（VALIDATING状态）
	PermissionBOMRelease  = "bom:release"   // 发布BOM（RELEASED状态）
	PermissionBOMObsolete = "bom:obsolete"  // 废弃BOM（OBSOLETE状态）
	PermissionBOMManage   = "bom:manage"    // 管理BOM（所有操作）
	PermissionManage      = "manage"        // 系统管理员权限
)

// BOM状态转换权限矩阵
// 定义从当前状态到目标状态需要的权限
var bomTransitionPermissions = map[BOMStatus]map[BOMStatus][]string{
	BOMStatusDraft: {
		BOMStatusReviewing: {PermissionBOMEdit, PermissionBOMManage, PermissionManage},
		BOMStatusApproved:  {PermissionBOMApprove, PermissionBOMManage, PermissionManage}, // 快速通道需要批准权限
	},
	BOMStatusReviewing: {
		BOMStatusDraft:    {PermissionBOMReview, PermissionBOMManage, PermissionManage}, // 退回修改
		BOMStatusApproved: {PermissionBOMReview, PermissionBOMApprove, PermissionBOMManage, PermissionManage},
	},
	BOMStatusApproved: {
		BOMStatusValidating: {PermissionBOMValidate, PermissionBOMManage, PermissionManage},
		BOMStatusReleased:   {PermissionBOMRelease, PermissionBOMManage, PermissionManage},
	},
	BOMStatusValidating: {
		BOMStatusApproved: {PermissionBOMValidate, PermissionBOMManage, PermissionManage}, // 验证失败退回
		BOMStatusReleased: {PermissionBOMValidate, PermissionBOMRelease, PermissionBOMManage, PermissionManage},
	},
	BOMStatusReleased: {
		BOMStatusObsolete: {PermissionBOMObsolete, PermissionBOMManage, PermissionManage},
	},
	BOMStatusObsolete: {}, // 终态，不可转换
}

// PermissionCheckResult 权限检查结果
type PermissionCheckResult struct {
	Allowed      bool
	ReasonCode   string
	ErrorMessage string
}

// Allow 创建允许的权限检查结果
func AllowPermission() PermissionCheckResult {
	return PermissionCheckResult{Allowed: true}
}

// DenyPermission 创建拒绝的权限检查结果
func DenyPermission(reasonCode string, message string) PermissionCheckResult {
	return PermissionCheckResult{
		Allowed:      false,
		ReasonCode:   reasonCode,
		ErrorMessage: message,
	}
}

// Err 将权限检查结果转换为error
func (r PermissionCheckResult) Err() error {
	if r.Allowed {
		return nil
	}
	return fmt.Errorf("[FORBIDDEN] %s", r.ErrorMessage)
}

// HasAnyPermission 检查用户是否拥有任一权限
func HasAnyPermission(userPermissions []string, requiredPermissions []string) bool {
	if len(requiredPermissions) == 0 {
		return true
	}

	permissionSet := make(map[string]struct{}, len(userPermissions))
	for _, perm := range userPermissions {
		permissionSet[perm] = struct{}{}
	}

	for _, required := range requiredPermissions {
		if _, exists := permissionSet[required]; exists {
			return true
		}
	}

	return false
}

// CanUserPromoteBOMStatus 检查用户是否有权限执行BOM状态转换
func CanUserPromoteBOMStatus(ctx context.Context, currentStatus string, targetStatus string) PermissionCheckResult {
	// 从context中获取用户权限
	actor := audit.GetActorFromContext(ctx)
	if actor == nil {
		return DenyPermission("BOM_NO_ACTOR", "No user context found")
	}

	// 规范化状态
	current := NormalizeBOMStatus(currentStatus)
	target := NormalizeBOMStatus(targetStatus)

	// 相同状态，允许（幂等操作）
	if current == target {
		return AllowPermission()
	}

	// 获取该状态转换所需的权限
	transitionsFromCurrent, exists := bomTransitionPermissions[current]
	if !exists {
		return DenyPermission("BOM_INVALID_STATUS", fmt.Sprintf("Invalid current BOM status: %s", current))
	}

	requiredPermissions, exists := transitionsFromCurrent[target]
	if !exists {
		return DenyPermission("BOM_TRANSITION_NOT_ALLOWED", fmt.Sprintf("Cannot transition BOM from %s to %s", current, target))
	}

	// 检查用户是否拥有所需权限
	// 注意：actor.Permissions 需要在 audit 包中添加
	// 这里我们需要从context中获取权限信息
	userPermissions := GetUserPermissionsFromContext(ctx)
	if !HasAnyPermission(userPermissions, requiredPermissions) {
		return DenyPermission(
			"BOM_INSUFFICIENT_PERMISSIONS",
			fmt.Sprintf("User does not have permission to transition BOM from %s to %s. Required permissions: %v", current, target, requiredPermissions),
		)
	}

	return AllowPermission()
}

// GetUserPermissionsFromContext 从context中获取用户权限列表
func GetUserPermissionsFromContext(ctx context.Context) []string {
	// 从audit context中获取权限信息
	if permissions, ok := audit.PermissionsFromContext(ctx); ok {
		return permissions
	}
	
	// 如果audit context中没有，尝试直接从context获取
	if permissions, ok := ctx.Value("permissions").([]string); ok {
		return permissions
	}
	
	// 如果都没有，返回空列表
	return []string{}
}

// GetRequiredPermissionsForTransition 获取状态转换所需的权限列表（用于UI显示）
func GetRequiredPermissionsForTransition(currentStatus string, targetStatus string) []string {
	current := NormalizeBOMStatus(currentStatus)
	target := NormalizeBOMStatus(targetStatus)

	transitionsFromCurrent, exists := bomTransitionPermissions[current]
	if !exists {
		return []string{}
	}

	requiredPermissions, exists := transitionsFromCurrent[target]
	if !exists {
		return []string{}
	}

	return requiredPermissions
}
