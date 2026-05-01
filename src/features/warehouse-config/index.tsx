import { Outlet } from '@tanstack/react-router'
import { ModuleTabbedLayout } from '@/components/layout/module-tabbed-layout'
import { useLanguage } from '@/context/language-provider'
import { getWarehouseConfigTabs } from './tabs'

export function WarehouseConfig() {
  const { t } = useLanguage()

  return (
    <ModuleTabbedLayout
      title={t('sidebar.items.warehouseConfig')}
      tabs={getWarehouseConfigTabs(t)}
    >
      <Outlet />
    </ModuleTabbedLayout>
  )
}
