import { resolveRoutePermissionLabelKey } from '@/features/authz/data/route-permission-labels'
import { DEFAULT_LOCALE, translate, type TranslationKey } from '@/locales'

function toFallbackLabel(path: string): string {
  const segments = path.split('/').filter(Boolean)
  const lastSegment = segments[segments.length - 1]
  if (!lastSegment) return 'Dashboard'
  return lastSegment
    .split('-')
    .filter(Boolean)
    .map((segment: string) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ')
}

export function resolveRecentVisitLabelKey(path: string): TranslationKey | undefined {
  return resolveRoutePermissionLabelKey(path)
}

export function resolveRecentVisitFallbackLabel(path: string): string {
  const labelKey = resolveRecentVisitLabelKey(path)
  return labelKey ? translate(DEFAULT_LOCALE, labelKey) : toFallbackLabel(path)
}
