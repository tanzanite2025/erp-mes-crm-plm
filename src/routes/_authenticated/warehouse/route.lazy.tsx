import { createLazyFileRoute } from '@tanstack/react-router'
import { Warehouse } from '@/features/warehouse'

export const Route = createLazyFileRoute('/_authenticated/warehouse')({
  component: Warehouse,
})
