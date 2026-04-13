import { createLazyFileRoute } from '@tanstack/react-router'
import { RetailQuoteTemplatesTab } from '@/features/quotes/tabs/index'

export const Route = createLazyFileRoute('/_authenticated/quotes/retail')({
  component: RetailQuoteTemplatesTab,
})
