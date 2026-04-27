export function parseIdList(value: unknown): string[] {
  return dedupeIds(toStringArray(value))
}

export function parseRequiredIds(required: string | string[]): string[] {
  return parseIdList(required)
}

export function hasAnyId(sourceIds: string[], requiredIds: string[]): boolean {
  if (requiredIds.length === 0) return false
  const sourceSet = toMatchSet(sourceIds)
  return requiredIds.some((id) => sourceSet.has(normalizeForMatch(id)))
}

export function hasAllIds(sourceIds: string[], requiredIds: string[]): boolean {
  if (requiredIds.length === 0) return true
  const sourceSet = toMatchSet(sourceIds)
  return requiredIds.every((id) => sourceSet.has(normalizeForMatch(id)))
}

function toStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => String(item).trim())
      .filter(Boolean)
  }

  if (typeof value === 'string') {
    return value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)
  }

  return []
}

function dedupeIds(ids: string[]): string[] {
  const seen = new Set<string>()
  const normalizedSeen = new Set<string>()

  ids.forEach((id) => {
    const trimmed = id.trim()
    if (!trimmed) return

    const normalized = normalizeForMatch(trimmed)
    if (normalizedSeen.has(normalized)) return

    normalizedSeen.add(normalized)
    seen.add(trimmed)
  })

  return Array.from(seen)
}

function toMatchSet(ids: string[]): Set<string> {
  return new Set(ids.map((id) => normalizeForMatch(id)).filter(Boolean))
}

function normalizeForMatch(value: string): string {
  return value.trim().toLowerCase()
}
