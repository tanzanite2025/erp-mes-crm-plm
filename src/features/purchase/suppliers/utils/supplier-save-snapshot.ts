import type { Supplier, SupplierFormValues } from '../data/schema'

/**
 * Safely converts a value to a plain object, handling Proxy objects
 */
function toPlainObject<T>(value: T): T {
  if (value === null || value === undefined) {
    return value
  }
  // Use JSON serialization to strip Proxy wrappers
  return JSON.parse(JSON.stringify(value))
}

export function buildSupplierSaveSnapshot(
  baseSupplier: Supplier | null | undefined,
  draft: SupplierFormValues
): Supplier | SupplierFormValues {
  if (!baseSupplier) {
    return toPlainObject(draft)
  }

  return {
    ...baseSupplier,
    ...toPlainObject(draft),
  }
}
