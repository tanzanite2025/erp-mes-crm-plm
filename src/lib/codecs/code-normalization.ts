export function normalizeMachineCode(value?: string | null): string {
  return (value || '').replace(/\s+/g, '').trim().toUpperCase()
}

export function normalizeTrackingCode(value?: string | null): string {
  return (value || '').replace(/\s+/g, '').trim().toUpperCase()
}

export function normalizeMaterialCode(value?: string | null): string {
  return (value || '').trim().toUpperCase()
}

export function normalizeDeviceCode(value?: string | null): string {
  return (value || '').trim().toUpperCase()
}

export function normalizeComponentKey(value?: string | null, fallback = 'GENERAL'): string {
  const normalized = (value || '').trim().toUpperCase()
  return normalized || fallback
}

export function normalizeSku(value?: string | null): string {
  return (value || '').trim().toUpperCase()
}

export function normalizeModelCode(value?: string | null, fallback = '01'): string {
  const normalized = (value || '').replace(/\D/g, '').slice(0, 2)
  return normalized || fallback
}

export function normalizeTemplateKey(value?: string | null): string {
  return (value || '').trim().toUpperCase()
}

export function normalizeSiteCode(value?: string | null): string {
  return (value || '').trim().toUpperCase()
}

export function normalizeChangeOrderNo(value?: string | null): string {
  return (value || '').trim().toUpperCase()
}

export function normalizeRevisionNo(value?: string | null, fallback = 'R1'): string {
  const normalized = (value || '').trim().toUpperCase()
  return normalized || fallback
}

export function normalizeBomNo(value?: string | null): string {
  return (value || '').trim().toUpperCase()
}

export function normalizeBomVersion(value?: string | null, fallback = 'V1.0'): string {
  const normalized = (value || '').trim().toUpperCase()
  return normalized || fallback
}

export function deriveBomDisplayVersion(bomVersion?: string | null): string {
  return normalizeBomVersion(bomVersion)
}

const BOM_CHANGE_TYPES = new Set(['MANUAL', 'ECO', 'ECN'])
const BOM_STATUSES = new Set(['draft', 'active', 'archived'])

export function normalizeBomChangeType(value?: string | null, fallback = 'MANUAL'): 'MANUAL' | 'ECO' | 'ECN' {
  const normalized = (value || '').trim().toUpperCase()
  if (BOM_CHANGE_TYPES.has(normalized)) {
    return normalized as 'MANUAL' | 'ECO' | 'ECN'
  }
  return fallback as 'MANUAL' | 'ECO' | 'ECN'
}

export function normalizeBomStatus(value?: string | null, fallback = 'active'): 'draft' | 'active' | 'archived' {
  const normalized = (value || '').trim().toLowerCase()
  if (BOM_STATUSES.has(normalized)) {
    return normalized as 'draft' | 'active' | 'archived'
  }
  return fallback as 'draft' | 'active' | 'archived'
}

export function normalizeBomEffectiveDate(value?: string | null): string {
  return (value || '').trim().slice(0, 10)
}

export function normalizeSceneKey(value?: string | null, fallback = 'general'): string {
  const normalized = (value || '').trim().toLowerCase()
  return normalized || fallback
}

export function normalizeTaskKey(value?: string | null): string {
  return (value || '').trim()
}
