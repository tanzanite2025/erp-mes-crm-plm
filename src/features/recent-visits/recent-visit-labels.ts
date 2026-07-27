import type { TranslationKey } from '@/locales'
import {
  resolveExactRoutePermissionLabelKey,
  resolveRoutePermissionLabelKey,
} from '@/features/authz/data/route-permission-labels'
import { resolveMaterialCategoryLabelKey } from '@/features/material-archive/data/material-category-options'

const RECENT_VISIT_EXACT_LABEL_KEYS: Record<string, TranslationKey> = {
  '/dashboard/overview': 'dashboard.page.tabs.overview',
  '/dashboard/calendar': 'dashboard.page.tabs.calendar',
  '/dashboard/reports': 'dashboard.page.tabs.reports',
  '/dashboard/notifications': 'dashboard.page.tabs.notifications',
  '/engineering-db': 'engineering.db.overview.title',
  '/materials/all': 'materialArchive.layout.tabs.all',
  '/materials/assembly': 'materialArchive.layout.tabs.assembly',
  '/quality/standards/new': 'quality.standards.workspace.editorCreateTitle',
  '/system-management': 'systemManagement.layout.tabs.status',
  '/warehouse': 'warehouse.tabs.stock',
  '/equipment-maintenance/plans': 'equipmentMaintenance.tabs.plans',
  '/equipment-maintenance/analytics': 'equipmentMaintenance.tabs.analytics',
  '/personnel/architecture': 'productionShared.workArchitecture.title',
  '/wheel-trace': 'scanPlatform.modules.wheelTrace.name',
}

function normalizePath(path: string): string {
  const normalized = path
    .split('?')[0]
    ?.split('#')[0]
    ?.replace(/\/+/g, '/')
    .replace(/\/$/, '')
  return normalized || '/'
}

function resolveDynamicRecentVisitLabelKey(
  path: string
): TranslationKey | undefined {
  const segments = path.split('/').filter(Boolean)
  if (segments[0] === 'materials' && segments.length === 2) {
    return (
      resolveMaterialCategoryLabelKey(decodeURIComponent(segments[1] ?? '')) ??
      'sidebar.items.materialArchive'
    )
  }
  if (
    segments[0] === 'quality' &&
    segments[1] === 'standards' &&
    segments.length === 4
  ) {
    if (segments[3] === 'edit') {
      return 'quality.standards.workspace.editorEditTitle'
    }
    if (segments[3] === 'preview') {
      return 'quality.standards.workspace.previewTitle'
    }
  }

  return undefined
}

export function resolveRecentVisitCanonicalLabelKey(
  path: string
): TranslationKey | undefined {
  const normalizedPath = normalizePath(path)
  return (
    RECENT_VISIT_EXACT_LABEL_KEYS[normalizedPath] ??
    resolveDynamicRecentVisitLabelKey(normalizedPath) ??
    resolveExactRoutePermissionLabelKey(normalizedPath)
  )
}

export function resolveRecentVisitLabelKey(
  path: string
): TranslationKey | undefined {
  const normalizedPath = normalizePath(path)
  return (
    resolveRecentVisitCanonicalLabelKey(normalizedPath) ??
    resolveRoutePermissionLabelKey(normalizedPath)
  )
}
