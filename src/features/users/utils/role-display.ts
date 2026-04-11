import { type OrgNode } from '@/features/org-personnel/data/org-schema'
import { type Role } from '@/features/system-mgmt/data/role-schema'
import { resolveRoleLabel } from './role-resolver'

export interface RoleDisplayOptions {
  orgNodes?: OrgNode[]
  separator?: string
  dedupe?: boolean
}

export function resolveRoleLabels(
  roleIds?: string[],
  dynamicRoles: Role[] = [],
  orgNodes: OrgNode[] = [],
): string[] {
  if (!Array.isArray(roleIds) || roleIds.length === 0) return []

  return roleIds
    .filter(Boolean)
    .map((roleId) => resolveRoleLabel(roleId, dynamicRoles, orgNodes))
    .filter(Boolean)
}

export function buildRoleDisplayText(
  roleIds?: string[],
  dynamicRoles: Role[] = [],
  options: RoleDisplayOptions = {},
): string | undefined {
  const { orgNodes = [], separator = ' / ', dedupe = true } = options
  const labels = resolveRoleLabels(roleIds, dynamicRoles, orgNodes)
  const displayLabels = dedupe ? Array.from(new Set(labels)) : labels

  if (displayLabels.length === 0) return undefined

  return displayLabels.join(separator)
}
