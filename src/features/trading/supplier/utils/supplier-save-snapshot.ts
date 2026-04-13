import type { Supplier } from '../../data/schema'

export function buildSupplierSaveSnapshot(baseSupplier: Supplier | null | undefined, draft: Partial<Supplier>): Supplier {
  if (!baseSupplier) {
    return draft as Supplier
  }

  return {
    ...baseSupplier,
    ...JSON.parse(JSON.stringify(draft)) as Partial<Supplier>,
  }
}
