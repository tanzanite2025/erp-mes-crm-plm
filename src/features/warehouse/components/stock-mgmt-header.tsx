import { AlertTriangle, Warehouse } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { IndustrialHeader } from '@/components/uds/industrial-header'
import { useLanguage } from '@/context/language-provider'

interface StockMgmtHeaderProps {
    alertCount: number
    totalAssets: number
}

export function StockMgmtHeader({ alertCount, totalAssets }: StockMgmtHeaderProps) {
    const { t } = useLanguage()

    return (
        <IndustrialHeader
            title={t('warehouse.stock.title')}
            description={t('warehouse.stock.subtitle')}
            icon={Warehouse}
            statusBadge={
            <div className='flex items-center gap-2'>
                <Badge variant="outline" className='bg-primary/5 text-primary border-dashed border-primary/20 text-[10px] h-5 px-2 rounded-full flex items-center gap-1.5 shrink-0'>
                    <span className='font-semibold text-muted-foreground/60'>ASSETS</span>
                    <span className='font-black tabular-nums'>¥{totalAssets.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </Badge>
                
                {alertCount > 0 && (
                    <Badge className='bg-rose-500/10 text-rose-600 border-none font-semibold text-[10px] px-2 h-5 rounded-full shrink-0'>
                        <AlertTriangle className='size-2.5 mr-1' />
                        {t('warehouse.stock.alerts', { count: alertCount })}
                    </Badge>
                )}
            </div>
            }
        />
    )
}
