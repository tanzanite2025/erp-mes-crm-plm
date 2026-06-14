import { ScanLine } from 'lucide-react'
import { useLanguage } from '@/context/language-provider'
import { ScanPlatformModulePanel } from '@/features/scan-platform'

export function LogisticsScanningConfigTab() {
  const { t } = useLanguage()

  return (
    <div className='flex animate-in flex-col gap-5 duration-700 fade-in'>
      <div className='flex flex-col gap-1.5 rounded-[32px] border border-dashed border-muted/50 bg-muted/5 p-4 md:p-5'>
        <div className='flex items-center gap-2 text-primary'>
          <ScanLine className='size-5' />
          <h2 className='text-base font-black tracking-tighter uppercase italic'>
            {t('logisticsConfig.scanning.title')}
          </h2>
        </div>
        <p className='text-[9px] font-black tracking-widest text-muted-foreground uppercase opacity-60'>
          {t('logisticsConfig.scanning.description')}
        </p>
      </div>

      <ScanPlatformModulePanel />
    </div>
  )
}
