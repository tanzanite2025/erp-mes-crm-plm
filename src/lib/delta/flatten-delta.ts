import { type DeltaSet } from './types'

export interface FlattenDeltaOptions {
  basePath?: string
  normalizeUndefinedToNull?: boolean
  includeEqual?: boolean
}

function isObjectLike(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isEqualValue(a: unknown, b: unknown): boolean {
  if (a === b) return true
  if (a === null || b === null) return a === b
  if (typeof a !== typeof b) return false
  if (Array.isArray(a) || Array.isArray(b)) return false
  if (typeof a === 'object') {
    try {
      return JSON.stringify(a) === JSON.stringify(b)
    } catch {
      return false
    }
  }
  return false
}

function normalizeValue(value: unknown, normalizeUndefinedToNull: boolean) {
  if (!normalizeUndefinedToNull) return value
  return value === undefined ? null : value
}

function buildFlattenedDelta(
  delta: DeltaSet,
  currentValue: unknown,
  nextValue: unknown,
  path: string,
  options: Required<FlattenDeltaOptions>
) {
  const normalizedCurrent = normalizeValue(currentValue, options.normalizeUndefinedToNull)
  const normalizedNext = normalizeValue(nextValue, options.normalizeUndefinedToNull)

  if (!options.includeEqual && isEqualValue(normalizedCurrent, normalizedNext)) {
    return
  }

  const currentIsObject = isObjectLike(normalizedCurrent)
  const nextIsObject = isObjectLike(normalizedNext)

  if (currentIsObject || nextIsObject) {
    const currentIsArray = Array.isArray(normalizedCurrent)
    const nextIsArray = Array.isArray(normalizedNext)

    if (currentIsArray || nextIsArray) {
      if (!currentIsArray || !nextIsArray) {
        delta[path] = { o: normalizedCurrent, n: normalizedNext }
        return
      }

      const currentArray = normalizedCurrent as unknown[]
      const nextArray = normalizedNext as unknown[]
      const maxLen = Math.max(currentArray.length, nextArray.length)
      for (let index = 0; index < maxLen; index += 1) {
        const nextPath = path ? `${path}.${index}` : `${index}`
        buildFlattenedDelta(delta, currentArray[index], nextArray[index], nextPath, options)
      }
      return
    }

    const currentObject = (normalizedCurrent ?? {}) as Record<string, unknown>
    const nextObject = (normalizedNext ?? {}) as Record<string, unknown>
    const keys = new Set([...Object.keys(currentObject), ...Object.keys(nextObject)])
    keys.forEach((key) => {
      const nextPath = path ? `${path}.${key}` : key
      buildFlattenedDelta(delta, currentObject[key], nextObject[key], nextPath, options)
    })
    return
  }

  delta[path] = { o: normalizedCurrent, n: normalizedNext }
}

export function buildFlattenDelta(
  current: unknown,
  next: unknown,
  options: FlattenDeltaOptions = {}
): DeltaSet {
  const resolvedOptions: Required<FlattenDeltaOptions> = {
    basePath: options.basePath ?? '',
    normalizeUndefinedToNull: options.normalizeUndefinedToNull ?? true,
    includeEqual: options.includeEqual ?? false,
  }
  const delta: DeltaSet = {}
  buildFlattenedDelta(delta, current, next, resolvedOptions.basePath, resolvedOptions)
  return delta
}
