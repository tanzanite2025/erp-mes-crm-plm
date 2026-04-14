import { Outlet } from '@tanstack/react-router'
import { ModuleTabbedLayout } from '@/components/layout/module-tabbed-layout'
import { useLanguage } from '@/context/language-provider'
import { getShippingManagementTabs } from './tabs'

export function ShippingManagementModule() {
  const { t } = useLanguage()

  return (
    <ModuleTabbedLayout tabs={getShippingManagementTabs(t)}>
      <Outlet />
    </ModuleTabbedLayout>
  )
}
