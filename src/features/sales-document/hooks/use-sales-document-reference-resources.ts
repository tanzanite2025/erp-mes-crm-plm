import { useEffect, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useLanguage } from '@/context/language-provider'
import { useUnitsQuery } from '@/features/basic-settings/hooks/use-units-query'
import type { Unit } from '@/features/basic-settings/services/unit-service'
import {
  ENGINEERING_DB_DRILLING_QUERY_KEY,
  ENGINEERING_DB_LABELING_QUERY_KEY,
  ENGINEERING_DB_SPECS_QUERY_KEY,
} from '@/features/engineering-db/query-keys'
import type { DrillingPlan, LabelingDraft, TechnicalSpec } from '@/features/engineering-db/data/schema'
import { SpecsService } from '@/features/engineering-db/services/specs-service'
import { ProductionDBService } from '@/features/engineering-db/services/production-db-service'
import {
  type ProductDisplayProjectionV2,
} from '@/features/engineering/display/product-display-v2'
import { buildProductDisplayMapsV2 } from '@/features/engineering/display/product-display-v2-map'
import type { ProductAppearance } from '@/features/engineering/data/product-appearance'
import type {
  Product,
  ProductAttributeCategory,
  ProductAttributeOption,
  ProductTemplate,
  ProductType,
} from '@/features/engineering/data/schema'
import { useGetProducts } from '@/features/engineering/hooks/use-products'
import {
  PRODUCT_APPEARANCES_QUERY_KEY,
  PRODUCT_ATTRIBUTE_CATEGORIES_QUERY_KEY,
  PRODUCT_ATTRIBUTE_OPTIONS_QUERY_KEY,
  PRODUCT_TEMPLATES_QUERY_KEY,
  PRODUCT_TYPES_QUERY_KEY,
} from '@/features/engineering/query-keys'
import { ProductAttributeCategoryService } from '@/features/engineering/services/product-attribute-category-service'
import { ProductAttributeOptionService } from '@/features/engineering/services/product-attribute-option-service'
import { productAppearanceService } from '@/features/engineering/services/product-appearance-service'
import { productTemplateService } from '@/features/engineering/services/product-template-service'
import { ProductTypeService } from '@/features/engineering/services/product-type-service'
import { useGetCustomers } from '@/features/trading/customer'
import type { Customer } from '@/features/trading/data/schema'
import { createLogger } from '@/lib/logger'
import { type CompositeReadResource, resolveQueryFailure } from '@/lib/read-resource'
import { failLoudly } from '@/lib/safe-catch'

const logger = createLogger('useSalesDocumentReferenceResources')

export type SalesDocumentDrawingOption = {
  label: string
  value: string
}

export type SalesDocumentReferenceData = {
  customers: Customer[]
  products: Product[]
  engineeringSpecs: TechnicalSpec[]
  productDisplayLabelMap: Map<string, string>
  productDisplayProjectionMap: Map<string, ProductDisplayProjectionV2>
  units: Unit[]
  appearances: ProductAppearance[]
  drillingPlans: DrillingPlan[]
  labelingPlans: LabelingDraft[]
  drillingOptions: SalesDocumentDrawingOption[]
  labelingOptions: SalesDocumentDrawingOption[]
}

export type SalesDocumentReferenceResource = CompositeReadResource<SalesDocumentReferenceData>

type OptionalResourceMode = 'best-effort' | 'blocking'

type UseSalesDocumentReferenceResourcesOptions = {
  enabled?: boolean
  scope: string
  optionalResourceMode?: OptionalResourceMode
}

const EMPTY_SALES_DOCUMENT_REFERENCE_DATA: SalesDocumentReferenceData = {
  customers: [],
  products: [],
  engineeringSpecs: [],
  productDisplayLabelMap: new Map<string, string>(),
  productDisplayProjectionMap: new Map<string, ProductDisplayProjectionV2>(),
  units: [],
  appearances: [],
  drillingPlans: [],
  labelingPlans: [],
  drillingOptions: [],
  labelingOptions: [],
}

function buildDrawingOptions(items: Array<{ id: string; name: string }>): SalesDocumentDrawingOption[] {
  return items.map((item) => ({ label: item.name, value: item.id }))
}

export function useSalesDocumentReferenceResources(
  options: UseSalesDocumentReferenceResourcesOptions
) {
  const { locale } = useLanguage()
  const {
    enabled = true,
    scope,
    optionalResourceMode = 'best-effort',
  } = options

  const customersQuery = useGetCustomers({ enabled })
  const productsQuery = useGetProducts({ enabled })
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
  const { readResource: unitsResource, refetch: refetchUnits } = useUnitsQuery({ enabled })
  const appearancesQuery = useQuery({
    queryKey: PRODUCT_APPEARANCES_QUERY_KEY,
    queryFn: () => productAppearanceService.getProductAppearances(),
    enabled,
  })
  const drillingQuery = useQuery({
    queryKey: ENGINEERING_DB_DRILLING_QUERY_KEY,
    queryFn: () => ProductionDBService.getDrilling(),
    enabled,
  })
  const labelingQuery = useQuery({
    queryKey: ENGINEERING_DB_LABELING_QUERY_KEY,
    queryFn: () => ProductionDBService.getLabeling(),
    enabled,
  })
  const specsQuery = useQuery({
    queryKey: ENGINEERING_DB_SPECS_QUERY_KEY,
    queryFn: () => SpecsService.getSpecs(),
    enabled,
  })

  const readResource = useMemo<SalesDocumentReferenceResource>(() => {
    if (!enabled) {
      return {
        status: 'ready',
        ...EMPTY_SALES_DOCUMENT_REFERENCE_DATA,
      }
    }

    const customersFailure = resolveQueryFailure({
      data: customersQuery.data,
      error: customersQuery.error,
      isPending: customersQuery.isPending,
      scope: `${scope}.customers`,
      missingMessage: `[CRITICAL] ${scope} customers missing after load`,
      failureMessage: `[CRITICAL] ${scope} customers query failed`,
    })
    if (customersFailure) {
      return {
        status: 'error',
        error: customersFailure.error,
        scope: customersFailure.scope,
      }
    }

    const productsFailure = resolveQueryFailure({
      data: productsQuery.data,
      error: productsQuery.error,
      isPending: productsQuery.isPending,
      scope: `${scope}.products`,
      missingMessage: `[CRITICAL] ${scope} products missing after load`,
      failureMessage: `[CRITICAL] ${scope} products query failed`,
    })
    if (productsFailure) {
      return {
        status: 'error',
        error: productsFailure.error,
        scope: productsFailure.scope,
      }
    }

    const productTemplatesFailure = resolveQueryFailure({
      data: productTemplatesQuery.data,
      error: productTemplatesQuery.error,
      isPending: productTemplatesQuery.isPending,
      scope: `${scope}.productTemplates`,
      missingMessage: `[CRITICAL] ${scope} product templates missing after load`,
      failureMessage: `[CRITICAL] ${scope} product templates query failed`,
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
      scope: `${scope}.productTypes`,
      missingMessage: `[CRITICAL] ${scope} product types missing after load`,
      failureMessage: `[CRITICAL] ${scope} product types query failed`,
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
      scope: `${scope}.productAttributeCategories`,
      missingMessage: `[CRITICAL] ${scope} product attribute categories missing after load`,
      failureMessage: `[CRITICAL] ${scope} product attribute categories query failed`,
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
      scope: `${scope}.productAttributeOptions`,
      missingMessage: `[CRITICAL] ${scope} product attribute options missing after load`,
      failureMessage: `[CRITICAL] ${scope} product attribute options query failed`,
    })
    if (productAttributeOptionsFailure) {
      return {
        status: 'error',
        error: productAttributeOptionsFailure.error,
        scope: productAttributeOptionsFailure.scope,
      }
    }

    const engineeringSpecsFailure = resolveQueryFailure({
      data: specsQuery.data,
      error: specsQuery.error,
      isPending: specsQuery.isPending,
      scope: `${scope}.engineeringSpecs`,
      missingMessage: `[CRITICAL] ${scope} engineering specs missing after load`,
      failureMessage: `[CRITICAL] ${scope} engineering specs query failed`,
    })
    if (engineeringSpecsFailure) {
      return {
        status: 'error',
        error: engineeringSpecsFailure.error,
        scope: engineeringSpecsFailure.scope,
      }
    }

    if (unitsResource.status === 'error') {
      return {
        status: 'error',
        error: unitsResource.error,
        scope: unitsResource.scope,
      }
    }

    if (
      customersQuery.isPending ||
      productsQuery.isPending ||
      productTemplatesQuery.isPending ||
      productTypesQuery.isPending ||
      productAttributeCategoriesQuery.isPending ||
      productAttributeOptionsQuery.isPending ||
      specsQuery.isPending ||
      unitsResource.status === 'loading'
    ) {
      return { status: 'loading' }
    }

    if (optionalResourceMode === 'blocking') {
      const appearancesFailure = resolveQueryFailure({
        data: appearancesQuery.data,
        error: appearancesQuery.error,
        isPending: appearancesQuery.isPending,
        scope: `${scope}.appearances`,
        missingMessage: `[CRITICAL] ${scope} appearances missing after load`,
        failureMessage: `[CRITICAL] ${scope} appearances query failed`,
      })
      if (appearancesFailure) {
        return {
          status: 'error',
          error: appearancesFailure.error,
          scope: appearancesFailure.scope,
        }
      }

      const drillingFailure = resolveQueryFailure({
        data: drillingQuery.data,
        error: drillingQuery.error,
        isPending: drillingQuery.isPending,
        scope: `${scope}.drillingPlans`,
        missingMessage: `[CRITICAL] ${scope} drilling plans missing after load`,
        failureMessage: `[CRITICAL] ${scope} drilling plans query failed`,
      })
      if (drillingFailure) {
        return {
          status: 'error',
          error: drillingFailure.error,
          scope: drillingFailure.scope,
        }
      }

      const labelingFailure = resolveQueryFailure({
        data: labelingQuery.data,
        error: labelingQuery.error,
        isPending: labelingQuery.isPending,
        scope: `${scope}.labelingPlans`,
        missingMessage: `[CRITICAL] ${scope} labeling plans missing after load`,
        failureMessage: `[CRITICAL] ${scope} labeling plans query failed`,
      })
      if (labelingFailure) {
        return {
          status: 'error',
          error: labelingFailure.error,
          scope: labelingFailure.scope,
        }
      }

      if (
        appearancesQuery.isPending ||
        drillingQuery.isPending ||
        labelingQuery.isPending
      ) {
        return { status: 'loading' }
      }
    }

    const appearances = appearancesQuery.error
      ? []
      : ((appearancesQuery.data as ProductAppearance[]) ?? [])
    const drillingPlans = drillingQuery.error
      ? []
      : ((drillingQuery.data as DrillingPlan[]) ?? [])
    const labelingPlans = labelingQuery.error
      ? []
      : ((labelingQuery.data as LabelingDraft[]) ?? [])
    const engineeringSpecs = (specsQuery.data as TechnicalSpec[]) ?? []
    const products = (productsQuery.data as Product[]) ?? []
    const productTemplates = (productTemplatesQuery.data as ProductTemplate[]) ?? []
    const productTypes = (productTypesQuery.data as ProductType[]) ?? []
    const productAttributeCategories =
      (productAttributeCategoriesQuery.data as ProductAttributeCategory[]) ?? []
    const productAttributeOptions =
      (productAttributeOptionsQuery.data as ProductAttributeOption[]) ?? []
    const { productDisplayLabelMap, productDisplayProjectionMap } = buildProductDisplayMapsV2({
      locale,
      products,
      productTemplates,
      productTypes,
      productAttributeCategories,
      productAttributeOptions,
    })

    return {
      status: 'ready',
      customers: (customersQuery.data as Customer[]) ?? [],
      products,
      engineeringSpecs,
      productDisplayLabelMap,
      productDisplayProjectionMap,
      units: unitsResource.status === 'ready' ? unitsResource.data : [],
      appearances,
      drillingPlans,
      labelingPlans,
      drillingOptions: buildDrawingOptions(drillingPlans),
      labelingOptions: buildDrawingOptions(labelingPlans),
    }
  }, [
    appearancesQuery.data,
    appearancesQuery.error,
    appearancesQuery.isPending,
    customersQuery.data,
    customersQuery.error,
    customersQuery.isPending,
    drillingQuery.data,
    drillingQuery.error,
    drillingQuery.isPending,
    enabled,
    locale,
    labelingQuery.data,
    labelingQuery.error,
    labelingQuery.isPending,
    optionalResourceMode,
    specsQuery.data,
    specsQuery.error,
    specsQuery.isPending,
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
    scope,
    unitsResource,
  ])

  useEffect(() => {
    if (readResource.status !== 'error') {
      return
    }

    logger.error(
      `Failed to load sales document reference resources: ${readResource.scope}`,
      readResource.error
    )
    failLoudly(readResource.error, readResource.scope)
  }, [readResource])

  const resources = useMemo<SalesDocumentReferenceData>(
    () => (readResource.status === 'ready' ? readResource : EMPTY_SALES_DOCUMENT_REFERENCE_DATA),
    [readResource]
  )

  const retry = async () => {
    await Promise.all([
      customersQuery.refetch(),
      productsQuery.refetch(),
      productTemplatesQuery.refetch(),
      productTypesQuery.refetch(),
      productAttributeCategoriesQuery.refetch(),
      productAttributeOptionsQuery.refetch(),
      specsQuery.refetch(),
      refetchUnits(),
      appearancesQuery.refetch(),
      drillingQuery.refetch(),
      labelingQuery.refetch(),
    ])
  }

  return {
    readResource,
    resources,
    retry,
  }
}
