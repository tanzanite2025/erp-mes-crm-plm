import type { AuthUser } from '@/stores/auth-store'
import { getMenuPermissionForPath } from '@/features/authz/data/permission-catalog'
import { StorageService } from '@/features/system-mgmt/services/storage-service'
import { resolveRecentVisitLabelKey } from './recent-visit-labels'
import type { RecentVisit } from './types'

export const RECENT_VISITS_UPDATED_EVENT = 'xdfc_recent_visits_updated'
const RECENT_VISITS_STORAGE_PREFIX = 'xdfc_recent_visits'
const RECENT_VISITS_LIMIT = 20

const RECENT_VISIT_SYSTEM_SHELL_EXACT_PATHS = [
  '/',
  '/401',
  '/403',
  '/404',
  '/500',
  '/503',
  '/sign-in',
  '/forgot-password',
  '/pda-shell',
] as const

const RECENT_VISIT_INTERNAL_UTILITY_EXACT_PATHS = [
  '/personal-workbench',
  '/basic-settings/permission-tree-smoke',
] as const

const RECENT_VISIT_REDIRECT_ONLY_EXACT_PATHS = [
  '/quotes/wholesale',
  '/quotes/retail',
  '/trading/quotes',
] as const

const RECENT_VISIT_IGNORED_EXACT_PATHS = new Set<string>([
  ...RECENT_VISIT_SYSTEM_SHELL_EXACT_PATHS,
  ...RECENT_VISIT_INTERNAL_UTILITY_EXACT_PATHS,
  ...RECENT_VISIT_REDIRECT_ONLY_EXACT_PATHS,
])

const RECENT_VISIT_IGNORED_PREFIXES = [
  '/errors/',
  '/personal-workbench/',
  '/product-barcode-capture',
  '/prepreg-label-capture',
  '/packaging-assembly-capture',
]

function normalizePath(path: string): string {
  const normalized = path
    .split('?')[0]
    ?.split('#')[0]
    ?.replace(/\/+/g, '/')
    .replace(/\/$/, '')
  return normalized || '/'
}

function getUserStorageIdentity(user: AuthUser | null): string | null {
  return user?.id || user?.accountNo || user?.username || null
}

export function getRecentVisitsStorageKey(
  user: AuthUser | null
): string | null {
  const identity = getUserStorageIdentity(user)
  return identity
    ? `${RECENT_VISITS_STORAGE_PREFIX}:${encodeURIComponent(identity)}`
    : null
}

export function shouldTrackRecentVisit(path: string): boolean {
  const normalized = normalizePath(path)
  if (RECENT_VISIT_IGNORED_EXACT_PATHS.has(normalized)) return false
  return !RECENT_VISIT_IGNORED_PREFIXES.some((prefix) =>
    normalized.startsWith(prefix)
  )
}

function isRecentVisit(value: unknown): value is RecentVisit {
  if (!value || typeof value !== 'object') return false
  const record = value as Partial<RecentVisit>
  return (
    typeof record.path === 'string' &&
    typeof record.visitedAt === 'string' &&
    typeof record.count === 'number'
  )
}

function normalizeVisits(raw: unknown): RecentVisit[] {
  if (!Array.isArray(raw)) return []
  return raw
    .filter(isRecentVisit)
    .map((visit) => ({
      ...visit,
      path: normalizePath(visit.path),
      labelKey: resolveRecentVisitLabelKey(normalizePath(visit.path)),
      count: Math.max(1, Math.floor(visit.count)),
    }))
    .filter((visit) => shouldTrackRecentVisit(visit.path))
}

export async function readRecentVisits(
  user: AuthUser | null
): Promise<RecentVisit[]> {
  const storageKey = getRecentVisitsStorageKey(user)
  if (!storageKey) return []
  const raw = await StorageService.getItem<RecentVisit[]>(storageKey)
  return normalizeVisits(raw)
}

export async function writeRecentVisits(
  user: AuthUser | null,
  visits: RecentVisit[]
): Promise<void> {
  const storageKey = getRecentVisitsStorageKey(user)
  if (!storageKey) return

  await StorageService.setItem(storageKey, visits.slice(0, RECENT_VISITS_LIMIT))

  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent(RECENT_VISITS_UPDATED_EVENT, {
        detail: { key: storageKey },
      })
    )
  }
}

export async function recordRecentVisit(
  user: AuthUser | null,
  path: string
): Promise<void> {
  const normalizedPath = normalizePath(path)
  if (!user || !shouldTrackRecentVisit(normalizedPath)) return

  const current = await readRecentVisits(user)
  const now = new Date().toISOString()
  const existing = current.find((visit) => visit.path === normalizedPath)
  const nextVisit: RecentVisit = {
    path: normalizedPath,
    labelKey: resolveRecentVisitLabelKey(normalizedPath),
    visitedAt: now,
    count: existing ? existing.count + 1 : 1,
  }

  const next = [
    nextVisit,
    ...current.filter((visit) => visit.path !== normalizedPath),
  ].slice(0, RECENT_VISITS_LIMIT)

  await writeRecentVisits(user, next)
}

export function canReadRecentVisit(
  user: AuthUser | null,
  visit: RecentVisit
): boolean {
  if (!user) return false
  const granted = new Set(
    (user.permissions ?? []).map((permission) =>
      permission.trim().toLowerCase()
    )
  )
  if (granted.size === 0) return false

  try {
    const requiredPermission = getMenuPermissionForPath(
      visit.path
    ).toLowerCase()
    return granted.has(requiredPermission)
  } catch {
    return false
  }
}
