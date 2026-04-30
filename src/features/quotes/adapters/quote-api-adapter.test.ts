import { describe, expect, it } from 'vitest'
import { toQuoteDetailContract, toQuoteSummaryContract } from './quote-api-adapter'
import type { QuoteDetailApiDTO } from '@/features/quotes/contracts/quote-detail-api-dto'
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

  it('does not expose raw owner uuid values in quote list contracts', () => {
    expect(
      toQuoteSummaryContract(
        { ...baseQuote, type: 'retail', ownerName: '96945266-ca9e-494b-9521-4dda39ae688f' },
        0
      ).ownerName
    ).toBe('')
  })

  it('keeps quote detail usable when legacy optional fields are blank', () => {
    const detail = toQuoteDetailContract({
      id: 'quote-1',
      quoteNo: 'Q-001',
      orderName: '',
      customerName: 'Acme',
      customerId: '',
      wechat: '',
      whatsapp: '',
      customerSegment: '',
      type: '',
      status: '',
      currency: '',
      amountLabel: '',
      quantityLabel: '',
      orderDate: '',
      deliveryDate: '',
      paymentMethodName: '',
      paymentTermName: '',
      requirements: '',
      ownerName: '96945266-ca9e-494b-9521-4dda39ae688f',
      updatedAt: '',
      lines: [
        {
          lineNo: 1,
          productModel: '',
          productCode: '',
          specification: '',
          qty: 1,
          price: 2,
          amount: 2,
          uom: '',
          note: '',
        },
      ],
    } satisfies QuoteDetailApiDTO)

    expect(detail.orderName).toBe('Q-001')
    expect(detail.customerId).toBe('')
    expect(detail.wechat).toBe('')
    expect(detail.customerSegment).toBe('new')
    expect(detail.type).toBe('retail')
    expect(detail.status).toBe('draft')
    expect(detail.currency).toBe('CNY')
    expect(detail.ownerName).toBe('')
    expect(detail.lines[0]?.id).toBe('line-1')
    expect(detail.lines[0]?.productModel).toBe('Unnamed product')
    expect(detail.lines[0]?.productCode).toBe('')
  })
})
