import { createFileRoute } from '@tanstack/react-router'
import { PurchaseLogisticsPage } from '@/features/purchase-logistics'

export const Route = createFileRoute('/_authenticated/purchase/logistics')({
  component: PurchaseLogisticsPage,
})
