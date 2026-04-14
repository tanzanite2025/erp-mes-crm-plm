import { Truck } from 'lucide-react'
import { LogisticsSandboxDashboard } from '@/features/sandbox/logistics-api/components/logistics-sandbox-dashboard'
import { useLanguage } from '@/context/language-provider'

export function LogisticsPlatformsTab() {
  const { t } = useLanguage()

  return (
    <div className='flex flex-col gap-8 animate-in fade-in duration-700'>
      <div className='flex flex-col gap-1 bg-muted/5 p-6 rounded-[32px] border border-dashed border-muted/50'>
        <div className='flex items-center gap-2 text-primary'>
          <Truck className='size-5' />
          <h2 className='text-lg font-black tracking-tighter italic uppercase'>
            {t('logisticsConfig.platforms.title')}
          </h2>
        </div>
        <p className='text-[10px] font-black text-muted-foreground uppercase tracking-widest opacity-60'>
          {t('logisticsConfig.platforms.description')}
        </p>
      </div>

      <LogisticsSandboxDashboard />
    </div>
  )
}
