import { createLazyFileRoute } from '@tanstack/react-router'
import { PurchaseLogisticsPage } from '@/features/purchase/logistics'

export const Route = createLazyFileRoute('/_authenticated/purchase/logistics')({
  component: PurchaseLogisticsPage,
})
