import { createLazyFileRoute } from '@tanstack/react-router'
import { SalesQuotesTab } from '@/features/trading/quotes/tabs/sales-quotes-tab'

export const Route = createLazyFileRoute('/_authenticated/trading/quotes')({
  component: SalesQuotesTab,
})
