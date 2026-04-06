import { Outlet } from '@tanstack/react-router'
import { ModuleTabbedLayout } from '@/components/layout/module-tabbed-layout'
import { useLanguage } from '@/context/language-provider'
import { getPurchaseTabs } from './tabs'

export function Purchase() {
  const { t } = useLanguage()

  return (
    <ModuleTabbedLayout title={t('purchase.tabs.title')} tabs={getPurchaseTabs(t)}>
      <Outlet />
    </ModuleTabbedLayout>
  )
}
