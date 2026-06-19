import { type DeltaSet } from './types'

function isArrayIndexSegment(segment: string): boolean {
  return /^\d+$/.test(segment)
}

function assignDeltaValue(
  target: Record<string, unknown>,
  path: string,
  value: unknown
) {
  const segments = path.split('.').filter(Boolean)
  if (segments.length === 0) {
    return
  }

  let current: Record<string, unknown> | unknown[] = target

  for (let index = 0; index < segments.length - 1; index += 1) {
    const segment = segments[index]!
    const nextSegment = segments[index + 1]!
    const key: string | number =
      Array.isArray(current) && isArrayIndexSegment(segment)
        ? Number(segment)
        : segment
    const existing = current[key]

    if (existing === null || typeof existing !== 'object') {
      current[key] = isArrayIndexSegment(nextSegment) ? [] : {}
    }

    current = current[key] as Record<string, unknown> | unknown[]
  }

  const lastSegment = segments[segments.length - 1]!
  const lastKey: string | number =
    Array.isArray(current) && isArrayIndexSegment(lastSegment)
      ? Number(lastSegment)
      : lastSegment

  current[lastKey] = value
}

export function buildDeltaUpsertPayload<TId extends string | number>(
  id: TId,
  delta: DeltaSet
): { id: TId } & Record<string, unknown> {
  const payload: Record<string, unknown> = { id }

  Object.entries(delta).forEach(([path, change]) => {
    assignDeltaValue(payload, path, change.n)
  })

  return payload as { id: TId } & Record<string, unknown>
}
