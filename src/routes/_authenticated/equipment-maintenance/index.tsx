import { createFileRoute, Navigate } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/equipment-maintenance/')({
  component: EquipmentMaintenanceIndex,
})

function EquipmentMaintenanceIndex() {
  return <Navigate to='/equipment-maintenance/overview' />
}
