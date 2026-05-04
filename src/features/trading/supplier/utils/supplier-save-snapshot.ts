import type { Supplier, SupplierFormValues } from '../../data/schema'

export function buildSupplierSaveSnapshot(
  baseSupplier: Supplier | null | undefined,
  draft: SupplierFormValues
): Supplier | SupplierFormValues {
  if (!baseSupplier) {
    return draft
  }

  return {
    ...baseSupplier,
    ...structuredClone(draft),
  }
}
