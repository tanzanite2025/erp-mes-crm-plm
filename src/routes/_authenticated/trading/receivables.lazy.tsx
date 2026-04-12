import { createLazyFileRoute } from '@tanstack/react-router'
import { SalesReceivablesTab } from '@/features/trading/receivables/tabs/sales-receivables-tab'

export const Route = createLazyFileRoute('/_authenticated/trading/receivables')({
  component: SalesReceivablesTab,
})
