import { useMemo } from 'react'
import { type OrgNode } from '@/features/org-personnel/data/org-schema'
import { useRoles } from '@/features/system-mgmt/hooks/use-roles'
import { buildRoleDisplayText, resolveRoleLabels } from '../utils/role-display'

interface UseRoleDisplayOptions {
  enabled?: boolean
  orgNodes?: OrgNode[]
  separator?: string
  dedupe?: boolean
}

export function useRoleDisplay(roleIds?: string[], options: UseRoleDisplayOptions = {}) {
  const { enabled = true, orgNodes = [], separator = ' / ', dedupe = true } = options
  const shouldLoadRoles = enabled && Boolean(roleIds?.length)
  const { roles, isInitialLoading } = useRoles(shouldLoadRoles)

  const labels = useMemo(
    () => resolveRoleLabels(roleIds, roles, orgNodes),
    [orgNodes, roleIds, roles],
  )

  const text = useMemo(
    () => buildRoleDisplayText(roleIds, roles, { orgNodes, separator, dedupe }),
    [dedupe, orgNodes, roleIds, roles, separator],
  )

  return {
    labels,
    text,
    roles,
    isLoading: shouldLoadRoles && isInitialLoading,
  }
}
