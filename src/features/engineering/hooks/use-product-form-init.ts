import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { isNotFoundError } from '@/lib/error-status'
import { useLanguage } from '@/context/language-provider'
import { createTechnicalSpecificationDocumentMasterLibraryListQueryOptions } from '@/features/engineering-db/queries/technical-specification-document-master-library-query-options'
import { createMoldGroupMasterDirectoryQueryOptions } from '@/features/equipment-tooling/queries/mold-group-master-directory-query-options'
import {
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
    ...createMoldGroupMasterDirectoryQueryOptions(),
    enabled: open,
  })

  const specsQuery = useQuery({
    ...createTechnicalSpecificationDocumentMasterLibraryListQueryOptions(),
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

  const attributeCategories = categoriesQuery.data
  const attributeOptions = optionsQuery.data

  const moldOptions = useMemo(() => {
    if (!moldGroupsQuery.data) return []
    return moldGroupsQuery.data.map((group) => ({
      label: group.name,
      value: group.id,
      active: group.active,
    }))
  }, [moldGroupsQuery.data])
  const specOptions = useMemo(() => {
    if (!specsQuery.data) return []
    return specsQuery.data.map((spec) => ({
      label: spec.revisionNo ? `${spec.name} (${spec.revisionNo})` : spec.name,
      value: spec.id,
    }))
  }, [specsQuery.data])
  const metadataInitError = useMemo(() => {
    const error =
      categoriesQuery.error ??
      optionsQuery.error ??
      moldGroupsQuery.error ??
      specsQuery.error
    if (!error) {
      return null
    }

    return isNotFoundError(error)
      ? t('engineering.productMgmt.metadata.unavailable')
      : error instanceof Error
        ? error.message
        : t('engineering.productMgmt.metadata.initFailed')
  }, [
    categoriesQuery.error,
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
    specsQuery.isSuccess

  return {
    attributeCategories,
    attributeOptions,
    moldOptions,
    specOptions,
    metadataInitError,
    metadataReady,
  }
}
