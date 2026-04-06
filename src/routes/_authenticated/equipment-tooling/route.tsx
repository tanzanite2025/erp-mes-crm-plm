import { createFileRoute } from '@tanstack/react-router'
import { EquipmentTooling } from '@/features/equipment-tooling'

export const Route = createFileRoute('/_authenticated/equipment-tooling')({
  component: EquipmentTooling,
})
