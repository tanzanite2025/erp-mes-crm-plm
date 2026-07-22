export function normalizeSearchHref(href: string) {
  if (href === '/inventory') {
    return '/warehouse'
  }
  return href
}
