import { type Role } from '@/features/system-mgmt/data/role-schema'

type DepartmentLike = {
  deptId?: string
}

function normalizeRoleId(value: string | undefined) {
  return (value || '').toString().trim().toLowerCase()
}

export function buildDepartmentRoleId(deptId?: string): string {
  const normalizedDeptId = normalizeRoleId(deptId)
  if (!normalizedDeptId) return ''
  return `org_${normalizedDeptId}`
}

export function findDepartmentRole(roles: Role[], deptId?: string): Role | null {
  const normalizedDeptRoleId = buildDepartmentRoleId(deptId)
  if (!normalizedDeptRoleId) return null

  return roles.find((role) => normalizeRoleId(role.id) === normalizedDeptRoleId) || null
}

export function resolveDepartmentRoleId(roles: Role[], deptId?: string): string {
  return findDepartmentRole(roles, deptId)?.id || ''
}

export function resolveDepartmentRoleIdFromEmployee(
  roles: Role[],
  employee?: DepartmentLike | null,
): string {
  return resolveDepartmentRoleId(roles, employee?.deptId)
}
