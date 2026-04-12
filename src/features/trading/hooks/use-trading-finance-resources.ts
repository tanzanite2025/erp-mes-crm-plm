import { useEffect, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { type Currency, type PaymentMethod, type PaymentTerm } from '@/features/finance/data/schema'
import { financeQueryKeys } from '@/features/finance/query-keys'
import { CurrencyCoreService } from '@/features/finance/services/currency-core-service'
import { PaymentMethodCoreService } from '@/features/finance/services/payment-method-core-service'
import { PaymentTermCoreService } from '@/features/finance/services/payment-term-core-service'
import { createLogger } from '@/lib/logger'

const logger = createLogger('useTradingFinanceResources')

type PaymentLikeOrder = {
  paymentMethod?: string
  paymentMethodName?: string
  paymentTerm?: string
  paymentTermName?: string
}

interface UseTradingFinanceResourcesOptions {
  includeCurrencies?: boolean
  includePaymentMethods?: boolean
  includePaymentTerms?: boolean
}

export function useTradingFinanceResources(options: UseTradingFinanceResourcesOptions = {}) {
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

  useEffect(() => {
    if (!paymentMethodsQuery.error && !paymentTermsQuery.error && !currenciesQuery.error) return
    logger.error('Failed to load trading finance resources', {
    paymentMethodsError: paymentMethodsQuery.error,
    paymentTermsError: paymentTermsQuery.error,
    currenciesError: currenciesQuery.error,
    })
  }, [currenciesQuery.error, paymentMethodsQuery.error, paymentTermsQuery.error])

  const paymentMethods = useMemo(
    () => (paymentMethodsQuery.data ?? []).filter((item) => item.status === 'Active'),
    [paymentMethodsQuery.data],
  )
  const paymentTerms = useMemo(
    () => (paymentTermsQuery.data ?? []).filter((item) => item.status === 'Active'),
    [paymentTermsQuery.data],
  )

  return {
    currencies: (currenciesQuery.data ?? []) as Currency[],
    paymentMethods: paymentMethods as PaymentMethod[],
    paymentTerms: paymentTerms as PaymentTerm[],
    isLoading:
      (includePaymentMethods && paymentMethodsQuery.isLoading) ||
      (includePaymentTerms && paymentTermsQuery.isLoading) ||
      (includeCurrencies && currenciesQuery.isLoading),
  }
}

export function useTradingFinanceFilterOptions<TOrder extends PaymentLikeOrder>(orders: TOrder[]) {
  const { paymentMethods, paymentTerms } = useTradingFinanceResources()

  const paymentMethodOptions = useMemo(() => {
    const entries = new Map<string, string>()

    paymentMethods.forEach((item) => {
      if (item.code) entries.set(item.code, item.name || item.code)
    })

    orders.forEach((order) => {
      if (order.paymentMethod) {
        entries.set(
          order.paymentMethod,
          order.paymentMethodName || entries.get(order.paymentMethod) || order.paymentMethod,
        )
      }
    })

    return Array.from(entries.entries())
      .sort((a, b) => a[1].localeCompare(b[1]))
      .map(([value, label]) => ({ value, label }))
  }, [orders, paymentMethods])

  const paymentTermOptions = useMemo(() => {
    const entries = new Map<string, string>()

    paymentTerms.forEach((item) => {
      if (item.code) entries.set(item.code, item.name || item.code)
    })

    orders.forEach((order) => {
      if (order.paymentTerm) {
        entries.set(
          order.paymentTerm,
          order.paymentTermName || entries.get(order.paymentTerm) || order.paymentTerm,
        )
      }
    })

    return Array.from(entries.entries())
      .sort((a, b) => a[1].localeCompare(b[1]))
      .map(([value, label]) => ({ value, label }))
  }, [orders, paymentTerms])

  return {
    paymentMethodOptions,
    paymentTermOptions,
  }
}
