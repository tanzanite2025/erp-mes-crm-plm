import { Outlet } from '@tanstack/react-router'
import { ModuleTabbedLayout } from '@/components/layout/module-tabbed-layout'
import { useLanguage } from '@/context/language-provider'
import { getQuoteTabs } from './tabs'

export function Quotes() {
  const { t } = useLanguage()

  return (
    <ModuleTabbedLayout title={t('sidebar.items.quoteManagement')} tabs={getQuoteTabs(t)}>
      <Outlet />
    </ModuleTabbedLayout>
  )
}
