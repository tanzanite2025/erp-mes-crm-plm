import { Truck } from 'lucide-react'
import { useLanguage } from '@/context/language-provider'
import { LogisticsSandboxDashboard } from '@/features/sandbox/logistics-api/components/logistics-sandbox-dashboard'

export function LogisticsPlatformsTab() {
  const { t } = useLanguage()

  return (
    <div className='flex animate-in flex-col gap-8 duration-700 fade-in'>
      <div className='flex flex-col gap-1 rounded-[32px] border border-dashed border-muted/50 bg-muted/5 p-6'>
        <div className='flex items-center gap-2 text-primary'>
          <Truck className='size-5' />
          <h2 className='text-lg font-black tracking-tighter uppercase italic'>
            {t('logisticsConfig.platforms.title')}
          </h2>
        </div>
        <p className='text-[10px] font-black tracking-widest text-muted-foreground uppercase opacity-60'>
          {t('logisticsConfig.platforms.description')}
        </p>
      </div>

      <LogisticsSandboxDashboard />
    </div>
  )
}
