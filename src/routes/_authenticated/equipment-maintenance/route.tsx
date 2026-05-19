import { createFileRoute, Outlet } from '@tanstack/react-router'
import { ModuleTabbedLayout } from '@/components/layout/module-tabbed-layout'
import { useLanguage } from '@/context/language-provider'
import { getMaintenanceCenterTabs } from '@/features/equipment-tooling/tabs/maintenance-center-tabs'

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
