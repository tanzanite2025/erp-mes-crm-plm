import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { isNotFoundError } from '@/lib/error-status'
import { useLanguage } from '@/context/language-provider'
import { ENGINEERING_DB_SPECS_QUERY_KEY } from '@/features/engineering-db/query-keys'
import { SpecsService } from '@/features/engineering-db/services/specs-service'
import { AssetService } from '@/features/equipment-tooling/services/asset-service'
import { BOMS_QUERY_KEY } from '@/features/product-structure/query-keys'
import { bomService } from '@/features/product-structure/services/bom-service'
import { getCustomers } from '@/features/trading/customer'
import { tradingQueryKeys } from '@/features/trading/query-keys'
import {
  ENGINEERING_PRODUCT_FORM_MOLD_GROUPS_QUERY_KEY,
  PRODUCT_ATTRIBUTE_CATEGORIES_QUERY_KEY,
  PRODUCT_ATTRIBUTE_OPTIONS_QUERY_KEY,
} from '../query-keys'
import { ProductAttributeCategoryService } from '../services/product-attribute-category-service'
import { ProductAttributeOptionService } from '../services/product-attribute-option-service'

interface UseProductFormInitParams {
  open: boolean
}

export function useProductFormInit({ open }: UseProductFormInitParams) {
  const { t } = useLanguage()
  const categoriesQuery = useQuery({
    queryKey: PRODUCT_ATTRIBUTE_CATEGORIES_QUERY_KEY,
    queryFn: () =>
      ProductAttributeCategoryService.getProductAttributeCategories({
        activeOnly: true,
      }),
    enabled: open,
  })

  const optionsQuery = useQuery({
    queryKey: PRODUCT_ATTRIBUTE_OPTIONS_QUERY_KEY,
    queryFn: () =>
      ProductAttributeOptionService.getProductAttributeOptions({
        activeOnly: true,
      }),
    enabled: open,
  })

  const moldGroupsQuery = useQuery({
    queryKey: ENGINEERING_PRODUCT_FORM_MOLD_GROUPS_QUERY_KEY,
    queryFn: () => AssetService.getGroupNames(),
    enabled: open,
  })

  const specsQuery = useQuery({
    queryKey: ENGINEERING_DB_SPECS_QUERY_KEY,
    queryFn: () => SpecsService.getSpecs(),
    enabled: open,
  })

  const bomsQuery = useQuery({
    queryKey: BOMS_QUERY_KEY,
    queryFn: () => bomService.getBOMs(),
    enabled: open,
  })
  const customersQuery = useQuery({
    queryKey: tradingQueryKeys.customers(),
    queryFn: getCustomers,
    enabled: open,
  })

  if (categoriesQuery.isSuccess && !categoriesQuery.data)
    throw new Error('[CRITICAL] Categories Data missing')
  if (optionsQuery.isSuccess && !optionsQuery.data)
    throw new Error('[CRITICAL] Options Data missing')
  if (moldGroupsQuery.isSuccess && !moldGroupsQuery.data)
    throw new Error('[CRITICAL] Mold Groups Data missing')
  if (specsQuery.isSuccess && !specsQuery.data)
    throw new Error('[CRITICAL] Specs Data missing')
  if (bomsQuery.isSuccess && !bomsQuery.data)
    throw new Error('[CRITICAL] BOM Data missing')
  if (customersQuery.isSuccess && !customersQuery.data)
    throw new Error('[CRITICAL] Customers Data missing')

  const attributeCategories = categoriesQuery.data
  const attributeOptions = optionsQuery.data

  const moldOptions = useMemo(() => {
    if (!moldGroupsQuery.data) return []
    return moldGroupsQuery.data.map((group) => ({ label: group, value: group }))
  }, [moldGroupsQuery.data])
  const specOptions = useMemo(() => {
    if (!specsQuery.data) return []
    return specsQuery.data.map((spec) => ({
      label: `${spec.name} (${spec.version})`,
      value: spec.id,
    }))
  }, [specsQuery.data])
  const bomOptions = useMemo(() => {
    if (!bomsQuery.data) return []
    return [...bomsQuery.data]
      .sort((left, right) =>
        (left.bomNo || left.id).localeCompare(right.bomNo || right.id, 'en')
      )
      .map((bom) => ({
        label: [
          bom.bomNo || bom.id,
          bom.bomVersion,
          bom.bomType,
          bom.versionLevel,
        ]
          .filter(Boolean)
          .join(' / '),
        value: bom.id,
      }))
  }, [bomsQuery.data])
  const customerNameMap = useMemo(() => {
    const nextMap = new Map<string, string>()
    for (const customer of customersQuery.data ?? []) {
      nextMap.set(customer.id, customer.name)
    }
    return nextMap
  }, [customersQuery.data])
  const metadataInitError = useMemo(() => {
    const error =
      categoriesQuery.error ??
      optionsQuery.error ??
      moldGroupsQuery.error ??
      specsQuery.error ??
      bomsQuery.error ??
      customersQuery.error
    if (!error) {
      return null
    }

    return isNotFoundError(error)
      ? t('engineering.productMgmt.metadata.unavailable')
      : error instanceof Error
        ? error.message
        : t('engineering.productMgmt.metadata.initFailed')
  }, [
    bomsQuery.error,
    categoriesQuery.error,
    customersQuery.error,
    moldGroupsQuery.error,
    optionsQuery.error,
    specsQuery.error,
    t,
  ])

  const metadataReady =
    open &&
    !metadataInitError &&
    categoriesQuery.isSuccess &&
    optionsQuery.isSuccess &&
    moldGroupsQuery.isSuccess &&
    specsQuery.isSuccess &&
    bomsQuery.isSuccess &&
    customersQuery.isSuccess

  return {
    attributeCategories,
    attributeOptions,
    moldOptions,
    specOptions,
    boms: bomsQuery.data ?? [],
    bomOptions,
    customerNameMap,
    isBomOptionsPending: bomsQuery.isPending,
    metadataInitError,
    metadataReady,
  }
}
