import { Outlet } from '@tanstack/react-router'
import { LayoutDashboard } from 'lucide-react'
import { ModuleTabbedLayout } from '@/components/layout/module-tabbed-layout'
import { IndustrialHeader } from '@/components/uds/industrial-header'
import { useLanguage } from '@/context/language-provider'
import { getDashboardTabs } from './tabs'

export function DashboardLayout() {
  const { t } = useLanguage()
  const tabs = getDashboardTabs(t)

  return (
    <ModuleTabbedLayout tabs={tabs}>
      <div className='flex flex-col gap-6 px-4 pb-6 pt-0 md:gap-8 md:px-6 animate-in fade-in duration-700'>
        <IndustrialHeader
          title={t('dashboard.page.title')}
          description={t('dashboard.page.description')}
          icon={LayoutDashboard}
        />
        <Outlet />
      </div>
    </ModuleTabbedLayout>
  )
}
