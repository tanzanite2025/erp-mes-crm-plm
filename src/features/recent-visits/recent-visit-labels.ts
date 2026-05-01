import { DEFAULT_LOCALE, translate, type TranslationKey } from '@/locales'
import { resolveExactRoutePermissionLabelKey } from '@/features/authz/data/route-permission-labels'
import { resolveMaterialCategoryLabelKey } from '@/features/material-archive/data/material-category-options'

const RECENT_VISIT_EXACT_LABEL_KEYS: Record<string, TranslationKey> = {
  '/dashboard/overview': 'dashboard.page.tabs.overview',
  '/dashboard/calendar': 'dashboard.page.tabs.calendar',
  '/dashboard/analytics': 'dashboard.page.tabs.analytics',
  '/dashboard/reports': 'dashboard.page.tabs.reports',
  '/dashboard/notifications': 'dashboard.page.tabs.notifications',
  '/materials': 'sidebar.items.materialArchive',
  '/materials/all': 'materialArchive.layout.tabs.all',
  '/materials/assembly': 'materialArchive.layout.tabs.assembly',
}

function normalizePath(path: string): string {
  const normalized = path
    .split('?')[0]
    ?.split('#')[0]
    ?.replace(/\/+/g, '/')
    .replace(/\/$/, '')
  return normalized || '/'
}

function toFallbackLabel(path: string): string {
  const segments = path.split('/').filter(Boolean)
  const lastSegment = segments[segments.length - 1]
  if (!lastSegment) return 'Dashboard'
  return lastSegment
    .split('-')
    .filter(Boolean)
    .map(
      (segment: string) => segment.charAt(0).toUpperCase() + segment.slice(1)
    )
    .join(' ')
}

function resolveDynamicRecentVisitLabelKey(
  path: string
): TranslationKey | undefined {
  const segments = path.split('/').filter(Boolean)
  if (segments[0] === 'materials' && segments.length === 2) {
    return resolveMaterialCategoryLabelKey(
      decodeURIComponent(segments[1] ?? '')
    )
  }
  return undefined
}

export function resolveRecentVisitLabelKey(
  path: string
): TranslationKey | undefined {
  const normalizedPath = normalizePath(path)
  return (
    RECENT_VISIT_EXACT_LABEL_KEYS[normalizedPath] ??
    resolveDynamicRecentVisitLabelKey(normalizedPath) ??
    resolveExactRoutePermissionLabelKey(normalizedPath)
  )
}

export function resolveRecentVisitFallbackLabel(path: string): string {
  const labelKey = resolveRecentVisitLabelKey(path)
  return labelKey ? translate(DEFAULT_LOCALE, labelKey) : toFallbackLabel(path)
}
