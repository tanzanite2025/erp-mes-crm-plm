export function ensureArrayResponse<T>(value: unknown, context: string): T[] {
  if (!Array.isArray(value)) {
    throw new Error(`[INVALID_RESPONSE] ${context} expected an array response.`)
  }

  return value as T[]
}

export function ensureObjectResponse<T extends Record<string, unknown>>(
  value: unknown,
  context: string,
): T {
  // 分页加固：apiFetch 可能返回 'Hybrid Array' (即数组实例带分页元数据)
  // 这种情况下 Array.isArray 为 true，但它仍然是符合 Record 要求的对象
  const isHybridArray = Array.isArray(value) && 'items' in (value as any) && 'total' in (value as any)

  if (!value || typeof value !== 'object' || (Array.isArray(value) && !isHybridArray)) {
    throw new Error(`[INVALID_RESPONSE] ${context} expected an object response.`)
  }

  return value as T
}

export function ensureArrayField<T>(
  value: unknown,
  fieldName: string,
  context: string,
): T[] {
  const objectValue = ensureObjectResponse<Record<string, unknown>>(value, context)
  const fieldValue = objectValue[fieldName]

  if (!Array.isArray(fieldValue)) {
    throw new Error(`[INVALID_RESPONSE] ${context} expected "${fieldName}" to be an array.`)
  }

  return fieldValue as T[]
}
