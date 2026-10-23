import { Settings2 } from 'lucide-react'
import { useLanguage } from '@/context/language-provider'
import { BOMSharedSectionManagementPanel } from '../components/bom-section-management/bom-shared-section-management-panel'

export function BOMSectionConfigTab() {
  const { t } = useLanguage()
  return (
    <div className='flex flex-col gap-4'>
      <div className='space-y-2 rounded-2xl border border-dashed border-border/60 bg-muted/10 p-4'>
        <h1 className='flex items-center gap-2 text-lg font-bold'>
          <Settings2 className='size-5 text-blue-600' />
          {t('engineering.bomSectionConfig.title')}
        </h1>
        <p className='text-xs leading-relaxed text-muted-foreground'>
          {t('engineering.bomSectionConfig.sharedScopeHint')}
        </p>
      </div>
      <BOMSharedSectionManagementPanel className='min-h-[520px] md:h-[calc(100dvh-250px)] md:min-h-[440px] md:flex-none' />
    </div>
  )
}
