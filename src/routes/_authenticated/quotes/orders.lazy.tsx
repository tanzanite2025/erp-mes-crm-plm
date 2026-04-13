import { createLazyFileRoute } from '@tanstack/react-router'
import { QuoteOrdersTab } from '@/features/quotes/tabs/index'

export const Route = createLazyFileRoute('/_authenticated/quotes/orders')({
  component: QuoteOrdersTab,
})
