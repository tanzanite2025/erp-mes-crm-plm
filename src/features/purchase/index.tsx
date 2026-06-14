import { Outlet } from '@tanstack/react-router'
import { useLanguage } from '@/context/language-provider'
import { ModuleTabbedLayout } from '@/components/layout/module-tabbed-layout'
import { getPurchaseTabs } from './tabs'

export function Purchase() {
  const { t } = useLanguage()

  return (
    <ModuleTabbedLayout tabs={getPurchaseTabs(t)}>
      <Outlet />
    </ModuleTabbedLayout>
  )
}
