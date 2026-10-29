import { Outlet, useLocation } from '@tanstack/react-router'
import { useLanguage } from '@/context/language-provider'
import { ModuleTabbedLayout } from '@/components/layout/module-tabbed-layout'
import {
  getWarehouseProductionMaterialHandoversOperationGuideTabs,
  getWarehouseTabs,
} from './tabs'

export function Warehouse() {
  const { t } = useLanguage()
  const { pathname } = useLocation()
  const isOperationGuide =
    pathname === '/warehouse/production-material-handovers-guide'

  return (
    <ModuleTabbedLayout
      tabs={
        isOperationGuide
          ? getWarehouseProductionMaterialHandoversOperationGuideTabs(t)
          : getWarehouseTabs(t)
      }
      mainClassName={isOperationGuide ? 'overflow-hidden pb-0' : undefined}
      contentClassName={
        isOperationGuide ? 'h-full flex-1 overflow-hidden' : undefined
      }
    >
      <Outlet />
    </ModuleTabbedLayout>
  )
}
