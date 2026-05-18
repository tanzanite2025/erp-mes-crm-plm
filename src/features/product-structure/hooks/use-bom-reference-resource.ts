'use client'

import { useEffect, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useLanguage } from '@/context/language-provider'
import { createLogger } from '@/lib/logger'
import { type CompositeReadResource, resolveQueryFailure } from '@/lib/read-resource'
import { failLoudly } from '@/lib/safe-catch'
import { buildProductDisplayMapsV2 } from '@/features/engineering/display/product-display-v2-map'
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

/**
 * 资源组键。一组键对应"一类引用资源 + 它内部全部依赖 query 的开关"。
 *
 * 选择 `'products'` 会同时启用 products / productTemplates / productTypes /
 * productAttributeCategories / productAttributeOptions 5 个 query —— 因为
 * productDisplayLabelMap 的构造需要这 4 张属性表才能正确派生 label。
 */
export type BOMReferenceResourceKey = 'products' | 'materials' | 'sections'

/**
 * 全部资源组的常量数组。新增"全集"消费方使用此常量，
 * 等价于旧版 useBOMReferenceResource（无 include 参数）行为。
 */
export const ALL_BOM_REFERENCES = [
  'products',
  'materials',
  'sections',
] as const satisfies readonly BOMReferenceResourceKey[]

/**
 * 全部可能字段的并集。useBOMFormOptions 等"全集"消费方仍以此为类型。
 */
export type BOMReferenceResourceFields = {
  products: Product[]
  productDisplayLabelMap: Map<string, string>
  materials: MaterialOption[]
  sections: BOMSectionOption[]
  productTemplates: ProductTemplate[]
  productTypes: ProductType[]
  productAttributeCategories: ProductAttributeCategory[]
  productAttributeOptions: ProductAttributeOption[]
}

/**
 * 按 include 数组派生 ready 状态承诺的字段子集。
 *
 * - include 中含 `'products'` → 暴露 products + productDisplayLabelMap +
 *   productTemplates + productTypes + productAttributeCategories + productAttributeOptions
 * - include 中含 `'materials'` → 暴露 materials
 * - include 中含 `'sections'` → 暴露 sections
 */
export type BOMReferenceResourceFor<K extends BOMReferenceResourceKey> =
  & ('products' extends K
    ? Pick<
      BOMReferenceResourceFields,
      'products' | 'productDisplayLabelMap' | 'productTemplates' | 'productTypes' | 'productAttributeCategories' | 'productAttributeOptions'
    >
    : object)
  & ('materials' extends K ? Pick<BOMReferenceResourceFields, 'materials'> : object)
  & ('sections' extends K ? Pick<BOMReferenceResourceFields, 'sections'> : object)

/**
 * 全集消费方使用的类型别名，等价于 BOMReferenceResourceFor<BOMReferenceResourceKey>。
 * 等同于 BOMReferenceResourceFields，保留以便向后兼容。
 */
export type BOMReferenceResource = CompositeReadResource<BOMReferenceResourceFields>

interface UseBOMReferenceResourceParams<K extends BOMReferenceResourceKey> {
  /**
   * 要加载的资源组列表。未列出的组对应的 query 不会触发，并且 ready 类型上不暴露其字段。
   * 默认 ALL_BOM_REFERENCES（向后兼容旧调用方"全部加载"行为）。
   */
  include?: readonly K[]
  enabled?: boolean
}

/**
 * BOM 引用资源（按需加载）。
 *
 * 历史上本 hook 是"无差别加载 7 个 query"，导致 Diff 弹窗、表格视图等
 * 仅需 1-2 个资源的场景也得拉全集。本版本支持 include 数组选择性加载，
 * 同时保持旧调用方（不传 include）的行为不变。
 */
export function useBOMReferenceResource<K extends BOMReferenceResourceKey = BOMReferenceResourceKey>(
  params: UseBOMReferenceResourceParams<K> = {}
): CompositeReadResource<BOMReferenceResourceFor<K>> {
  const { include = ALL_BOM_REFERENCES as unknown as readonly K[], enabled = true } = params
  const includeSet = useMemo(() => new Set<BOMReferenceResourceKey>(include), [include])
  const wantProducts = includeSet.has('products')
  const wantMaterials = includeSet.has('materials')
  const wantSections = includeSet.has('sections')

  const { locale } = useLanguage()

  const productsQuery = useQuery({
    queryKey: productOptionsQueryKey(),
    queryFn: () => ProductCoreService.getProducts({ isOptions: true }),
    enabled: enabled && wantProducts,
  })
  const materialsQuery = useQuery({
    queryKey: MATERIAL_OPTIONS_QUERY_KEY,
    queryFn: () => MaterialCoreService.getMaterialOptions(),
    enabled: enabled && wantMaterials,
  })
  const productTemplatesQuery = useQuery({
    queryKey: PRODUCT_TEMPLATES_QUERY_KEY,
    queryFn: () => productTemplateService.getTemplates(),
    enabled: enabled && wantProducts,
  })
  const productTypesQuery = useQuery({
    queryKey: PRODUCT_TYPES_QUERY_KEY,
    queryFn: () => ProductTypeService.getProductTypes(),
    enabled: enabled && wantProducts,
  })
  const productAttributeCategoriesQuery = useQuery({
    queryKey: PRODUCT_ATTRIBUTE_CATEGORIES_QUERY_KEY,
    queryFn: () => ProductAttributeCategoryService.getProductAttributeCategories({ activeOnly: true }),
    enabled: enabled && wantProducts,
  })
  const productAttributeOptionsQuery = useQuery({
    queryKey: PRODUCT_ATTRIBUTE_OPTIONS_QUERY_KEY,
    queryFn: () => ProductAttributeOptionService.getProductAttributeOptions({ activeOnly: true }),
    enabled: enabled && wantProducts,
  })
  const sectionsQuery = useBOMSectionOptions(enabled && wantSections)

  const resource = useMemo<CompositeReadResource<BOMReferenceResourceFor<K>>>(() => {
    if (wantProducts) {
      const productsFailure = resolveQueryFailure({
        data: productsQuery.data,
        error: productsQuery.error,
        isPending: productsQuery.isPending,
        scope: 'useBOMReferenceResource.products',
        missingMessage: '[CRITICAL] Missing BOM reference products query data',
        failureMessage: '[CRITICAL] BOM reference products query failed',
      })
      if (productsFailure) {
        return { status: 'error', error: productsFailure.error, scope: productsFailure.scope }
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
        return { status: 'error', error: productTemplatesFailure.error, scope: productTemplatesFailure.scope }
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
        return { status: 'error', error: productTypesFailure.error, scope: productTypesFailure.scope }
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
        return { status: 'error', error: productAttributeCategoriesFailure.error, scope: productAttributeCategoriesFailure.scope }
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
        return { status: 'error', error: productAttributeOptionsFailure.error, scope: productAttributeOptionsFailure.scope }
      }
    }

    if (wantMaterials) {
      const materialsFailure = resolveQueryFailure({
        data: materialsQuery.data,
        error: materialsQuery.error,
        isPending: materialsQuery.isPending,
        scope: 'useBOMReferenceResource.materials',
        missingMessage: '[CRITICAL] Missing BOM reference materials query data',
        failureMessage: '[CRITICAL] BOM reference materials query failed',
      })
      if (materialsFailure) {
        return { status: 'error', error: materialsFailure.error, scope: materialsFailure.scope }
      }
    }

    if (wantSections) {
      const sectionsFailure = resolveQueryFailure({
        data: sectionsQuery.data,
        error: sectionsQuery.error,
        isPending: sectionsQuery.isPending,
        scope: 'useBOMReferenceResource.sections',
        missingMessage: '[CRITICAL] Missing BOM reference sections query data',
        failureMessage: '[CRITICAL] BOM reference sections query failed',
      })
      if (sectionsFailure) {
        return { status: 'error', error: sectionsFailure.error, scope: sectionsFailure.scope }
      }
    }

    const isStillLoading
      = (wantProducts && (productsQuery.isPending || productTemplatesQuery.isPending || productTypesQuery.isPending || productAttributeCategoriesQuery.isPending || productAttributeOptionsQuery.isPending))
      || (wantMaterials && materialsQuery.isPending)
      || (wantSections && sectionsQuery.isPending)
    if (isStillLoading) {
      return { status: 'loading' }
    }

    const ready: Partial<BOMReferenceResourceFields> = {}

    if (wantProducts) {
      const products = productsQuery.data as Product[]
      const productTemplates = productTemplatesQuery.data as ProductTemplate[]
      const productTypes = productTypesQuery.data as ProductType[]
      const productAttributeCategories = productAttributeCategoriesQuery.data as ProductAttributeCategory[]
      const productAttributeOptions = productAttributeOptionsQuery.data as ProductAttributeOption[]
      const { productDisplayLabelMap } = buildProductDisplayMapsV2({
        locale,
        products,
        productTemplates,
        productTypes,
        productAttributeCategories,
        productAttributeOptions,
      })
      ready.products = products
      ready.productDisplayLabelMap = productDisplayLabelMap
      ready.productTemplates = productTemplates
      ready.productTypes = productTypes
      ready.productAttributeCategories = productAttributeCategories
      ready.productAttributeOptions = productAttributeOptions
    }

    if (wantMaterials) {
      ready.materials = materialsQuery.data as MaterialOption[]
    }

    if (wantSections) {
      ready.sections = sectionsQuery.data as BOMSectionOption[]
    }

    return {
      status: 'ready',
      ...(ready as unknown as BOMReferenceResourceFor<K>),
    }
  }, [
    locale,
    wantProducts,
    wantMaterials,
    wantSections,
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
