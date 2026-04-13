import { createLazyFileRoute } from '@tanstack/react-router'
import { WholesaleQuoteTemplatesTab } from '@/features/quotes/tabs/index'

export const Route = createLazyFileRoute('/_authenticated/quotes/wholesale')({
  component: WholesaleQuoteTemplatesTab,
})
