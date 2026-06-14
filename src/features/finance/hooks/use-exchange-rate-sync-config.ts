import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { useLanguage } from '@/context/language-provider'
import {
  CurrencyMaintenanceService,
  type ExchangeRateSyncConfig,
  type ExchangeRateSyncProviderConfig,
} from '../services/currency-maintenance-service'

function createProviderId(): string {
  return `provider-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function normalizeProviderPriorities(
  providers: ExchangeRateSyncProviderConfig[]
): ExchangeRateSyncProviderConfig[] {
  return providers.map((provider, index) => ({
    ...provider,
    priority: index + 1,
  }))
}

export function createDefaultExchangeRateSyncProvider(
  index = 0
): ExchangeRateSyncProviderConfig {
  return {
    id: createProviderId(),
    provider: 'exchangerate-api',
    enabled: true,
    priority: index + 1,
    apiBaseUrl: 'https://v6.exchangerate-api.com/v6',
    apiKey: '',
    latestPathTemplate: '/{apiKey}/latest/{baseCode}',
  }
}

export function createDefaultExchangeRateSyncConfig(): ExchangeRateSyncConfig {
  return {
    enabled: true,
    fallbackEnabled: false,
    providers: [createDefaultExchangeRateSyncProvider()],
  }
}

export function useExchangeRateSyncConfig() {
  const { t } = useLanguage()
  const [config, setConfig] = useState<ExchangeRateSyncConfig>(
    createDefaultExchangeRateSyncConfig()
  )
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    let isActive = true

    const loadConfig = async () => {
      setIsLoading(true)
      try {
        const loaded = await CurrencyMaintenanceService.getSyncConfig()
        if (isActive) {
          setConfig(loaded)
        }
      } catch (_error) {
        if (isActive) {
          toast.error(t('finance.currencyRates.syncConfig.toast.loadFailed'))
        }
      } finally {
        if (isActive) {
          setIsLoading(false)
        }
      }
    }

    void loadConfig()

    return () => {
      isActive = false
    }
  }, [t])

  const updateConfig = (
    updater: (current: ExchangeRateSyncConfig) => ExchangeRateSyncConfig
  ) => {
    setConfig((current) => updater(current))
  }

  const updateProvider = (
    providerId: string,
    field: keyof ExchangeRateSyncProviderConfig,
    value: string | boolean | number
  ) => {
    updateConfig((current) => ({
      ...current,
      providers: current.providers.map((provider) =>
        provider.id === providerId
          ? {
              ...provider,
              [field]: value,
            }
          : provider
      ),
    }))
  }

  const addProvider = () => {
    updateConfig((current) => ({
      ...current,
      providers: normalizeProviderPriorities([
        ...current.providers,
        createDefaultExchangeRateSyncProvider(current.providers.length),
      ]),
    }))
  }

  const removeProvider = (providerId: string) => {
    updateConfig((current) => {
      if (current.providers.length <= 1) {
        return current
      }

      const nextProviders = current.providers.filter(
        (provider) => provider.id !== providerId
      )
      if (nextProviders.length === 0) {
        return current
      }

      return {
        ...current,
        providers: normalizeProviderPriorities(nextProviders),
      }
    })
  }

  const toggleProviderEnabled = (providerId: string, enabled: boolean) => {
    updateProvider(providerId, 'enabled', enabled)
  }

  const toggleConfigFlag = (
    field: 'enabled' | 'fallbackEnabled',
    value: boolean
  ) => {
    updateConfig((current) => ({
      ...current,
      [field]: value,
    }))
  }

  const saveConfig = async () => {
    setIsSaving(true)
    try {
      const saved = await CurrencyMaintenanceService.saveSyncConfig(config)
      setConfig(saved)
      toast.success(t('finance.currencyRates.syncConfig.toast.saveSuccess'))
    } catch (_error) {
      toast.error(t('finance.currencyRates.syncConfig.toast.saveFailed'))
    } finally {
      setIsSaving(false)
    }
  }

  return {
    config,
    isLoading,
    isSaving,
    updateProvider,
    addProvider,
    removeProvider,
    toggleProviderEnabled,
    toggleConfigFlag,
    saveConfig,
  }
}
