import { createApiClientError } from '@/lib/api-error'

export function ensureArrayResponse<T>(value: unknown, context: string): T[] {
  if (!Array.isArray(value)) {
    throw createApiClientError({
      kind: 'invalid_response',
      message: `[INVALID_RESPONSE] ${context} expected an array response.`,
      context,
    })
  }

  return value as T[]
}

export function ensureObjectResponse<T extends Record<string, unknown>>(
  value: unknown,
  context: string
): T {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw createApiClientError({
      kind: 'invalid_response',
      message: `[INVALID_RESPONSE] ${context} expected an object response.`,
      context,
    })
  }

  return value as T
}

export function ensureObjectField<T extends Record<string, unknown>>(
  value: Record<string, unknown>,
  fieldName: string,
  context: string
): T {
  const fieldValue = value[fieldName]
  if (
    !fieldValue ||
    typeof fieldValue !== 'object' ||
    Array.isArray(fieldValue)
  ) {
    throw createApiClientError({
      kind: 'invalid_response',
      message: `[INVALID_RESPONSE] ${context} expected "${fieldName}" to be an object.`,
      context,
    })
  }

  return fieldValue as T
}

export function ensureNumberField(
  value: Record<string, unknown>,
  fieldName: string,
  context: string
): number {
  const fieldValue = value[fieldName]
  if (typeof fieldValue !== 'number' || Number.isNaN(fieldValue)) {
    throw createApiClientError({
      kind: 'invalid_response',
      message: `[INVALID_RESPONSE] ${context} expected "${fieldName}" to be a number.`,
      context,
    })
  }

  return fieldValue
}

export function ensureArrayField<T>(
  value: unknown,
  fieldName: string,
  context: string
): T[] {
  const objectValue = ensureObjectResponse<Record<string, unknown>>(
    value,
    context
  )
  const fieldValue = objectValue[fieldName]

  if (!Array.isArray(fieldValue)) {
    throw createApiClientError({
      kind: 'invalid_response',
      message: `[INVALID_RESPONSE] ${context} expected "${fieldName}" to be an array.`,
      context,
    })
  }

  return fieldValue as T[]
}
