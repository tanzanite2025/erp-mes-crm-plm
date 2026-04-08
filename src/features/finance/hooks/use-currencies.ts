import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { useLanguage } from '@/context/language-provider'
import { createLogger } from '@/lib/logger'
import { CurrencyCoreService } from '../services/currency-core-service'
import { CurrencyMaintenanceService } from '../services/currency-maintenance-service'
import { type Currency } from '../data/schema'

const logger = createLogger('useCurrencies')

export function useCurrencies() {
    const { t } = useLanguage()
    const [currencies, setCurrencies] = useState<Currency[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isSyncing, setIsSyncing] = useState(false)

    const loadData = useCallback(async () => {
        setIsLoading(true)
        try {
            const data = await CurrencyCoreService.getCurrencies()
            // 确保本位币排在第一位
            const sorted = [...data].sort((a, b) => (b.isBase ? 1 : 0) - (a.isBase ? 1 : 0))
            setCurrencies(sorted)
        } catch (error) {
            logger.error('Failed to load currencies data in useCurrencies hook', error)
            toast.error(t('finance.currencyRates.toast.loadFailed'))
            // 重新抛出错误以触发表层 ErrorBoundary 或被全局监控捕获
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
        setIsSyncing(true)
        try {
            const res = await CurrencyMaintenanceService.syncCurrencies()
            toast.success(t('finance.currencyRates.toast.syncSuccess', { count: res.count }))
            window.dispatchEvent(new CustomEvent('xdfc_currencies_data_updated'))
        } catch (error) {
            toast.error(t('finance.currencyRates.toast.syncFailed'))
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
