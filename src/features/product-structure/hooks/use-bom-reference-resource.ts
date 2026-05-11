'use client'

import { useEffect, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useLanguage } from '@/context/language-provider'
import { createLogger } from '@/lib/logger'
import { type CompositeReadResource, resolveQueryFailure } from '@/lib/read-resource'
import { failLoudly } from '@/lib/safe-catch'
import { resolveProductDisplayV2 } from '@/features/engineering/display/product-display-v2'
import { resolveProductDisplayMetadataV2 } from '@/features/engineering/display/product-display-v2-metadata'
import {
  PRODUCT_ATTRIBUTE_CATEGORIES_QUERY_KEY,
  PRODUCT_ATTRIBUTE_OPTIONS_QUERY_KEY,
  PRODUCT_TEMPLATES_QUERY_KEY,
  PRODUCT_TYPES_QUERY_KEY,
  productOptionsQueryKey,
} from '@/features/engineering/query-keys'
import { ProductAttributeCategoryService } from '@/features/engineering/services/product-attribute-category-service'
import { ProductAttributeOptionService } from '@/features/engineering/services/product-attribute-option-service'
import { ProductCoreService } from '@/features/engineering/services/product-core-service'
import { productTemplateService } from '@/features/engineering/services/product-template-service'
import { ProductTypeService } from '@/features/engineering/services/product-type-service'
import {
  type ProductAttributeCategory,
  type ProductAttributeOption,
  type ProductTemplate,
  type ProductType,
} from '@/features/engineering/data/schema'
import { type MaterialOption } from '../../material-archive/data/schema'
import { MATERIAL_OPTIONS_QUERY_KEY } from '../../material-archive/query-keys'
import { MaterialCoreService } from '../../material-archive/services/material-core-service'
import { type BOMSectionOption } from '../data/bom-section-schema'
import { type Product } from '../data/schema'
import { useBOMSectionOptions } from './use-bom-section-config'

const logger = createLogger('useBOMReferenceResource')

export type BOMReferenceResource = CompositeReadResource<{
  products: Product[]
  productDisplayLabelMap: Map<string, string>
  materials: MaterialOption[]
  sections: BOMSectionOption[]
  productTemplates: ProductTemplate[]
  productTypes: ProductType[]
  productAttributeCategories: ProductAttributeCategory[]
  productAttributeOptions: ProductAttributeOption[]
}>

interface UseBOMReferenceResourceParams {
  enabled?: boolean
}

export function useBOMReferenceResource({ enabled = true }: UseBOMReferenceResourceParams = {}): BOMReferenceResource {
  const { locale } = useLanguage()
  const productsQuery = useQuery({
    queryKey: productOptionsQueryKey(),
    queryFn: () => ProductCoreService.getProducts({ isOptions: true }),
    enabled,
  })
  const materialsQuery = useQuery({
    queryKey: MATERIAL_OPTIONS_QUERY_KEY,
    queryFn: () => MaterialCoreService.getMaterialOptions(),
    enabled,
  })
  const productTemplatesQuery = useQuery({
    queryKey: PRODUCT_TEMPLATES_QUERY_KEY,
    queryFn: () => productTemplateService.getTemplates(),
    enabled,
  })
  const productTypesQuery = useQuery({
    queryKey: PRODUCT_TYPES_QUERY_KEY,
    queryFn: () => ProductTypeService.getProductTypes(),
    enabled,
  })
  const productAttributeCategoriesQuery = useQuery({
    queryKey: PRODUCT_ATTRIBUTE_CATEGORIES_QUERY_KEY,
    queryFn: () => ProductAttributeCategoryService.getProductAttributeCategories({ activeOnly: true }),
    enabled,
  })
  const productAttributeOptionsQuery = useQuery({
    queryKey: PRODUCT_ATTRIBUTE_OPTIONS_QUERY_KEY,
    queryFn: () => ProductAttributeOptionService.getProductAttributeOptions({ activeOnly: true }),
    enabled,
  })
  const sectionsQuery = useBOMSectionOptions(enabled)

  const resource = useMemo<BOMReferenceResource>(() => {
    const productsFailure = resolveQueryFailure({
      data: productsQuery.data,
      error: productsQuery.error,
      isPending: productsQuery.isPending,
      scope: 'useBOMReferenceResource.products',
      missingMessage: '[CRITICAL] Missing BOM reference products query data',
      failureMessage: '[CRITICAL] BOM reference products query failed',
    })
    if (productsFailure) {
      return {
        status: 'error',
        error: productsFailure.error,
        scope: productsFailure.scope,
      }
    }

    const materialsFailure = resolveQueryFailure({
      data: materialsQuery.data,
      error: materialsQuery.error,
      isPending: materialsQuery.isPending,
      scope: 'useBOMReferenceResource.materials',
      missingMessage: '[CRITICAL] Missing BOM reference materials query data',
      failureMessage: '[CRITICAL] BOM reference materials query failed',
    })
    if (materialsFailure) {
      return {
        status: 'error',
        error: materialsFailure.error,
        scope: materialsFailure.scope,
      }
    }

    const productTemplatesFailure = resolveQueryFailure({
      data: productTemplatesQuery.data,
      error: productTemplatesQuery.error,
      isPending: productTemplatesQuery.isPending,
      scope: 'useBOMReferenceResource.productTemplates',
      missingMessage: '[CRITICAL] Missing BOM reference product templates query data',
      failureMessage: '[CRITICAL] BOM reference product templates query failed',
    })
    if (productTemplatesFailure) {
      return {
        status: 'error',
        error: productTemplatesFailure.error,
        scope: productTemplatesFailure.scope,
      }
    }

    const productTypesFailure = resolveQueryFailure({
      data: productTypesQuery.data,
      error: productTypesQuery.error,
      isPending: productTypesQuery.isPending,
      scope: 'useBOMReferenceResource.productTypes',
      missingMessage: '[CRITICAL] Missing BOM reference product types query data',
      failureMessage: '[CRITICAL] BOM reference product types query failed',
    })
    if (productTypesFailure) {
      return {
        status: 'error',
        error: productTypesFailure.error,
        scope: productTypesFailure.scope,
      }
    }

    const productAttributeCategoriesFailure = resolveQueryFailure({
      data: productAttributeCategoriesQuery.data,
      error: productAttributeCategoriesQuery.error,
      isPending: productAttributeCategoriesQuery.isPending,
      scope: 'useBOMReferenceResource.productAttributeCategories',
      missingMessage: '[CRITICAL] Missing BOM reference product attribute categories query data',
      failureMessage: '[CRITICAL] BOM reference product attribute categories query failed',
    })
    if (productAttributeCategoriesFailure) {
      return {
        status: 'error',
        error: productAttributeCategoriesFailure.error,
        scope: productAttributeCategoriesFailure.scope,
      }
    }

    const productAttributeOptionsFailure = resolveQueryFailure({
      data: productAttributeOptionsQuery.data,
      error: productAttributeOptionsQuery.error,
      isPending: productAttributeOptionsQuery.isPending,
      scope: 'useBOMReferenceResource.productAttributeOptions',
      missingMessage: '[CRITICAL] Missing BOM reference product attribute options query data',
      failureMessage: '[CRITICAL] BOM reference product attribute options query failed',
    })
    if (productAttributeOptionsFailure) {
      return {
        status: 'error',
        error: productAttributeOptionsFailure.error,
        scope: productAttributeOptionsFailure.scope,
      }
    }

    const sectionsFailure = resolveQueryFailure({
      data: sectionsQuery.data,
      error: sectionsQuery.error,
      isPending: sectionsQuery.isPending,
      scope: 'useBOMReferenceResource.sections',
      missingMessage: '[CRITICAL] Missing BOM reference sections query data',
      failureMessage: '[CRITICAL] BOM reference sections query failed',
    })
    if (sectionsFailure) {
      return {
        status: 'error',
        error: sectionsFailure.error,
        scope: sectionsFailure.scope,
      }
    }

    if (
      productsQuery.isPending
      || materialsQuery.isPending
      || productTemplatesQuery.isPending
      || productTypesQuery.isPending
      || productAttributeCategoriesQuery.isPending
      || productAttributeOptionsQuery.isPending
      || sectionsQuery.isPending
    ) {
      return { status: 'loading' }
    }

    const products = productsQuery.data as Product[]
    const productTemplates = productTemplatesQuery.data as ProductTemplate[]
    const productTypes = productTypesQuery.data as ProductType[]
    const productAttributeCategories = productAttributeCategoriesQuery.data as ProductAttributeCategory[]
    const productAttributeOptions = productAttributeOptionsQuery.data as ProductAttributeOption[]
    const productDisplayLabelMap = new Map(
      products.map((product) => {
        const displayMetadata = resolveProductDisplayMetadataV2({
          locale,
          product,
          templates: productTemplates,
          productTypes,
          categories: productAttributeCategories,
          options: productAttributeOptions,
        })
        const displayProjection = displayMetadata.projection ?? resolveProductDisplayV2({
          locale,
          product,
        })

        return [product.id, displayProjection.fullLabel]
      })
    )

    return {
      status: 'ready',
      products,
      productDisplayLabelMap,
      materials: materialsQuery.data as MaterialOption[],
      productTemplates,
      productTypes,
      productAttributeCategories,
      productAttributeOptions,
      sections: sectionsQuery.data as BOMSectionOption[],
    }
  }, [
    locale,
    materialsQuery.data,
    materialsQuery.error,
    materialsQuery.isPending,
    productAttributeCategoriesQuery.data,
    productAttributeCategoriesQuery.error,
    productAttributeCategoriesQuery.isPending,
    productAttributeOptionsQuery.data,
    productAttributeOptionsQuery.error,
    productAttributeOptionsQuery.isPending,
    productsQuery.data,
    productsQuery.error,
    productsQuery.isPending,
    productTemplatesQuery.data,
    productTemplatesQuery.error,
    productTemplatesQuery.isPending,
    productTypesQuery.data,
    productTypesQuery.error,
    productTypesQuery.isPending,
    sectionsQuery.data,
    sectionsQuery.error,
    sectionsQuery.isPending,
  ])

  useEffect(() => {
    if (resource.status !== 'error') {
      return
    }

    logger.error(`BOM reference resource failed: ${resource.scope}`, resource.error)
    failLoudly(resource.error, resource.scope)
  }, [resource])

  return resource
}
