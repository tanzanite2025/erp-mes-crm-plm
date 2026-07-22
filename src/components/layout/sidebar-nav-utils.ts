import type { NavBranch, NavItem, NavLink } from './types'

function resolveBadgeValue(
  item: NavItem,
  unreadApprovals: number,
  systemAlertCount: number
): string | undefined {
  if (item.badgeKey === 'approval-unread' || item.id === 'approval-center') {
    return unreadApprovals > 0 ? unreadApprovals.toString() : undefined
  }

  if (item.badgeKey === 'system-alert' || item.id === 'system-management') {
    return systemAlertCount > 0 ? '●' : undefined
  }

  return item.badge
}

function normalizePath(path?: string): string {
  if (!path) {
    return ''
  }

  const normalized = path
    .split('?')[0]
    ?.split('#')[0]
    ?.replace(/\/+/g, '/')
    .replace(/\/$/, '')

  return normalized || '/'
}

function isPathMatch(pathname: string, target?: string): boolean {
  if (!target) {
    return false
  }

  if (target === '/') {
    return pathname === '/'
  }

  return pathname === target || pathname.startsWith(target + '/')
}

function isExactPathMatch(pathname: string, target?: string): boolean {
  if (!target) {
    return false
  }

  return normalizePath(pathname) === normalizePath(target)
}

function getActiveTargets(item: NavItem): string[] {
  const itemUrl = item.url ? String(item.url) : undefined
  const activeMatch = item.activeMatch ? String(item.activeMatch) : undefined

  if (item.activeMatches?.length) {
    return [itemUrl, activeMatch, ...item.activeMatches.map(String)].filter(
      Boolean
    ) as string[]
  }

  return [activeMatch || itemUrl].filter(Boolean) as string[]
}

export function withDynamicBadges(
  items: NavItem[],
  unreadApprovals: number,
  systemAlertCount: number
): NavItem[] {
  return items.map((item) => ({
    ...item,
    badge: resolveBadgeValue(item, unreadApprovals, systemAlertCount),
    children: item.children
      ? withDynamicBadges(item.children, unreadApprovals, systemAlertCount)
      : undefined,
  }))
}

export function checkIsActive(
  pathname: string,
  item: NavItem,
  mainNav = false
): boolean {
  const selfActive = getActiveTargets(item).some((target) =>
    isPathMatch(pathname, target)
  )
  const childActive = !!item.children?.some((child) =>
    checkIsActive(pathname, child)
  )

  if (selfActive || childActive) {
    return true
  }

  const itemUrl = item.url ? String(item.url) : undefined
  return !!(
    itemUrl &&
    mainNav &&
    pathname.split('/')[1] === itemUrl.split('/')[1]
  )
}

export function checkIsDirectlySelected(
  pathname: string,
  item: NavItem
): boolean {
  return getActiveTargets(item).some((target) =>
    isExactPathMatch(pathname, target)
  )
}

export function hasActiveDescendant(pathname: string, item: NavItem): boolean {
  return !!item.children?.some((child) => checkIsActive(pathname, child))
}

export function groupHasActiveItem(pathname: string, items: NavItem[]) {
  return items.some((item) => checkIsActive(pathname, item))
}

export function hasChildren(item: NavItem): item is NavBranch {
  return Array.isArray(item.children) && item.children.length > 0
}

export function isEmptyPreservedBranch(
  item: NavItem
): item is NavItem & { children: NavItem[] } {
  return (
    item.preserveEmptyChildren === true &&
    Array.isArray(item.children) &&
    item.children.length === 0
  )
}

export function isSystemAlertBadge(item: NavItem) {
  return (
    (item.badgeKey === 'system-alert' || item.id === 'system-management') &&
    item.badge === '●'
  )
}

export function hasSystemAlertConsumer(items: NavItem[]): boolean {
  return items.some(
    (item) =>
      item.badgeKey === 'system-alert' ||
      item.id === 'system-management' ||
      (!!item.children?.length && hasSystemAlertConsumer(item.children))
  )
}

export function isNavLink(item: NavItem): item is NavLink {
  return typeof item.url !== 'undefined'
}
