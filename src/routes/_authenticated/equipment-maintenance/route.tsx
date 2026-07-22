import { createFileRoute, Outlet } from '@tanstack/react-router'
import { useLanguage } from '@/context/language-provider'
import { ModuleTabbedLayout } from '@/components/layout/module-tabbed-layout'
import { getMaintenanceCenterTabs } from '@/features/equipment-maintenance/tabs'

export const Route = createFileRoute('/_authenticated/equipment-maintenance')({
  component: EquipmentMaintenanceLayout,
})

function EquipmentMaintenanceLayout() {
  const { t } = useLanguage()

  return (
    <ModuleTabbedLayout tabs={getMaintenanceCenterTabs(t)}>
      <Outlet />
    </ModuleTabbedLayout>
  )
}
