import { Outlet } from '@tanstack/react-router'
import { useLanguage } from '@/context/language-provider'
import { ModuleTabbedLayout } from '@/components/layout/module-tabbed-layout'
import { getWarehouseTabs } from './tabs'

export function Warehouse() {
  const { t } = useLanguage()

  return (
    <ModuleTabbedLayout tabs={getWarehouseTabs(t)}>
      <Outlet />
    </ModuleTabbedLayout>
  )
}
