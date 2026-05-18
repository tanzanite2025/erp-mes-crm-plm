import { type Product, type ProductType } from '../data/schema'

 export interface ProductTypeHierarchyMeta {
   level: number
   pathIds: string[]
   pathNames: string[]
   pathLabel: string
   hasChildren: boolean
   subtreeHeight: number
 }

 function normalizeProductTypes(types: ProductType[], dedupe = false): ProductType[] {
   if (!dedupe) return types
   return Array.from(new Map(types.filter((item) => item?.id).map((item) => [item.id, item])).values())
 }

 function buildProductTypeChildrenMap(types: ProductType[]) {
   const childrenMap = new Map<string, ProductType[]>()

   types.forEach((item) => {
     if (!item.parentId) {
       return
     }

     const children = childrenMap.get(item.parentId) || []
     children.push(item)
     childrenMap.set(item.parentId, children)
   })

   return childrenMap
 }

export function buildOrderedProductTypes(types: ProductType[], dedupe = false): ProductType[] {
  if (!types.length) return []

  const source = normalizeProductTypes(types, dedupe)
  const typeMap = new Map(source.map((item) => [item.id, item]))
  const childrenMap = buildProductTypeChildrenMap(source)

  const ordered: ProductType[] = []
  const processedIds = new Set<string>()

  const visit = (item: ProductType) => {
    if (processedIds.has(item.id)) return

    ordered.push(item)
    processedIds.add(item.id)

    const children = childrenMap.get(item.id) || []
    children.forEach(visit)
  }

  source.forEach((item) => {
    if (!item.parentId || !typeMap.has(item.parentId)) {
      visit(item)
    }
  })

  source.forEach((item) => {
    if (!processedIds.has(item.id)) {
      visit(item)
    }
  })

  return ordered
}

 export function buildProductTypeHierarchyMetaMap(types: ProductType[], dedupe = false) {
   const source = normalizeProductTypes(types, dedupe)
   const typeMap = new Map(source.map((item) => [item.id, item]))
   const childrenMap = buildProductTypeChildrenMap(source)
   const metaMap = new Map<string, ProductTypeHierarchyMeta>()
   const processedIds = new Set<string>()
   const subtreeHeightMap = new Map<string, number>()

   const resolveSubtreeHeight = (typeId: string): number => {
     const cached = subtreeHeightMap.get(typeId)
     if (typeof cached === 'number') {
       return cached
     }

     const children = childrenMap.get(typeId) || []
     if (children.length === 0) {
       subtreeHeightMap.set(typeId, 0)
       return 0
     }

     const nextHeight = Math.max(...children.map((child) => resolveSubtreeHeight(child.id))) + 1
     subtreeHeightMap.set(typeId, nextHeight)
     return nextHeight
   }

   const visit = (item: ProductType, level: number, pathIds: string[], pathNames: string[]) => {
     if (processedIds.has(item.id)) return

     const nextPathIds = [...pathIds, item.id]
     const nextPathNames = [...pathNames, item.name]
     const children = childrenMap.get(item.id) || []

     metaMap.set(item.id, {
       level,
       pathIds: nextPathIds,
       pathNames: nextPathNames,
       pathLabel: nextPathNames.join(' / '),
       hasChildren: children.length > 0,
       subtreeHeight: resolveSubtreeHeight(item.id),
     })

     processedIds.add(item.id)
     children.forEach((child) => visit(child, level + 1, nextPathIds, nextPathNames))
   }

   source.forEach((item) => {
     if (!item.parentId || !typeMap.has(item.parentId)) {
       visit(item, 0, [], [])
     }
   })

   source.forEach((item) => {
     if (!processedIds.has(item.id)) {
       visit(item, 0, [], [])
     }
   })

   return metaMap
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
