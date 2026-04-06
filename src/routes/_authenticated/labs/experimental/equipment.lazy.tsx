import { createLazyFileRoute } from '@tanstack/react-router'
import { LabEquipmentPage } from '@/features/labs/experimental/pages/equipment'

export const Route = createLazyFileRoute('/_authenticated/labs/experimental/equipment')({
  component: LabEquipmentPage,
})
