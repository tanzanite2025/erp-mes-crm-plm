import { useEffect, useMemo } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
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
import { quoteQueryKeys } from '@/features/quotes/query-keys'
import { useGetCustomers } from '@/features/trading/customer'
import type { Customer } from '@/features/trading/data/schema'
import { useSalesOrderDrawingOptions } from '@/features/trading/hooks/use-sales-order-drawing-options'
import { useSalesOrderForm } from '@/features/trading/hooks/use-sales-order-form'
import { useSalesOrderMutations } from '@/features/trading/sales'
import { auditUtils } from '@/lib/audit-utils'
import { createLogger } from '@/lib/logger'
import { type CompositeReadResource, resolveQueryFailure } from '@/lib/read-resource'
import { failLoudly } from '@/lib/safe-catch'

const logger = createLogger('useQuoteWorkspaceSalesOrderAdapter')

type QuoteCreateResourcesReadResource = CompositeReadResource<{
  customers: Customer[]
  products: Product[]
  units: Unit[]
  appearances: ProductAppearance[]
  drillingPlans: DrillingPlan[]
  labelingPlans: LabelingDraft[]
}>

export function useQuoteWorkspaceSalesOrderAdapter(open: boolean, onCreated: (quoteId: string) => void) {
  const queryClient = useQueryClient()
  const customersQuery = useGetCustomers({ enabled: open })
  const productsQuery = useGetProducts({ enabled: open })
  const { readResource: unitsResource, refetch: refetchUnits } = useUnitsQuery({ enabled: open })
  const appearancesQuery = useQuery({
    queryKey: PRODUCT_APPEARANCES_QUERY_KEY,
    queryFn: () => productAppearanceService.getProductAppearances(),
    enabled: open,
  })
  const drillingQuery = useQuery({
    queryKey: ENGINEERING_DB_DRILLING_QUERY_KEY,
    queryFn: () => ProductionDBService.getDrilling(),
    enabled: open,
  })
  const labelingQuery = useQuery({
    queryKey: ENGINEERING_DB_LABELING_QUERY_KEY,
    queryFn: () => ProductionDBService.getLabeling(),
    enabled: open,
  })

  const createResource = useMemo<QuoteCreateResourcesReadResource>(() => {
    if (!open) {
      return {
        status: 'ready',
        customers: [],
        products: [],
        units: [],
        appearances: [],
        drillingPlans: [],
        labelingPlans: [],
      }
    }

    const customersFailure = resolveQueryFailure({
      data: customersQuery.data,
      error: customersQuery.error,
      isPending: customersQuery.isPending,
      scope: 'useQuoteWorkspaceSalesOrderAdapter.customers',
      missingMessage: '[CRITICAL] Quote create customers missing after load',
      failureMessage: '[CRITICAL] Quote create customers query failed',
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
      scope: 'useQuoteWorkspaceSalesOrderAdapter.products',
      missingMessage: '[CRITICAL] Quote create products missing after load',
      failureMessage: '[CRITICAL] Quote create products query failed',
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

    const appearancesFailure = resolveQueryFailure({
      data: appearancesQuery.data,
      error: appearancesQuery.error,
      isPending: appearancesQuery.isPending,
      scope: 'useQuoteWorkspaceSalesOrderAdapter.appearances',
      missingMessage: '[CRITICAL] Quote create appearances missing after load',
      failureMessage: '[CRITICAL] Quote create appearances query failed',
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
      scope: 'useQuoteWorkspaceSalesOrderAdapter.drilling',
      missingMessage: '[CRITICAL] Quote create drilling plans missing after load',
      failureMessage: '[CRITICAL] Quote create drilling plans query failed',
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
      scope: 'useQuoteWorkspaceSalesOrderAdapter.labeling',
      missingMessage: '[CRITICAL] Quote create labeling drafts missing after load',
      failureMessage: '[CRITICAL] Quote create labeling drafts query failed',
    })
    if (labelingFailure) {
      return {
        status: 'error',
        error: labelingFailure.error,
        scope: labelingFailure.scope,
      }
    }

    if (
      customersQuery.isPending ||
      productsQuery.isPending ||
      unitsResource.status === 'loading' ||
      appearancesQuery.isPending ||
      drillingQuery.isPending ||
      labelingQuery.isPending
    ) {
      return { status: 'loading' }
    }

    return {
      status: 'ready',
      customers: customersQuery.data as Customer[],
      products: productsQuery.data as Product[],
      units: unitsResource.status === 'ready' ? unitsResource.data : [],
      appearances: appearancesQuery.data as ProductAppearance[],
      drillingPlans: drillingQuery.data as DrillingPlan[],
      labelingPlans: labelingQuery.data as LabelingDraft[],
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
    labelingQuery.data,
    labelingQuery.error,
    labelingQuery.isPending,
    open,
    productsQuery.data,
    productsQuery.error,
    productsQuery.isPending,
    unitsResource,
  ])

  useEffect(() => {
    if (createResource.status !== 'error') {
      return
    }

    logger.error(`Failed to load quote create resources: ${createResource.scope}`, createResource.error)
    failLoudly(createResource.error, createResource.scope)
  }, [createResource])

  const customers = useMemo(
    () => (createResource.status === 'ready' ? createResource.customers : []),
    [createResource]
  )
  const products = useMemo(
    () => (createResource.status === 'ready' ? createResource.products : []),
    [createResource]
  )
  const units = useMemo(
    () => (createResource.status === 'ready' ? createResource.units : []),
    [createResource]
  )
  const appearances = useMemo(
    () => (createResource.status === 'ready' ? createResource.appearances : []),
    [createResource]
  )
  const drillingOptions = useSalesOrderDrawingOptions(
    createResource.status === 'ready' ? createResource.drillingPlans : undefined
  )
  const labelingOptions = useSalesOrderDrawingOptions(
    createResource.status === 'ready' ? createResource.labelingPlans : undefined
  )
  const {
    formData,
    setFormData,
    handleClassificationChange,
    handleAddLine,
    handleRemoveLine,
    updateLine,
    validate,
    prepareToSave,
  } = useSalesOrderForm(undefined, open, products)
  const { createMutation } = useSalesOrderMutations()

  const createQuote = async () => {
    if (createResource.status !== 'ready') {
      return
    }

    if (!validate()) {
      return
    }

    const finalData = await prepareToSave()
    if (!finalData) {
      return
    }

    const stampedData = auditUtils.stamp(finalData, 'create')
    const created = await createMutation.mutateAsync(stampedData)
    await queryClient.invalidateQueries({ queryKey: quoteQueryKeys.all() })
    onCreated(created.id)
  }

  const createResources = useMemo(
    () => ({
      customers,
      products,
      appearances,
      units,
      drillingOptions,
      labelingOptions,
    }),
    [appearances, customers, drillingOptions, labelingOptions, products, units]
  )

  return {
    quoteDraft: formData,
    updateQuoteDraft: setFormData,
    changeQuoteClassification: handleClassificationChange,
    addQuoteLine: handleAddLine,
    removeQuoteLine: handleRemoveLine,
    updateQuoteLine: updateLine,
    createResources,
    createResource,
    createQuote,
    isCreatingQuote: createMutation.isPending,
    createQuoteError: createMutation.error instanceof Error ? createMutation.error.message : null,
    retryCreateResources: async () => {
      await Promise.all([
        customersQuery.refetch(),
        productsQuery.refetch(),
        refetchUnits(),
        appearancesQuery.refetch(),
        drillingQuery.refetch(),
        labelingQuery.refetch(),
      ])
    },
  }
}
