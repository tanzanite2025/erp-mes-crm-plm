import { Outlet } from '@tanstack/react-router'
import { Package2 } from 'lucide-react'
import { useLanguage } from '@/context/language-provider'
import { ModuleTabbedLayout } from '@/components/layout/module-tabbed-layout'
import { IndustrialHeader } from '@/components/uds/industrial-header'
import { getMaterialRouteTabs } from '../tab-config'

export function MaterialsRouteLayout() {
  const { t, locale } = useLanguage()
  const tabs = getMaterialRouteTabs(locale, t)

  return (
    <ModuleTabbedLayout tabs={tabs}>
      <div className='flex flex-col gap-8'>
        <IndustrialHeader
          icon={Package2}
          title={t('materialArchive.layout.title')}
          description={t('materialArchive.layout.description')}
        />
        <Outlet />
      </div>
    </ModuleTabbedLayout>
  )
}
