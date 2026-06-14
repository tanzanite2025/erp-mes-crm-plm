'use client'

import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { productOptionsQueryKey } from '@/features/engineering/query-keys'
import { ProductCoreService } from '@/features/engineering/services/product-core-service'
import { type Mold } from '../data/schema'

export function useMoldGroups(molds: Mold[], searchTerm: string) {
  const { data: products = [], isLoading } = useQuery({
    queryKey: productOptionsQueryKey(),
    queryFn: () => ProductCoreService.getProducts({ isOptions: true }),
  })

  const normalizedSearchTerm = searchTerm.toLowerCase()

  const groupToProducts = useMemo(() => {
    const map: Record<string, string[]> = {}
    products.forEach((product) => {
      if (!product.moldGroup) return
      if (!map[product.moldGroup]) {
        map[product.moldGroup] = []
      }
      map[product.moldGroup].push(product.sku)
    })
    return map
  }, [products])

  const filteredMolds = useMemo(() => {
    return molds.filter((mold) => {
      const matchesBasic =
        mold.sn.toLowerCase().includes(normalizedSearchTerm) ||
        mold.name.toLowerCase().includes(normalizedSearchTerm) ||
        (mold.groupName &&
          mold.groupName.toLowerCase().includes(normalizedSearchTerm))

      const associatedProducts = mold.groupName
        ? groupToProducts[mold.groupName] || []
        : []
      const matchesProducts = associatedProducts.some((sku) =>
        sku.toLowerCase().includes(normalizedSearchTerm)
      )

      return matchesBasic || matchesProducts
    })
  }, [groupToProducts, molds, normalizedSearchTerm])

  const groupedMolds = useMemo(() => {
    return filteredMolds.reduce(
      (acc, mold) => {
        const group = mold.groupName || '未分组'
        if (!acc[group]) {
          acc[group] = []
        }
        acc[group].push(mold)
        return acc
      },
      {} as Record<string, Mold[]>
    )
  }, [filteredMolds])

  const groupNames = useMemo(
    () => Object.keys(groupedMolds).sort(),
    [groupedMolds]
  )

  return {
    groupNames,
    groupedMolds,
    groupToProducts,
    isLoadingProducts: isLoading,
    allProducts: products,
  }
}
