import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { useLanguage } from '@/context/language-provider'
import { createLogger } from '@/lib/logger'
import { CurrencyCoreService } from '../services/currency-core-service'
import { CurrencyMaintenanceService } from '../services/currency-maintenance-service'
import { type Currency } from '../data/schema'

const logger = createLogger('useCurrencies')

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
    const hasBase = data.some(currency => currency.isBase)
    const hasCNY = data.some(currency => currency.code === fallbackCNYCurrency.code)

    const normalized: Currency[] = hasCNY
        ? data.map(currency => {
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
    const { t } = useLanguage()
    const [currencies, setCurrencies] = useState<Currency[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isSyncing, setIsSyncing] = useState(false)

    const loadData = useCallback(async () => {
        setIsLoading(true)
        try {
            const data = await CurrencyCoreService.getCurrencies()
            setCurrencies(normalizeCurrencies(data))
        } catch (error) {
            logger.error('Failed to load currencies data in useCurrencies hook', error)
            toast.error(t('finance.currencyRates.toast.loadFailed'))
            throw error
        } finally {
            setIsLoading(false)
        }
    }, [t])

    useEffect(() => {
        void loadData()

        const handleUpdate = () => {
            void loadData()
        }

        window.addEventListener('xdfc_currencies_data_updated', handleUpdate)
        return () => {
            window.removeEventListener('xdfc_currencies_data_updated', handleUpdate)
        }
    }, [loadData])

    const handleSync = async () => {
        if (isSyncing) {
            return
        }

        setIsSyncing(true)
        try {
            const res = await CurrencyMaintenanceService.syncCurrencies()
            toast.success(t('finance.currencyRates.toast.syncSuccess', { count: res.count }))
            window.dispatchEvent(new CustomEvent('xdfc_currencies_data_updated'))
        } catch (error) {
            logger.error('Failed to sync exchange rates', error)

            const syncError = error as SyncApiError
            if (syncError?.isConflict || syncError?.status === 409) {
                const busyMessage = t('finance.currencyRates.toast.syncBusy')
                toast.error(
                    busyMessage === 'finance.currencyRates.toast.syncBusy'
                        ? '汇率同步正在进行中，请稍后再试'
                        : busyMessage
                )
                return
            }

            const message = typeof syncError?.message === 'string'
                ? syncError.message.replace(/^\[[A-Z_]+\]\s*/, '').trim()
                : ''

            toast.error(message || t('finance.currencyRates.toast.syncFailed'))
        } finally {
            setIsSyncing(false)
        }
    }

    const handleSetBase = async (id: number) => {
        if (!window.confirm(t('finance.currencyRates.confirm.setBase'))) return
        try {
            await CurrencyMaintenanceService.setBaseCurrency(id)
            toast.success(t('finance.currencyRates.toast.setBaseSuccess'))
            window.dispatchEvent(new CustomEvent('xdfc_currencies_data_updated'))
        } catch (error) {
            toast.error(t('finance.currencyRates.toast.setBaseFailed'))
        }
    }

    return {
        currencies,
        isLoading,
        isSyncing,
        loadData,
        handleSync,
        handleSetBase
    }
}
