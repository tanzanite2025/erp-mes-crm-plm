import { createLazyFileRoute } from '@tanstack/react-router'
import WarehouseCategory from '@/features/warehouse/tabs/warehouse-category'

export const Route = createLazyFileRoute(
  '/_authenticated/warehouse-config/category'
)({
  component: WarehouseCategory,
})
