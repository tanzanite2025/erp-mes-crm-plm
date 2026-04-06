import { Outlet } from '@tanstack/react-router'
import { ModuleTabbedLayout } from '@/components/layout/module-tabbed-layout'
import { useLanguage } from '@/context/language-provider'
import { getTradingTabs } from './tabs'

export function Trading() {
  const { t } = useLanguage()

  return (
    <ModuleTabbedLayout title={t('trading.tabs.title')} tabs={getTradingTabs(t)}>
      <Outlet />
    </ModuleTabbedLayout>
  )
}
