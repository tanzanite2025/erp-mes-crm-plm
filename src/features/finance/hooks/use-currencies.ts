import { useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { createLogger } from '@/lib/logger'
import { useLanguage } from '@/context/language-provider'
import { type Currency } from '../data/schema'
import { financeQueryKeys } from '../query-keys'
import { CurrencyCoreService } from '../services/currency-core-service'
import { CurrencyMaintenanceService } from '../services/currency-maintenance-service'

const logger = createLogger('useCurrencies')
export const CURRENCIES_QUERY_KEY = financeQueryKeys.currencies()

type SyncApiError = Error & {
  status?: number
  isConflict?: boolean
}

const fallbackCNYCurrency: Currency = {
  code: 'CNY',
  name: '\u4eba\u6c11\u5e01',
  symbol: '\u00a5',
  rate: 1,
  precision: 2,
  status: 'Active',
  isBase: true,
  version: 1,
}

function normalizeCurrencies(data: Currency[]): Currency[] {
  const hasBase = data.some((currency) => currency.isBase)
  const hasCNY = data.some(
    (currency) => currency.code === fallbackCNYCurrency.code
  )

  const normalized: Currency[] = hasCNY
    ? data.map((currency) => {
        if (hasBase || currency.code !== fallbackCNYCurrency.code) {
          return currency
        }

        return {
          ...currency,
          isBase: true,
          rate: 1,
          status: 'Active' as const,
        }
      })
    : [
        ...data,
        {
          ...fallbackCNYCurrency,
          isBase: !hasBase,
        },
      ]

  return [...normalized].sort((a, b) => (b.isBase ? 1 : 0) - (a.isBase ? 1 : 0))
}

export function useCurrencies() {
  const queryClient = useQueryClient()
  const { t } = useLanguage()

  const currenciesQuery = useQuery({
    queryKey: CURRENCIES_QUERY_KEY,
    queryFn: () => CurrencyCoreService.getCurrencies(),
    select: normalizeCurrencies,
  })

  const syncMutation = useMutation({
    mutationFn: () => CurrencyMaintenanceService.syncCurrencies(),
    onSuccess: async (res) => {
      await queryClient.invalidateQueries({ queryKey: CURRENCIES_QUERY_KEY })
      toast.success(
        t('finance.currencyRates.toast.syncSuccess', { count: res.count })
      )
    },
    onError: (error: unknown) => {
      logger.error('Failed to sync exchange rates', error)

      const syncError = error as SyncApiError
      if (syncError?.isConflict || syncError?.status === 409) {
        const busyMessage = t('finance.currencyRates.toast.syncBusy')
        toast.error(
          busyMessage === 'finance.currencyRates.toast.syncBusy'
            ? 'Exchange rate sync is already running. Please try again shortly.'
            : busyMessage
        )
        return
      }

      const message =
        typeof syncError?.message === 'string'
          ? syncError.message.replace(/^\[[A-Z_]+\]\s*/, '').trim()
          : ''

      toast.error(message || t('finance.currencyRates.toast.syncFailed'))
    },
  })

  const setBaseMutation = useMutation({
    mutationFn: (id: number) => CurrencyMaintenanceService.setBaseCurrency(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: CURRENCIES_QUERY_KEY })
      toast.success(t('finance.currencyRates.toast.setBaseSuccess'))
    },
    onError: () => {
      toast.error(t('finance.currencyRates.toast.setBaseFailed'))
    },
  })

  const handleSetBase = async (id: number) => {
    if (!window.confirm(t('finance.currencyRates.confirm.setBase'))) return
    await setBaseMutation.mutateAsync(id)
  }

  const invalidateCurrencies = () =>
    queryClient.invalidateQueries({ queryKey: CURRENCIES_QUERY_KEY })

  useEffect(() => {
    if (!currenciesQuery.error) return
    logger.error(
      'Failed to load currencies data in useCurrencies hook',
      currenciesQuery.error
    )
    toast.error(t('finance.currencyRates.toast.loadFailed'))
  }, [currenciesQuery.error, t])

  return {
    currencies: currenciesQuery.data ?? [],
    isLoading: currenciesQuery.isLoading,
    isSyncing: syncMutation.isPending,
    loadData: currenciesQuery.refetch,
    handleSync: syncMutation.mutateAsync,
    handleSetBase,
    invalidateCurrencies,
  }
}
