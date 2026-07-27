import { PlugZap } from 'lucide-react'
import { useLanguage } from '@/context/language-provider'
import { IndustrialHeader } from '@/components/uds/industrial-header'
import { useExchangeRateSyncConfig } from '../hooks/use-exchange-rate-sync-config'
import { ExchangeRateSyncConfigCard } from './exchange-rate-sync-config-card'

export function APIManagementTab() {
  const { t } = useLanguage()
  const {
    config,
    isLoading,
    isSaving,
    updateProvider,
    addProvider,
    removeProvider,
    toggleProviderEnabled,
    toggleConfigFlag,
    saveConfig,
  } = useExchangeRateSyncConfig()

  return (
    <div className='flex animate-in flex-col gap-4 duration-700 fade-in'>
      <IndustrialHeader
        icon={PlugZap}
        title={t('systemManagement.apiManagement.page.title')}
        description={t('systemManagement.apiManagement.page.subtitle')}
      />

      <ExchangeRateSyncConfigCard
        config={config}
        isLoading={isLoading}
        isSaving={isSaving}
        onToggleConfigFlag={toggleConfigFlag}
        onProviderFieldChange={updateProvider}
        onProviderEnabledChange={toggleProviderEnabled}
        onAddProvider={addProvider}
        onRemoveProvider={removeProvider}
        onSave={saveConfig}
      />
    </div>
  )
}
