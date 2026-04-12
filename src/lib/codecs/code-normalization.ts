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

export function normalizeSceneKey(value?: string | null, fallback = 'general'): string {
  const normalized = (value || '').trim().toLowerCase()
  return normalized || fallback
}

export function normalizeTaskKey(value?: string | null): string {
  return (value || '').trim()
}
