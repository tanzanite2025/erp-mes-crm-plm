import { AlertTriangle, Warehouse } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { IndustrialHeader } from '@/components/uds/industrial-header'
import { useLanguage } from '@/context/language-provider'

interface StockMgmtHeaderProps {
    alertCount: number
    materialAlertCount: number
    bomAlertCount: number
    totalAssets: number
    baseCurrencySymbol?: string
    baseCurrencyPrecision?: number
    onOpenBOMAlertDetails?: () => void
}

export function StockMgmtHeader({
    alertCount,
    materialAlertCount,
    bomAlertCount,
    totalAssets,
    baseCurrencySymbol,
    baseCurrencyPrecision = 2,
    onOpenBOMAlertDetails,
}: StockMgmtHeaderProps) {
    const { t } = useLanguage()
    const totalAssetsLabel = totalAssets.toLocaleString(undefined, {
        minimumFractionDigits: baseCurrencyPrecision,
        maximumFractionDigits: baseCurrencyPrecision,
    })

    return (
        <IndustrialHeader
            title={t('warehouse.stock.title')}
            description={t('warehouse.stock.subtitle')}
            icon={Warehouse}
            statusBadge={
                <div className='flex flex-wrap items-center gap-2'>
                    <Badge variant="outline" className='bg-primary/5 text-primary border-dashed border-primary/20 text-[10px] h-5 px-2 rounded-full flex items-center gap-1.5 shrink-0'>
                        <span className='font-semibold text-muted-foreground/60'>ASSETS</span>
                        <span className='font-black tabular-nums'>
                            {baseCurrencySymbol ? `${baseCurrencySymbol} ` : ''}
                            {totalAssetsLabel}
                        </span>
                    </Badge>
                    
                    {alertCount > 0 && (
                        <>
                            <Badge className='bg-rose-500/10 text-rose-600 border-none font-semibold text-[10px] px-2 h-5 rounded-full shrink-0'>
                                <AlertTriangle className='size-2.5 mr-1' />
                                {t('warehouse.stock.alertsTotal', { count: alertCount })}
                            </Badge>
                            <Badge className='bg-amber-500/10 text-amber-600 border-none font-semibold text-[10px] px-2 h-5 rounded-full shrink-0'>
                                {t('warehouse.stock.alertsMaterial', { count: materialAlertCount })}
                            </Badge>
                            {bomAlertCount > 0 && onOpenBOMAlertDetails ? (
                                <button
                                    type='button'
                                    className='h-5 rounded-full bg-blue-500/10 px-2 text-[10px] font-semibold text-blue-600 shrink-0 transition-colors hover:bg-blue-500/15'
                                    onClick={onOpenBOMAlertDetails}
                                >
                                    {t('warehouse.stock.alertsBom', { count: bomAlertCount })}
                                </button>
                            ) : (
                                <Badge className='bg-blue-500/10 text-blue-600 border-none font-semibold text-[10px] px-2 h-5 rounded-full shrink-0'>
                                    {t('warehouse.stock.alertsBom', { count: bomAlertCount })}
                                </Badge>
                            )}
                        </>
                    )}
                </div>
            }
        />
    )
}
