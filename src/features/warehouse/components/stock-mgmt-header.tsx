import { AlertTriangle, Warehouse } from 'lucide-react'
import { useLanguage } from '@/context/language-provider'
import { Badge } from '@/components/ui/badge'
import { IndustrialHeader } from '@/components/uds/industrial-header'

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
          <Badge
            variant='outline'
            className='flex h-5 shrink-0 items-center gap-1.5 rounded-full border-dashed border-primary/20 bg-primary/5 px-2 text-[10px] text-primary'
          >
            <span className='font-semibold text-muted-foreground/60'>
              ASSETS
            </span>
            <span className='font-black tabular-nums'>
              {baseCurrencySymbol ? `${baseCurrencySymbol} ` : ''}
              {totalAssetsLabel}
            </span>
          </Badge>

          {alertCount > 0 && (
            <>
              <Badge className='h-5 shrink-0 rounded-full border-none bg-rose-500/10 px-2 text-[10px] font-semibold text-rose-600'>
                <AlertTriangle className='mr-1 size-2.5' />
                {t('warehouse.stock.alertsTotal', { count: alertCount })}
              </Badge>
              <Badge className='h-5 shrink-0 rounded-full border-none bg-amber-500/10 px-2 text-[10px] font-semibold text-amber-600'>
                {t('warehouse.stock.alertsMaterial', {
                  count: materialAlertCount,
                })}
              </Badge>
              {bomAlertCount > 0 && onOpenBOMAlertDetails ? (
                <button
                  type='button'
                  className='h-5 shrink-0 rounded-full bg-blue-500/10 px-2 text-[10px] font-semibold text-blue-600 transition-colors hover:bg-blue-500/15'
                  onClick={onOpenBOMAlertDetails}
                >
                  {t('warehouse.stock.alertsBom', { count: bomAlertCount })}
                </button>
              ) : (
                <Badge className='h-5 shrink-0 rounded-full border-none bg-blue-500/10 px-2 text-[10px] font-semibold text-blue-600'>
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
