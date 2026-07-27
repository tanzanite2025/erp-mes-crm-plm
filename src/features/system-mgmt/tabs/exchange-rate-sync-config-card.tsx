import { Plus, PlugZap, Save, Trash2 } from 'lucide-react'
import { useLanguage } from '@/context/language-provider'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import type { ExchangeRateSyncConfig } from '@/features/finance/services/currency-maintenance-service'

interface ExchangeRateSyncConfigCardProps {
  config: ExchangeRateSyncConfig
  isLoading: boolean
  isSaving: boolean
  onToggleConfigFlag: (
    field: 'enabled' | 'fallbackEnabled',
    value: boolean
  ) => void
  onProviderFieldChange: (
    providerId: string,
    field: 'provider' | 'apiBaseUrl' | 'apiKey' | 'latestPathTemplate',
    value: string
  ) => void
  onProviderEnabledChange: (providerId: string, enabled: boolean) => void
  onAddProvider: () => void
  onRemoveProvider: (providerId: string) => void
  onSave: () => Promise<void> | void
}

export function ExchangeRateSyncConfigCard({
  config,
  isLoading,
  isSaving,
  onToggleConfigFlag,
  onProviderFieldChange,
  onProviderEnabledChange,
  onAddProvider,
  onRemoveProvider,
  onSave,
}: ExchangeRateSyncConfigCardProps) {
  const { t } = useLanguage()
  const enabledProviders = config.providers.filter(
    (provider) => provider.enabled
  )
  const primaryEnabledProviderId = enabledProviders[0]?.id ?? null

  return (
    <Card className='overflow-hidden rounded-[24px] border-dashed border-primary/20 bg-muted/5'>
      <CardHeader className='border-b border-dashed border-primary/10 bg-linear-to-br from-primary/5 via-transparent to-transparent px-4 py-3'>
        <div className='flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between'>
          <div className='space-y-0.5'>
            <CardTitle className='flex items-center gap-1.5 text-sm font-black tracking-tighter italic'>
              <PlugZap className='size-4 text-primary' />
              {t('systemManagement.apiManagement.exchangeRateApi.title')}
            </CardTitle>
            <CardDescription className='text-[9px] font-black tracking-widest uppercase opacity-60'>
              {t('systemManagement.apiManagement.exchangeRateApi.description')}
            </CardDescription>
          </div>
          <div className='flex flex-wrap items-center gap-2'>
            <div className='flex items-center gap-2 rounded-full border border-dashed border-primary/20 bg-background/80 px-3 py-1'>
              <span className='text-[10px] font-black tracking-widest text-muted-foreground/60 uppercase'>
                {t('systemManagement.apiManagement.exchangeRateApi.enabled')}
              </span>
              <Switch
                checked={config.enabled}
                onCheckedChange={(checked) =>
                  onToggleConfigFlag('enabled', checked)
                }
                disabled={isLoading || isSaving}
              />
            </div>
            <div className='flex items-center gap-2 rounded-full border border-dashed border-primary/20 bg-background/80 px-3 py-1'>
              <span className='text-[10px] font-black tracking-widest text-muted-foreground/60 uppercase'>
                {t(
                  'systemManagement.apiManagement.exchangeRateApi.fallbackLabel'
                )}
              </span>
              <Switch
                checked={config.fallbackEnabled}
                onCheckedChange={(checked) =>
                  onToggleConfigFlag('fallbackEnabled', checked)
                }
                disabled={isLoading || isSaving}
              />
            </div>
            <Button
              type='button'
              onClick={onAddProvider}
              disabled={isLoading || isSaving}
              className='h-11 rounded-full px-5 text-[10px] font-black tracking-widest uppercase'
            >
              <Plus className='mr-2 size-4' />
              {t(
                'systemManagement.apiManagement.exchangeRateApi.addFallbackProvider'
              )}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className='flex flex-col gap-3 p-4'>
        <div className='flex flex-col gap-2.5'>
          {config.providers.map((provider) => {
            const isPrimary = provider.id === primaryEnabledProviderId
            const fallbackIndex = enabledProviders.findIndex(
              (item) => item.id === provider.id
            )
            const providerTitle = isPrimary
              ? t(
                  'systemManagement.apiManagement.exchangeRateApi.providerTagPrimary'
                )
              : provider.enabled && fallbackIndex >= 0
                ? t(
                    'systemManagement.apiManagement.exchangeRateApi.providerTagFallback',
                    {
                      index: fallbackIndex,
                    }
                  )
                : t(
                    'systemManagement.apiManagement.exchangeRateApi.providerTagDisabled'
                  )
            return (
              <div
                key={provider.id}
                className='rounded-[20px] border border-dashed border-primary/15 bg-background/70 p-3'
              >
                <div className='mb-3 flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between'>
                  <div className='space-y-0.5'>
                    <p className='text-[10px] font-black tracking-widest text-muted-foreground/60 uppercase'>
                      {providerTitle}
                    </p>
                    <p className='text-[9px] font-black tracking-widest uppercase opacity-60'>
                      {t(
                        'systemManagement.apiManagement.exchangeRateApi.providerPriority',
                        {
                          priority: provider.priority,
                        }
                      )}
                    </p>
                  </div>
                  <div className='flex flex-wrap items-center gap-2'>
                    <div className='flex items-center gap-2 rounded-full border border-dashed border-primary/20 bg-background px-3 py-1'>
                      <span className='text-[10px] font-black tracking-widest text-muted-foreground/60 uppercase'>
                        {t(
                          'systemManagement.apiManagement.exchangeRateApi.providerEnabledLabel'
                        )}
                      </span>
                      <Switch
                        checked={provider.enabled}
                        onCheckedChange={(checked) =>
                          onProviderEnabledChange(provider.id, checked)
                        }
                        disabled={isLoading || isSaving}
                      />
                    </div>
                    {!isPrimary && (
                      <Button
                        type='button'
                        variant='outline'
                        onClick={() => onRemoveProvider(provider.id)}
                        disabled={isLoading || isSaving}
                        className='h-11 rounded-full border-dashed px-4 text-[10px] font-black tracking-widest text-rose-600 uppercase hover:bg-rose-500/10 hover:text-rose-700'
                      >
                        <Trash2 className='mr-2 size-4' />
                        {t(
                          'systemManagement.apiManagement.exchangeRateApi.removeProvider'
                        )}
                      </Button>
                    )}
                  </div>
                </div>

                <div className='grid grid-cols-1 gap-3 lg:grid-cols-12'>
                  <div className='space-y-1 lg:col-span-2'>
                    <Label className='text-[10px] font-black tracking-widest uppercase opacity-60'>
                      {t(
                        'systemManagement.apiManagement.exchangeRateApi.providerLabel'
                      )}
                    </Label>
                    <Input
                      value={provider.provider}
                      onChange={(event) =>
                        onProviderFieldChange(
                          provider.id,
                          'provider',
                          event.target.value
                        )
                      }
                      placeholder={t(
                        'systemManagement.apiManagement.exchangeRateApi.providerPlaceholder'
                      )}
                      disabled={isLoading || isSaving}
                      className='h-12 rounded-2xl border-none bg-muted/50'
                    />
                  </div>
                  <div className='space-y-1 lg:col-span-4'>
                    <Label className='text-[10px] font-black tracking-widest uppercase opacity-60'>
                      {t(
                        'systemManagement.apiManagement.exchangeRateApi.apiBaseUrlLabel'
                      )}
                    </Label>
                    <Input
                      value={provider.apiBaseUrl}
                      onChange={(event) =>
                        onProviderFieldChange(
                          provider.id,
                          'apiBaseUrl',
                          event.target.value
                        )
                      }
                      placeholder={t(
                        'systemManagement.apiManagement.exchangeRateApi.apiBaseUrlPlaceholder'
                      )}
                      disabled={isLoading || isSaving}
                      className='h-12 rounded-2xl border-none bg-muted/50 font-mono text-[12px]'
                    />
                  </div>
                  <div className='space-y-1 lg:col-span-3'>
                    <Label className='text-[10px] font-black tracking-widest uppercase opacity-60'>
                      {t(
                        'systemManagement.apiManagement.exchangeRateApi.apiKeyLabel'
                      )}
                    </Label>
                    <Input
                      value={provider.apiKey}
                      onChange={(event) =>
                        onProviderFieldChange(
                          provider.id,
                          'apiKey',
                          event.target.value
                        )
                      }
                      placeholder={t(
                        'systemManagement.apiManagement.exchangeRateApi.apiKeyPlaceholder'
                      )}
                      disabled={isLoading || isSaving}
                      className='h-12 rounded-2xl border-none bg-muted/50 font-mono text-[12px]'
                    />
                  </div>
                  <div className='space-y-1 lg:col-span-3'>
                    <Label className='text-[10px] font-black tracking-widest uppercase opacity-60'>
                      {t(
                        'systemManagement.apiManagement.exchangeRateApi.latestPathTemplateLabel'
                      )}
                    </Label>
                    <Input
                      value={provider.latestPathTemplate}
                      onChange={(event) =>
                        onProviderFieldChange(
                          provider.id,
                          'latestPathTemplate',
                          event.target.value
                        )
                      }
                      placeholder={t(
                        'systemManagement.apiManagement.exchangeRateApi.latestPathTemplatePlaceholder'
                      )}
                      disabled={isLoading || isSaving}
                      className='h-12 rounded-2xl border-none bg-muted/50 font-mono text-[12px]'
                    />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
        <div className='flex flex-col gap-1.5 rounded-[18px] border border-dashed border-primary/15 bg-background/70 p-2.5 lg:col-span-12 lg:flex-row lg:items-center lg:justify-between'>
          <div className='space-y-0.5'>
            <p className='text-[10px] font-black tracking-widest text-muted-foreground/60 uppercase'>
              {t('systemManagement.apiManagement.exchangeRateApi.hintTitle')}
            </p>
            <p className='text-[10px] leading-relaxed font-medium text-muted-foreground/80'>
              {t('systemManagement.apiManagement.exchangeRateApi.hintContent')}
            </p>
            <p className='text-[10px] leading-relaxed font-medium text-muted-foreground/70'>
              {t('systemManagement.apiManagement.exchangeRateApi.fallbackHint')}
            </p>
          </div>
          <Button
            type='button'
            onClick={() => {
              void onSave()
            }}
            disabled={isLoading || isSaving}
            className='h-11 rounded-full px-5 text-[10px] font-black tracking-widest uppercase'
          >
            <Save className='mr-2 size-4' />
            {isSaving
              ? t('systemManagement.apiManagement.exchangeRateApi.saving')
              : t('systemManagement.apiManagement.exchangeRateApi.save')}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
