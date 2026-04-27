import { type CustomerQuoteSummaryItem } from '@/features/quotes/services/customer-quote-summary-service'
import type { CustomerSalesClosureSummary } from '../services/customer-sales-closure-summary-service'
import type { CustomerSalesReturnSummary } from '../services/customer-sales-return-summary-service'
import { CustomerQuoteEntryBlock } from './customer-quote-entry-block'
import { CustomerSalesClosureSummaryBlock } from './customer-sales-closure-summary'
import { CustomerSalesReturnSummaryBlock } from './customer-sales-return-summary-block'

export type CustomerQuoteSummaryState = {
  items: CustomerQuoteSummaryItem[]
  isLoading: boolean
  isError: boolean
  errorMessage?: string
  onRetry?: () => void
}

type CustomerDynamicSummaryLayerProps = {
  customerName: string
  quoteSummary?: CustomerQuoteSummaryState
  salesClosureSummary?: CustomerSalesClosureSummary
  salesReturnSummary?: CustomerSalesReturnSummary
  onOpenSalesReturns: () => void
  onOpenQuote: (quoteId: string) => void
  onCreateQuote: () => void
}

export function CustomerDynamicSummaryLayer({
  customerName,
  quoteSummary,
  salesClosureSummary,
  salesReturnSummary,
  onOpenSalesReturns,
  onOpenQuote,
  onCreateQuote,
}: CustomerDynamicSummaryLayerProps) {
  const resolvedQuoteSummary = quoteSummary ?? {
    items: [],
    isLoading: false,
    isError: false,
    errorMessage: undefined,
    onRetry: undefined,
  }

  return (
    <div className='space-y-2.5 sm:space-y-3'>
      <CustomerSalesClosureSummaryBlock summary={salesClosureSummary} />
      <CustomerSalesReturnSummaryBlock
        summary={salesReturnSummary}
        onOpenSalesReturns={onOpenSalesReturns}
        compact
      />
      <CustomerQuoteEntryBlock
        customerName={customerName}
        quotes={resolvedQuoteSummary.items}
        isLoading={resolvedQuoteSummary.isLoading}
        isError={resolvedQuoteSummary.isError}
        errorMessage={resolvedQuoteSummary.errorMessage}
        onRetry={resolvedQuoteSummary.onRetry}
        onOpenQuote={onOpenQuote}
        onCreateQuote={onCreateQuote}
        compact
      />
    </div>
  )
}
