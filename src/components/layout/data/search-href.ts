export function normalizeSearchHref(href: string) {
  if (href === '/system-management/routing' || href === '/approval/routing') {
    return '/message-center/rules'
  }
  return href
}
