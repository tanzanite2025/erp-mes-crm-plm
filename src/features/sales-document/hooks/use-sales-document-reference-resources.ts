import { useEffect, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useUnitsQuery } from '@/features/basic-settings/hooks/use-units-query'
import type { Unit } from '@/features/basic-settings/services/unit-service'
import {
  ENGINEERING_DB_DRILLING_QUERY_KEY,
  ENGINEERING_DB_LABELING_QUERY_KEY,
} from '@/features/engineering-db/query-keys'
import type { DrillingPlan, LabelingDraft } from '@/features/engineering-db/data/schema'
import { ProductionDBService } from '@/features/engineering-db/services/production-db-service'
import type { ProductAppearance } from '@/features/engineering/data/product-appearance'
import type { Product } from '@/features/engineering/data/schema'
import { useGetProducts } from '@/features/engineering/hooks/use-products'
import { PRODUCT_APPEARANCES_QUERY_KEY } from '@/features/engineering/query-keys'
import { productAppearanceService } from '@/features/engineering/services/product-appearance-service'
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
  const {
    enabled = true,
    scope,
    optionalResourceMode = 'best-effort',
  } = options

  const customersQuery = useGetCustomers({ enabled })
  const productsQuery = useGetProducts({ enabled })
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

    return {
      status: 'ready',
      customers: (customersQuery.data as Customer[]) ?? [],
      products: (productsQuery.data as Product[]) ?? [],
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
    labelingQuery.data,
    labelingQuery.error,
    labelingQuery.isPending,
    optionalResourceMode,
    productsQuery.data,
    productsQuery.error,
    productsQuery.isPending,
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
