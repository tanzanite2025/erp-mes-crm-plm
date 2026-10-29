import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useLanguage } from '@/context/language-provider'
import { productOptionsQueryKey } from '@/features/engineering/query-keys'
import { ProductCoreService } from '@/features/engineering/services/product-core-service'
import type { Mold } from '../data/schema'
import { createMoldGroupMasterDirectoryQueryOptions } from '../queries/mold-group-master-directory-query-options'

export function useMoldGroupMasterLibraryAssetsAndProductReferences(
  molds: Mold[],
  searchTerm: string
) {
  const { locale } = useLanguage()
  const { data: products = [], isLoading } = useQuery({
    queryKey: productOptionsQueryKey(),
    queryFn: () => ProductCoreService.getProducts({ isOptions: true }),
  })
  const directoryQuery = useQuery(createMoldGroupMasterDirectoryQueryOptions())
  const groupedLibrary = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase()
    const groupLabels: Record<string, string> = {
      __ungrouped__: locale.startsWith('zh') ? '未分组' : 'Unassigned',
    }
    const groupedMolds: Record<string, Mold[]> = {}
    const groupToProducts: Record<string, string[]> = {}
    for (const group of directoryQuery.data ?? []) {
      groupLabels[group.id] =
        group.name +
        (!group.active
          ? locale.startsWith('zh')
            ? '（已停用）'
            : ' (inactive)'
          : '')
      groupedMolds[group.id] = []
    }
    for (const product of products) {
      if (!product.moldGroupId) continue
      ;(groupToProducts[product.moldGroupId] ??= []).push(product.sku)
    }
    for (const mold of molds) {
      const groupId = mold.groupId || '__ungrouped__'
      groupLabels[groupId] ??=
        mold.groupName ||
        (locale.startsWith('zh') ? '未知分组' : 'Unknown group')
      ;(groupedMolds[groupId] ??= []).push(mold)
    }
    const groupIds = Object.keys(groupedMolds)
      .filter(
        (groupId) =>
          !normalizedSearch ||
          [
            groupLabels[groupId],
            ...(groupToProducts[groupId] ?? []),
            ...groupedMolds[groupId].flatMap((mold) => [mold.sn, mold.name]),
          ].some((value) => value.toLowerCase().includes(normalizedSearch))
      )
      .sort((left, right) =>
        groupLabels[left].localeCompare(groupLabels[right])
      )
    return { groupIds, groupLabels, groupedMolds, groupToProducts }
  }, [molds, products, directoryQuery.data, searchTerm, locale])
  return {
    ...groupedLibrary,
    isLoadingProducts: isLoading,
    groupDirectoryError: directoryQuery.error,
    allProducts: products,
  }
}
