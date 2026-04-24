import { Outlet } from '@tanstack/react-router'
import { Database } from 'lucide-react'
import { ModuleTabbedLayout } from '@/components/layout/module-tabbed-layout'
import { IndustrialHeader } from '@/components/uds/industrial-header'
import { useLanguage } from '@/context/language-provider'
import { getRawMaterialsTabs } from './tabs'

export function RawMaterialsModule() {
  const { t } = useLanguage()

  return (
    <ModuleTabbedLayout tabs={getRawMaterialsTabs(t)}>
      <div className='flex flex-col gap-8 animate-in fade-in duration-700'>
        <IndustrialHeader
          icon={Database}
          title={t('rawMaterials.moduleTitle')}
          gradient
        />
        <Outlet />
      </div>
    </ModuleTabbedLayout>
  )
}
