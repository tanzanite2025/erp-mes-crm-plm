import { useMemo, useState } from 'react'
import { type Product, type ProductType } from '../data/schema'

type NestedProductType = ProductType & {
  level: number
}

type EngineeringSidebarSection = {
  type: NestedProductType
  products: Product[]
}

interface UseEngineeringSidebarViewModelParams {
  products: Product[]
  types: ProductType[]
}

export function useEngineeringSidebarViewModel({
  products,
  types,
}: UseEngineeringSidebarViewModelParams) {
  const [searchTerm, setSearchTerm] = useState('')

  const handleSearchTermChange = (value: string) => {
    setSearchTerm(value)
  }

  const filteredProducts = useMemo(() => {
    return products.filter(
      (product) =>
        product.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.name.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }, [products, searchTerm])

  const productsByType = useMemo(() => {
    const grouped = new Map<string, Product[]>()

    filteredProducts.forEach((product) => {
      const list = grouped.get(product.typeId) || []
      list.push(product)
      grouped.set(product.typeId, list)
    })

    return grouped
  }, [filteredProducts])

  const sortedTypes = useMemo(() => {
    const result: NestedProductType[] = []
    const typeMap = new Map<string, ProductType[]>()

    types.forEach((type) => {
      const parentId = type.parentId || 'root'
      const list = typeMap.get(parentId) || []
      list.push(type)
      typeMap.set(parentId, list)
    })

    const processedIds = new Set<string>()

    const visit = (parentId: string, level: number) => {
      const children = typeMap.get(parentId === '' ? 'root' : parentId) || []
      children.forEach((child) => {
        if (processedIds.has(child.id)) return
        result.push({ ...child, level })
        processedIds.add(child.id)
        visit(child.id, level + 1)
      })
    }

    visit('', 0)

    types.forEach((type) => {
      if (!processedIds.has(type.id)) {
        result.push({ ...type, level: 0 })
      }
    })

    return result
  }, [types])

  const typeSections = useMemo<EngineeringSidebarSection[]>(
    () =>
      sortedTypes.map((type) => ({
        type,
        products: productsByType.get(type.id) || [],
      })),
    [productsByType, sortedTypes]
  )

  return {
    searchTerm,
    filteredProducts,
    typeSections,
    handleSearchTermChange,
  }
}
