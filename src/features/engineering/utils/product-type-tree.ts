import { type Product, type ProductType } from '../data/schema'

export function buildOrderedProductTypes(types: ProductType[], dedupe = false): ProductType[] {
  if (!types.length) return []

  const source = dedupe ? Array.from(new Map(types.filter((item) => item?.id).map((item) => [item.id, item])).values()) : types
  const childrenMap = new Map<string, ProductType[]>()
  const roots: ProductType[] = []

  source.forEach((item) => {
    if (!item.parentId) {
      roots.push(item)
      return
    }

    const children = childrenMap.get(item.parentId) || []
    children.push(item)
    childrenMap.set(item.parentId, children)
  })

  const ordered: ProductType[] = []
  const processedIds = new Set<string>()

  roots.forEach((root) => {
    ordered.push(root)
    processedIds.add(root.id)

    const children = childrenMap.get(root.id) || []
    children.forEach((child) => {
      ordered.push(child)
      processedIds.add(child.id)
    })
  })

  source.forEach((item) => {
    if (!processedIds.has(item.id)) {
      ordered.push(item)
    }
  })

  return ordered
}

export function buildProductTypeMap(types: ProductType[]) {
  return new Map(types.map((item) => [item.id, item]))
}

export function buildProductCountByType(products: Product[]) {
  const counts = new Map<string, number>()

  products.forEach((product) => {
    counts.set(product.typeId, (counts.get(product.typeId) ?? 0) + 1)
  })

  return counts
}

export function buildChildTypeCountMap(types: ProductType[]) {
  const counts = new Map<string, number>()

  types.forEach((type) => {
    if (!type.parentId) return
    counts.set(type.parentId, (counts.get(type.parentId) ?? 0) + 1)
  })

  return counts
}
