import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus, Coins, Edit2, Anchor, Globe2 } from 'lucide-react'
import { useLanguage } from '@/context/language-provider'
import { useCurrencies } from '../hooks/use-currencies'
import { CurrencyActionDialog } from '../components/currency-action-dialog'
import { IndustrialHeader } from '@/components/uds/industrial-header'
import { IndustrialActionBar } from '@/components/uds/industrial-action-bar'
import { type Currency } from '../data/schema'

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

    const openEdit = (currency: Currency) => {
        setEditingCurrency(currency)
        setIsDialogOpen(true)
    }

    const baseCurrency = currencies.find((currency) => currency.isBase) ?? null
    const baseCurrencyCode = baseCurrency?.code || 'CNY'

    return (
        <div className='space-y-6 animate-in fade-in duration-700'>
            <IndustrialHeader 
                icon={Coins}
                title={t('finance.currencyRates.page.title')}
                description={t('finance.currencyRates.page.subtitle')}
            />

            <IndustrialActionBar 
                onRefresh={loadData}
                isRefreshing={isLoading}
                rightContent={
                    <div className='flex items-center gap-2'>
                        <Button 
                            variant='outline' 
                            size='sm' 
                            onClick={() => {
                                void handleSync()
                            }}
                            disabled={isSyncing}
                            className='rounded-full h-11 px-6 font-black text-[10px] uppercase tracking-widest border-dashed bg-emerald-500/5 text-emerald-600 border-emerald-500/20 hover:bg-emerald-500/10'
                        >
                            <Globe2 className={`size-3 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
                            {isSyncing ? t('finance.currencyRates.page.syncing') : t('finance.currencyRates.page.sync')}
                        </Button>
                        <Button 
                             onClick={() => {
                                setEditingCurrency(null)
                                setIsDialogOpen(true)
                            }}
                            className='rounded-full h-11 px-8 font-black text-[10px] uppercase tracking-widest bg-emerald-600 shadow-lg shadow-emerald-600/20 text-white'
                        >
                            <Plus className='size-4 mr-2' />
                            {t('finance.currencyRates.page.add')}
                        </Button>
                    </div>
                }
            />

            {/* 货币卡片网格 */}
            <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5'>
                {currencies.map((curr) => (
                    <Card 
                        key={curr.id} 
                        className={`rounded-[24px] border-dashed border-primary/20 bg-muted/5 group hover:bg-muted/10 transition-all overflow-hidden ${curr.isBase ? 'ring-2 ring-emerald-500/30 bg-emerald-500/5' : ''}`}
                    >
                        {curr.isBase && (
                            <div className='bg-emerald-600 text-white text-[8px] font-black uppercase tracking-widest py-1 text-center italic shadow-sm'>
                                {t('finance.currencyRates.card.baseBadge')}
                            </div>
                        )}
                        <CardHeader className='pb-2'>
                            <div className='flex items-center justify-between'>
                                <div className='flex items-center gap-3'>
                                    <div className={`size-9 rounded-2xl flex items-center justify-center ${curr.isBase ? 'bg-emerald-600 text-white' : 'bg-primary/10 text-primary'}`}>
                                        {curr.isBase ? <Anchor className='size-4' /> : <Coins className='size-4' />}
                                    </div>
                                    <div>
                                        <CardTitle className='text-sm font-black italic tracking-tighter uppercase'>
                                            {(() => {
                                                const translatedName = t(`finance.currencyRates.names.${curr.code}` as any)
                                                return translatedName.includes('finance.currencyRates.names') ? curr.name : translatedName
                                            })()} ({curr.code})
                                        </CardTitle>
                                        <CardDescription className='text-[8px] font-black tracking-widest font-mono text-muted-foreground uppercase'>
                                            {t('finance.currencyRates.card.precisionLabel', { digital: curr.precision })}
                                        </CardDescription>
                                    </div>
                                </div>
                                <div className='flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity'>
                                    {!curr.isBase && (
                                        <Button 
                                            variant='ghost' 
                                            size='icon' 
                                            onClick={() => handleSetBase(curr.id!)}
                                            title={t('finance.currencyRates.card.setBase')}
                                            className='size-7 rounded-full text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50'
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
                        <CardContent>
                            <div className='space-y-4 pt-2'>
                                <div className='flex items-end justify-between'>
                                    <div className='flex flex-col'>
                                        <div className='flex items-center gap-2 mb-1'>
                                            <span className='text-[8px] font-black uppercase text-muted-foreground/40 tracking-widest italic'>{t('finance.currencyRates.card.rateLabel')}</span>
                                            {!curr.isBase && curr.rate === 1 && (
                                                <span className='text-[7px] font-black bg-amber-500/10 text-amber-600 px-1.5 py-0.5 rounded-full uppercase tracking-tighter animate-pulse'>
                                                    {t('finance.currencyRates.card.pendingSync')}
                                                </span>
                                            )}
                                        </div>
                                        <span className={`text-2xl font-black italic tracking-tighter tabular-nums ${
                                            curr.isBase ? 'text-emerald-600' : 
                                            curr.rate === 1 ? 'text-amber-500' : 'text-primary'
                                        }`}>
                                            {!curr.isBase && curr.rate === 1 ? '?' : curr.rate.toFixed(curr.precision)}
                                        </span>
                                        <p className='mt-1 text-[9px] font-bold tracking-wide text-muted-foreground/60'>
                                            {curr.isBase
                                                ? `1 ${curr.code} = 1.0000 ${baseCurrencyCode}`
                                                : `1 ${curr.code} = ${curr.rate.toFixed(Math.max(curr.precision, 4))} ${baseCurrencyCode}`}
                                        </p>
                                    </div>
                                    <div className='text-right'>
                                        <span className='text-2xl font-black opacity-10 italic'>{curr.symbol}</span>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
            
            {/* 提示区域 */}
            <Card className='rounded-[32px] border-dashed border-emerald-500/20 bg-emerald-500/5 p-6'>
                <div className='flex gap-4 items-start text-emerald-600'>
                    <div className='p-3 rounded-full bg-white/50 shadow-sm'>
                        <Globe2 className='size-5' />
                    </div>
                    <div className='space-y-1'>
                        <h4 className='text-xs font-black italic tracking-tight uppercase'>{t('finance.currencyRates.guard.title')}</h4>
                        <p className='text-[10px] font-medium leading-relaxed max-w-3xl opacity-80'>
                            {t('finance.currencyRates.guard.content', { 
                                name: (() => {
                                    const baseCurr = currencies.find(c => c.isBase)
                                    if (!baseCurr) return '?'
                                    const translatedName = t(`finance.currencyRates.names.${baseCurr.code}` as any)
                                    return translatedName.includes('finance.currencyRates.names') ? baseCurr.name : translatedName
                                })(), 
                                code: currencies.find(c => c.isBase)?.code || '?' 
                            })}
                        </p>
                    </div>
                </div>
            </Card>

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
