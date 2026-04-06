import { AlertTriangle, Warehouse } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { PageHeader } from '@/components/layout/page-header'
import { useLanguage } from '@/context/language-provider'

interface StockMgmtHeaderProps {
    alertCount: number
    totalAssets: number
}

export function StockMgmtHeader({ alertCount, totalAssets }: StockMgmtHeaderProps) {
    const { t } = useLanguage()

    return (
        <PageHeader 
            title={t('warehouse.stock.title')} 
            description={t('warehouse.stock.subtitle')} 
            icon={Warehouse}
        >
            <div className='flex items-center gap-2'>
                <Badge variant="outline" className='bg-primary/5 text-primary border-dashed border-primary/20 font-mono text-[9px] md:text-[10px] h-5 px-2 rounded-full flex items-center gap-1.5 shrink-0'>
                    <span className='font-black opacity-40 italic'>ASSETS:</span>
                    <span className='font-black'>¥{totalAssets.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </Badge>
                
                {alertCount > 0 && (
                    <Badge className='bg-rose-500/10 text-rose-600 border-none font-black text-[7px] md:text-[8px] uppercase tracking-widest px-2 h-5 animate-pulse rounded-full shrink-0'>
                        <AlertTriangle className='size-2.5 mr-1' />
                        {t('warehouse.stock.alerts', { count: alertCount })}
                    </Badge>
                )}
            </div>
        </PageHeader>
    )
}
