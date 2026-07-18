import type { AuthSessionUserLike } from '../utils/auth-session'
import { matchesPathPermissionProjection } from './route-access'

export function canOpenRouteEntry(
  user: AuthSessionUserLike | null | undefined,
  href: string | null | undefined
): boolean {
  return Boolean(href) && matchesPathPermissionProjection(user, href as string)
}

export function getAccessibleRouteEntries<T extends { href: string }>(
  user: AuthSessionUserLike | null | undefined,
  entries: T[]
): T[] {
  return entries.filter((entry) =>
    matchesPathPermissionProjection(user, entry.href)
  )
}
