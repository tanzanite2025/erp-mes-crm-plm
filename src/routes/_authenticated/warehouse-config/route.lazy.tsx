import { createLazyFileRoute } from '@tanstack/react-router'
import { WarehouseConfig } from '@/features/warehouse-config'

export const Route = createLazyFileRoute('/_authenticated/warehouse-config')({
  component: WarehouseConfig,
})
