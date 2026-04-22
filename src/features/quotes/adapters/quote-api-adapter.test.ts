import { describe, expect, it } from 'vitest'
import { toQuoteSummaryContract } from './quote-api-adapter'
import type { QuoteListItemApiDTO } from '@/features/quotes/contracts/quote-api-dto'

const baseQuote = {
  id: 'quote-1',
  quoteNo: 'Q-001',
  customerName: 'Acme',
  customerSegment: 'new',
  status: 'pending',
  updatedAt: '2026-04-22 10:00',
  amountLabel: 'CNY 100.00',
  itemCount: 1,
  ownerName: 'tester',
  productSummary: 'Product',
} satisfies Omit<QuoteListItemApiDTO, 'type'>

describe('quote-api-adapter', () => {
  it('normalizes sales-order type aliases into quote list types', () => {
    expect(toQuoteSummaryContract({ ...baseQuote, type: 'CUSTOMER' }, 0).quoteType).toBe('retail')
    expect(toQuoteSummaryContract({ ...baseQuote, type: 'SAM' }, 0).quoteType).toBe('sample')
    expect(toQuoteSummaryContract({ ...baseQuote, type: 'OUTSOURCE' }, 0).quoteType).toBe('wholesale')
  })

  it('normalizes sales-order statuses into quote list statuses', () => {
    expect(toQuoteSummaryContract({ ...baseQuote, type: 'retail', status: 'InProgress' }, 0).status).toBe('pending')
    expect(toQuoteSummaryContract({ ...baseQuote, type: 'retail', status: 'Done' }, 0).status).toBe('converted')
    expect(toQuoteSummaryContract({ ...baseQuote, type: 'retail', status: 'Canceled' }, 0).status).toBe('voided')
  })
})
