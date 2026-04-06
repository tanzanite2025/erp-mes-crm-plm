import { createLazyFileRoute } from '@tanstack/react-router'
import { PurchaseOrders } from '@/features/purchase/tabs/index'

export const Route = createLazyFileRoute('/_authenticated/purchase/orders')({
  component: PurchaseOrders,
})
