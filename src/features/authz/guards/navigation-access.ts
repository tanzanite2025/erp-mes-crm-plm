import type { NavGroup, NavItem } from '@/components/layout/types'

export function getNonBlockingNavGroups(
  _user: unknown,
  groups: NavGroup[],
): NavGroup[] {
  return groups.map((group) => ({
    ...group,
    items: [...group.items] as NavItem[],
  }))
}
