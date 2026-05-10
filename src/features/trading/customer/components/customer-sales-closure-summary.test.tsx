import type { ReactElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { LanguageProvider } from '@/context/language-provider'
import { CustomerSalesClosureSummaryBlock } from './customer-sales-closure-summary'

function renderWithLanguage(ui: ReactElement) {
  return renderToStaticMarkup(
    <LanguageProvider defaultLocale='zh-CN'>{ui}</LanguageProvider>
  )
}

describe('CustomerSalesClosureSummaryBlock', () => {
  it('shows effective orders and the real scheduling status instead of a fake closure ratio', () => {
    const markup = renderWithLanguage(
      <CustomerSalesClosureSummaryBlock
        summary={{
          customerId: 'cust-1',
          canceledOrderCount: 1,
          effectiveOrderCount: 2,
          primaryStatusCode: 'Scheduling',
          primaryStatusPhase: 'scheduling',
          statusCounts: [
            {
              code: 'Scheduling',
              phase: 'scheduling',
              count: 1,
            },
            {
              code: 'Done',
              phase: 'done',
              count: 1,
            },
            {
              code: 'Canceled',
              phase: 'cancelled',
              count: 1,
            },
          ],
          lastOrderDate: '2026-05-10',
          daysSinceLastOrder: 1,
          totalOrders: 3,
        }}
      />
    )

    expect(markup).toContain('有效订单 2 单')
    expect(markup).toContain('排产中')
    expect(markup).toContain('状态分布：排产中 1 单 / 已完成 1 单')
    expect(markup).toContain('已作废 1 单')
    expect(markup).not.toContain('1/1')
    expect(markup).not.toContain('全部闭环')
  })

  it('shows canceled-only customers as no effective orders instead of completed orders', () => {
    const markup = renderWithLanguage(
      <CustomerSalesClosureSummaryBlock
        summary={{
          customerId: 'cust-2',
          canceledOrderCount: 1,
          effectiveOrderCount: 0,
          primaryStatusCode: 'Canceled',
          primaryStatusPhase: 'cancelled',
          statusCounts: [
            {
              code: 'Canceled',
              phase: 'cancelled',
              count: 1,
            },
          ],
          lastOrderDate: '2026-05-09',
          daysSinceLastOrder: 2,
          totalOrders: 1,
        }}
      />
    )

    expect(markup).toContain('无有效订单')
    expect(markup).toContain('仅作废订单')
    expect(markup).toContain('已作废 1 单')
    expect(markup).not.toContain('全部闭环')
  })
})
