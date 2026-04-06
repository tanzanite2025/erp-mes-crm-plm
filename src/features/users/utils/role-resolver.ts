import { type User } from '../data/schema'
import { type Role } from '@/features/system-mgmt/data/role-schema'
import { type OrgNode } from '@/features/org-personnel/data/org-schema'
import { findDepartmentRole } from './department-role'

interface Employee {
  id: string
  name: string
  deptId?: string
  deptName?: string
}

export interface ResolvedRoleInfo {
  roleId: string
  isStale: boolean
  isInvalid: boolean
  sourceType: 'manual' | 'department_role' | 'invalid'
}

function normalizeRoleId(value: string | undefined) {
  return (value || '').toString().trim().toLowerCase()
}

export function resolveUserRole(
  user: User,
  employees: Employee[],
  roles: Role[],
  _orgNodes: OrgNode[] = [],
): ResolvedRoleInfo {
  const rawRoleId = normalizeRoleId(user.role)

  if (rawRoleId === 'superadmin') {
    return {
      roleId: 'superadmin',
      isStale: false,
      isInvalid: false,
      sourceType: 'manual',
    }
  }

  if (!user.employeeId) {
    const roleExists = roles.some((role) => normalizeRoleId(role.id) === rawRoleId)
    return {
      roleId: rawRoleId,
      isStale: false,
      isInvalid: !roleExists,
      sourceType: 'manual',
    }
  }

  const employee = employees.find((item) => item.id === user.employeeId)
  if (!employee) {
    return {
      roleId: rawRoleId,
      isStale: true,
      isInvalid: true,
      sourceType: 'invalid',
    }
  }

  const deptRole = findDepartmentRole(roles, employee.deptId)
  if (deptRole) {
    return {
      roleId: deptRole.id,
      isStale: normalizeRoleId(deptRole.id) !== rawRoleId,
      isInvalid: false,
      sourceType: 'department_role',
    }
  }

  return {
    roleId: rawRoleId,
    isStale: false,
    isInvalid: true,
    sourceType: 'invalid',
  }
}

/**
 * 递归从组织树中查找节点名称
 */
export function resolveOrgNodeLabel(
  nodes: OrgNode[],
  targetId: string,
): string | null {
  const normalizedTargetId = targetId.trim().toLowerCase()
  const searchId = normalizedTargetId.startsWith('org_') 
    ? normalizedTargetId.substring(4) 
    : normalizedTargetId

  for (const node of nodes) {
    if (node.id.toLowerCase() === searchId) {
      return node.name
    }
    if (node.children && node.children.length > 0) {
      const found = resolveOrgNodeLabel(node.children, searchId)
      if (found) return found
    }
  }
  return null
}

/**
 * 统一的角色标签解析引擎
 * 优先查 Role 矩阵，查不到则回退到 Org 树反查
 */
export function resolveRoleLabel(
  roleId: string,
  dynamicRoles: Role[],
  orgNodes: OrgNode[] = [],
): string {
  const normalizedId = roleId.trim().toLowerCase()

  // 1. 查静态/已导入角色
  const dynamicRole = dynamicRoles.find(
    (r) => r.id.trim().toLowerCase() === normalizedId
  )
  if (dynamicRole) return dynamicRole.label

  // 2. 查组织架构树 (支持 Org_ 或 直接 UUID)
  const orgLabel = resolveOrgNodeLabel(orgNodes, normalizedId)
  if (orgLabel) return orgLabel

  // 3. 回退显示原始 ID
  return roleId
}
