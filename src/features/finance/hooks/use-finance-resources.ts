import { useEffect, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { createLogger } from '@/lib/logger'
import {
  type CompositeReadResource,
  resolveQueryFailure,
} from '@/lib/read-resource'
import { failLoudly } from '@/lib/safe-catch'
import {
  type Currency,
  type PaymentMethod,
  type PaymentTerm,
} from '@/features/finance/data/schema'
import { financeQueryKeys } from '@/features/finance/query-keys'
import { CurrencyCoreService } from '@/features/finance/services/currency-core-service'
import { PaymentMethodCoreService } from '@/features/finance/services/payment-method-core-service'
import { PaymentTermCoreService } from '@/features/finance/services/payment-term-core-service'

const logger = createLogger('useFinanceResources')

type PaymentLikeOrder = {
  paymentMethod?: string
  paymentMethodName?: string
  paymentTerm?: string
  paymentTermName?: string
}

interface UseFinanceResourcesOptions {
  includeCurrencies?: boolean
  includePaymentMethods?: boolean
  includePaymentTerms?: boolean
}

type FinanceOption = {
  value: string
  label: string
}

export type FinanceResourcesReadResource = CompositeReadResource<{
  currencies: Currency[]
  paymentMethods: PaymentMethod[]
  paymentTerms: PaymentTerm[]
}>

export type FinanceFilterOptionsReadResource = CompositeReadResource<{
  paymentMethodOptions: FinanceOption[]
  paymentTermOptions: FinanceOption[]
}>

export function useFinanceResources(
  options: UseFinanceResourcesOptions = {}
) {
  const {
    includeCurrencies = false,
    includePaymentMethods = true,
    includePaymentTerms = true,
  } = options

  const paymentMethodsQuery = useQuery({
    queryKey: financeQueryKeys.paymentMethods(),
    queryFn: () => PaymentMethodCoreService.getPaymentMethods(),
    enabled: includePaymentMethods,
  })

  const paymentTermsQuery = useQuery({
    queryKey: financeQueryKeys.paymentTerms(),
    queryFn: () => PaymentTermCoreService.getPaymentTerms(),
    enabled: includePaymentTerms,
  })

  const currenciesQuery = useQuery({
    queryKey: financeQueryKeys.currencies(),
    queryFn: () => CurrencyCoreService.getCurrencies(),
    enabled: includeCurrencies,
  })

  const readResource = useMemo<FinanceResourcesReadResource>(() => {
    if (includePaymentMethods) {
      const paymentMethodsFailure = resolveQueryFailure({
        data: paymentMethodsQuery.data,
        error: paymentMethodsQuery.error,
        isPending: paymentMethodsQuery.isPending,
        scope: 'useFinanceResources.paymentMethods',
        missingMessage: '[CRITICAL] Trading payment methods missing after load',
        failureMessage: '[CRITICAL] Trading payment methods query failed',
      })
      if (paymentMethodsFailure) {
        return {
          status: 'error',
          error: paymentMethodsFailure.error,
          scope: paymentMethodsFailure.scope,
        }
      }
    }

    if (includePaymentTerms) {
      const paymentTermsFailure = resolveQueryFailure({
        data: paymentTermsQuery.data,
        error: paymentTermsQuery.error,
        isPending: paymentTermsQuery.isPending,
        scope: 'useFinanceResources.paymentTerms',
        missingMessage: '[CRITICAL] Trading payment terms missing after load',
        failureMessage: '[CRITICAL] Trading payment terms query failed',
      })
      if (paymentTermsFailure) {
        return {
          status: 'error',
          error: paymentTermsFailure.error,
          scope: paymentTermsFailure.scope,
        }
      }
    }

    if (includeCurrencies) {
      const currenciesFailure = resolveQueryFailure({
        data: currenciesQuery.data,
        error: currenciesQuery.error,
        isPending: currenciesQuery.isPending,
        scope: 'useFinanceResources.currencies',
        missingMessage: '[CRITICAL] Trading currencies missing after load',
        failureMessage: '[CRITICAL] Trading currencies query failed',
      })
      if (currenciesFailure) {
        return {
          status: 'error',
          error: currenciesFailure.error,
          scope: currenciesFailure.scope,
        }
      }
    }

    if (
      (includePaymentMethods && paymentMethodsQuery.isPending) ||
      (includePaymentTerms && paymentTermsQuery.isPending) ||
      (includeCurrencies && currenciesQuery.isPending)
    ) {
      return { status: 'loading' }
    }

    return {
      status: 'ready',
      currencies: includeCurrencies ? (currenciesQuery.data as Currency[]) : [],
      paymentMethods: includePaymentMethods
        ? (paymentMethodsQuery.data as PaymentMethod[]).filter(
            (item) => item.status === 'Active'
          )
        : [],
      paymentTerms: includePaymentTerms
        ? (paymentTermsQuery.data as PaymentTerm[]).filter(
            (item) => item.status === 'Active'
          )
        : [],
    }
  }, [
    currenciesQuery.data,
    currenciesQuery.error,
    currenciesQuery.isPending,
    includeCurrencies,
    includePaymentMethods,
    includePaymentTerms,
    paymentMethodsQuery.data,
    paymentMethodsQuery.error,
    paymentMethodsQuery.isPending,
    paymentTermsQuery.data,
    paymentTermsQuery.error,
    paymentTermsQuery.isPending,
  ])

  useEffect(() => {
    if (readResource.status !== 'error') return
    logger.error(
      `Failed to load trading finance resources: ${readResource.scope}`,
      readResource.error
    )
    failLoudly(readResource.error, readResource.scope)
  }, [readResource])

  const currencies =
    readResource.status === 'ready' ? readResource.currencies : []
  const paymentMethods =
    readResource.status === 'ready' ? readResource.paymentMethods : []
  const paymentTerms =
    readResource.status === 'ready' ? readResource.paymentTerms : []
  const retry = async () => {
    await Promise.all([
      includeCurrencies ? currenciesQuery.refetch() : Promise.resolve(),
      includePaymentMethods ? paymentMethodsQuery.refetch() : Promise.resolve(),
      includePaymentTerms ? paymentTermsQuery.refetch() : Promise.resolve(),
    ])
  }

  return {
    readResource,
    currencies,
    paymentMethods,
    paymentTerms,
    isLoading: readResource.status === 'loading',
    retry,
  }
}

export function useFinanceFilterOptions<TOrder extends PaymentLikeOrder>(
  orders: TOrder[]
) {
  const financeResources = useFinanceResources()

  const paymentMethodOptions = useMemo(() => {
    const paymentMethods =
      financeResources.readResource.status === 'ready'
        ? financeResources.readResource.paymentMethods
        : []
    const entries = new Map<string, string>()

    paymentMethods.forEach((item) => {
      if (item.code) entries.set(item.code, item.name || item.code)
    })

    orders.forEach((order) => {
      if (order.paymentMethod) {
        entries.set(
          order.paymentMethod,
          order.paymentMethodName ||
            entries.get(order.paymentMethod) ||
            order.paymentMethod
        )
      }
    })

    return Array.from(entries.entries())
      .sort((a, b) => a[1].localeCompare(b[1]))
      .map(([value, label]) => ({ value, label }))
  }, [financeResources.readResource, orders])

  const paymentTermOptions = useMemo(() => {
    const paymentTerms =
      financeResources.readResource.status === 'ready'
        ? financeResources.readResource.paymentTerms
        : []
    const entries = new Map<string, string>()

    paymentTerms.forEach((item) => {
      if (item.code) entries.set(item.code, item.name || item.code)
    })

    orders.forEach((order) => {
      if (order.paymentTerm) {
        entries.set(
          order.paymentTerm,
          order.paymentTermName ||
            entries.get(order.paymentTerm) ||
            order.paymentTerm
        )
      }
    })

    return Array.from(entries.entries())
      .sort((a, b) => a[1].localeCompare(b[1]))
      .map(([value, label]) => ({ value, label }))
  }, [financeResources.readResource, orders])

  return {
    readResource:
      financeResources.readResource.status === 'ready'
        ? {
            status: 'ready' as const,
            paymentMethodOptions,
            paymentTermOptions,
          }
        : financeResources.readResource,
    paymentMethodOptions,
    paymentTermOptions,
    retry: financeResources.retry,
  }
}
