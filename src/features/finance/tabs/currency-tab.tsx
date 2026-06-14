import { useState } from 'react'
import type { TranslationKey } from '@/locales'
import { Plus, Coins, Edit2, Anchor, Globe2 } from 'lucide-react'
import { useLanguage } from '@/context/language-provider'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import { IndustrialActionBar } from '@/components/uds/industrial-action-bar'
import { IndustrialHeader } from '@/components/uds/industrial-header'
import { CurrencyActionDialog } from '../components/currency-action-dialog'
import { ExchangeRateSyncConfigCard } from '../components/exchange-rate-sync-config-card'
import { type Currency } from '../data/schema'
import { useCurrencies } from '../hooks/use-currencies'
import { useExchangeRateSyncConfig } from '../hooks/use-exchange-rate-sync-config'

export function CurrencyTab() {
  const { t } = useLanguage()
  const {
    currencies,
    isLoading,
    isSyncing,
    loadData,
    handleSync,
    handleSetBase,
    invalidateCurrencies,
  } = useCurrencies()

  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingCurrency, setEditingCurrency] = useState<Currency | null>(null)
  const {
    config: syncConfig,
    isLoading: isConfigLoading,
    isSaving: isConfigSaving,
    updateProvider,
    addProvider,
    removeProvider,
    toggleProviderEnabled,
    toggleConfigFlag,
    saveConfig,
  } = useExchangeRateSyncConfig()

  const openEdit = (currency: Currency) => {
    setEditingCurrency(currency)
    setIsDialogOpen(true)
  }

  const resolveCurrencyDisplayName = (currency: Currency) => {
    const translatedName = t(
      `finance.currencyRates.names.${currency.code}` as TranslationKey
    )
    return translatedName.includes('finance.currencyRates.names')
      ? currency.name
      : translatedName
  }

  const baseCurrency = currencies.find((currency) => currency.isBase) ?? null
  const baseCurrencyCode = baseCurrency?.code || 'CNY'

  return (
    <div className='flex animate-in flex-col gap-8 duration-700 fade-in'>
      <IndustrialHeader
        icon={Coins}
        title={t('finance.currencyRates.page.title')}
        description={t('finance.currencyRates.page.subtitle')}
      />

      <IndustrialActionBar
        onRefresh={loadData}
        isRefreshing={isLoading}
        className='gap-2 rounded-[20px] p-3'
        rightContent={
          <div className='flex items-center gap-2'>
            <Button
              variant='outline'
              size='sm'
              onClick={() => {
                void handleSync()
              }}
              disabled={isSyncing}
              className='h-11 rounded-full border-dashed border-emerald-500/20 bg-emerald-500/5 px-4 text-[10px] font-black tracking-widest text-emerald-600 uppercase hover:bg-emerald-500/10'
            >
              <Globe2
                className={`mr-2 size-3 ${isSyncing ? 'animate-spin' : ''}`}
              />
              {isSyncing
                ? t('finance.currencyRates.page.syncing')
                : t('finance.currencyRates.page.sync')}
            </Button>
            <Button
              onClick={() => {
                setEditingCurrency(null)
                setIsDialogOpen(true)
              }}
              className='h-11 rounded-full bg-emerald-600 px-5 text-[10px] font-black tracking-widest text-white uppercase shadow-lg shadow-emerald-600/20'
            >
              <Plus className='mr-2 size-4' />
              {t('finance.currencyRates.page.add')}
            </Button>
          </div>
        }
      />

      <div className='flex flex-col gap-4'>
        {/* 货币卡片网格 */}
        <div className='grid grid-cols-1 gap-2.5 md:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-5'>
          {currencies.map((curr) => (
            <Card
              key={curr.id}
              className={`group overflow-hidden rounded-[20px] border-dashed border-primary/20 bg-muted/5 transition-all hover:bg-muted/10 ${curr.isBase ? 'bg-emerald-500/5 ring-2 ring-emerald-500/30' : ''}`}
            >
              {curr.isBase && (
                <div className='bg-emerald-600 py-1 text-center text-[8px] font-black tracking-widest text-white uppercase italic shadow-sm'>
                  {t('finance.currencyRates.card.baseBadge')}
                </div>
              )}
              <CardHeader className='px-3.5 pt-3 pb-0.5'>
                <div className='flex items-center justify-between'>
                  <div className='flex items-center gap-2'>
                    <div
                      className={`flex size-7 items-center justify-center rounded-xl ${curr.isBase ? 'bg-emerald-600 text-white' : 'bg-primary/10 text-primary'}`}
                    >
                      {curr.isBase ? (
                        <Anchor className='size-3.5' />
                      ) : (
                        <Coins className='size-3.5' />
                      )}
                    </div>
                    <div className='min-w-0'>
                      <CardTitle className='text-sm font-black tracking-tighter uppercase italic'>
                        {(() => {
                          return resolveCurrencyDisplayName(curr)
                        })()}{' '}
                        ({curr.code})
                      </CardTitle>
                      <CardDescription className='font-mono text-[8px] font-black tracking-widest text-muted-foreground uppercase'>
                        {t('finance.currencyRates.card.precisionLabel', {
                          digital: curr.precision,
                        })}
                      </CardDescription>
                    </div>
                  </div>
                  <div className='flex gap-1 opacity-0 transition-opacity group-hover:opacity-100'>
                    {!curr.isBase && (
                      <Button
                        variant='ghost'
                        size='icon'
                        onClick={() => handleSetBase(curr.id!)}
                        title={t('finance.currencyRates.card.setBase')}
                        className='size-7 rounded-full text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700'
                      >
                        <Anchor className='size-3.5' />
                      </Button>
                    )}
                    <Button
                      variant='ghost'
                      size='icon'
                      onClick={() => openEdit(curr)}
                      className='size-7 rounded-full'
                    >
                      <Edit2 className='size-3.5' />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className='px-3.5 pt-0.5 pb-3'>
                <div className='space-y-1.5'>
                  <div className='flex items-end justify-between'>
                    <div className='flex flex-col'>
                      <div className='mb-0.5 flex items-center gap-2'>
                        <span className='text-[8px] font-black tracking-widest text-muted-foreground/40 uppercase italic'>
                          {t('finance.currencyRates.card.rateLabel')}
                        </span>
                        {!curr.isBase && curr.rate === 1 && (
                          <span className='animate-pulse rounded-full bg-amber-500/10 px-1.5 py-0.5 text-[7px] font-black tracking-tighter text-amber-600 uppercase'>
                            {t('finance.currencyRates.card.pendingSync')}
                          </span>
                        )}
                      </div>
                      <span
                        className={`text-xl font-black tracking-tighter italic tabular-nums ${
                          curr.isBase
                            ? 'text-emerald-600'
                            : curr.rate === 1
                              ? 'text-amber-500'
                              : 'text-primary'
                        }`}
                      >
                        {!curr.isBase && curr.rate === 1
                          ? '?'
                          : curr.rate.toFixed(curr.precision)}
                      </span>
                      <p className='mt-0.5 text-[9px] font-bold tracking-wide text-muted-foreground/60'>
                        {curr.isBase
                          ? `1 ${curr.code} = 1.0000 ${baseCurrencyCode}`
                          : `1 ${curr.code} = ${curr.rate.toFixed(Math.max(curr.precision, 4))} ${baseCurrencyCode}`}
                      </p>
                    </div>
                    <div className='text-right'>
                      <span className='text-lg font-black italic opacity-10'>
                        {curr.symbol}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* 提示区域 */}
        <Card className='rounded-[20px] border-dashed border-emerald-500/20 bg-emerald-500/5 px-3 py-2.5'>
          <div className='flex items-start gap-2 text-emerald-600'>
            <div className='rounded-full bg-white/50 p-1.5 shadow-sm'>
              <Globe2 className='size-3.5' />
            </div>
            <div className='space-y-0.5'>
              <h4 className='text-[10px] font-black tracking-tight uppercase italic'>
                {t('finance.currencyRates.guard.title')}
              </h4>
              <p className='max-w-3xl text-[10px] leading-relaxed font-medium opacity-80'>
                {t('finance.currencyRates.guard.content', {
                  name: (() => {
                    const baseCurr = currencies.find((c) => c.isBase)
                    if (!baseCurr) return '?'
                    return resolveCurrencyDisplayName(baseCurr)
                  })(),
                  code: currencies.find((c) => c.isBase)?.code || '?',
                })}
              </p>
            </div>
          </div>
        </Card>
      </div>

      <ExchangeRateSyncConfigCard
        config={syncConfig}
        isLoading={isConfigLoading}
        isSaving={isConfigSaving}
        onToggleConfigFlag={toggleConfigFlag}
        onProviderFieldChange={updateProvider}
        onProviderEnabledChange={toggleProviderEnabled}
        onAddProvider={addProvider}
        onRemoveProvider={removeProvider}
        onSave={saveConfig}
      />

      <CurrencyActionDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        editingCurrency={editingCurrency}
        currencies={currencies}
        onSuccess={invalidateCurrencies}
      />
    </div>
  )
}
