import { createLazyFileRoute } from '@tanstack/react-router'
import { PurchasePayablesTab } from '@/features/trading/payables/tabs/purchase-payables-tab'

export const Route = createLazyFileRoute('/_authenticated/purchase/payables')({
  component: PurchasePayablesTab,
})
