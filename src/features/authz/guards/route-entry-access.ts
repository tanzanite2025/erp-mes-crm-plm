export function canOpenRouteEntryNonBlocking(
  _user: unknown,
  href: string | null | undefined
): boolean {
  return Boolean(href)
}

export function getNonBlockingRouteEntries<T extends { href: string }>(
  _user: unknown,
  entries: T[]
): T[] {
  return [...entries]
}
