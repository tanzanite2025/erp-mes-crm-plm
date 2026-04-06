import { createLazyFileRoute } from '@tanstack/react-router'
import { WarehouseReports } from '@/features/warehouse/tabs/index'

export const Route = createLazyFileRoute('/_authenticated/warehouse/reports')({
  component: WarehouseReports,
})
