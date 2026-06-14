import { Outlet } from '@tanstack/react-router'
import { LayoutDashboard } from 'lucide-react'
import { useLanguage } from '@/context/language-provider'
import { ModuleTabbedLayout } from '@/components/layout/module-tabbed-layout'
import { IndustrialHeader } from '@/components/uds/industrial-header'
import { getDashboardTabs } from './tabs'

export function DashboardLayout() {
  const { t } = useLanguage()
  const tabs = getDashboardTabs(t)

  return (
    <ModuleTabbedLayout tabs={tabs}>
      <div className='flex animate-in flex-col gap-6 px-4 pt-0 pb-6 duration-700 fade-in md:gap-8 md:px-6'>
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
