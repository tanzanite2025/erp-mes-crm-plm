import { ScanLine } from 'lucide-react'
import { useLanguage } from '@/context/language-provider'
import { ScanPlatformModulePanel } from '@/features/scan-platform'

export function LogisticsScanningConfigTab() {
  const { t } = useLanguage()

  return (
    <div className='flex flex-col gap-8 animate-in fade-in duration-700'>
      <div className='flex flex-col gap-1 bg-muted/5 p-6 rounded-[32px] border border-dashed border-muted/50'>
        <div className='flex items-center gap-2 text-primary'>
          <ScanLine className='size-5' />
          <h2 className='text-lg font-black tracking-tighter italic uppercase'>
            {t('logisticsConfig.scanning.title')}
          </h2>
        </div>
        <p className='text-[10px] font-black text-muted-foreground uppercase tracking-widest opacity-60'>
          {t('logisticsConfig.scanning.description')}
        </p>
      </div>

      <ScanPlatformModulePanel />
    </div>
  )
}
