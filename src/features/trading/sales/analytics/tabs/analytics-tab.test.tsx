// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const {
  industrialHeaderMock,
  selectDropdownMock,
  useSalesAnalyticsMock,
  useGlobalProductRankingMock,
  useSalesAnalyticsProductDisplayMapMock,
} = vi.hoisted(() => ({
  industrialHeaderMock: vi.fn(),
  selectDropdownMock: vi.fn(),
  useSalesAnalyticsMock: vi.fn(),
  useGlobalProductRankingMock: vi.fn(),
  useSalesAnalyticsProductDisplayMapMock: vi.fn(),
}))

vi.mock('@/context/language-provider', () => ({
  useLanguage: () => ({
    t: (key: string) => key,
    locale: 'zh-CN',
  }),
}))

vi.mock('@/components/uds/industrial-header', () => ({
  IndustrialHeader: (props: unknown) => {
    industrialHeaderMock(props)
    return <div data-testid='industrial-header' />
  },
}))

vi.mock('@/components/select-dropdown', () => ({
  SelectDropdown: (props: unknown) => {
    selectDropdownMock(props)
    return <div data-testid='select-dropdown' />
  },
}))

vi.mock('../hooks/use-sales-analytics', () => ({
  useSalesAnalytics: useSalesAnalyticsMock,
  useGlobalProductRanking: useGlobalProductRankingMock,
}))

vi.mock('../hooks/use-sales-analytics-product-display', () => ({
  useSalesAnalyticsProductDisplayMap: useSalesAnalyticsProductDisplayMapMock,
}))

import { OrdersAnalysisTab } from './analytics-tab'

describe('OrdersAnalysisTab', () => {
  afterEach(() => {
    cleanup()
  })

  beforeEach(() => {
    vi.clearAllMocks()
    useSalesAnalyticsMock.mockReturnValue({
      data: [
        {
          customerId: 'customer-1',
          customerName: 'Acme',
          totalOrders: 3,
          totalAmount: 180,
          products: [
            {
              productId: 'product-1',
              productDisplay: {
                title: 'Road Fork',
                subtitle: 'trail/disc/v2',
                code: 'RF-01',
                fullLabel: 'Road Fork (trail/disc/v2)',
                strategyVersion: 'product-display-v1',
              },
              totalQty: 12,
              orderCount: 3,
              totalAmount: 180,
            },
          ],
        },
      ],
      isLoading: false,
    })
    useGlobalProductRankingMock.mockReturnValue({
      data: [
        {
          productId: 'product-1',
          productDisplay: {
            title: 'Road Fork',
            subtitle: 'trail/disc/v2',
            code: 'RF-01',
            fullLabel: 'Road Fork (trail/disc/v2)',
            strategyVersion: 'product-display-v1',
          },
          totalQty: 12,
          orderCount: 3,
          totalAmount: 180,
        },
      ],
      isLoading: false,
    })
    useSalesAnalyticsProductDisplayMapMock.mockReturnValue(new Map([[
      'product-1',
      {
        title: 'Road Fork',
        code: 'RF-01',
        summaryItems: [],
        summaryText: '高刚性 / 碟刹',
        fullLabel: 'Road Fork (高刚性 / 碟刹)',
        strategyVersion: 'product-display-v2',
      },
    ]]))
  })

  it('prefers authority v2 projection fields over analytics compat display fields', () => {
    render(<OrdersAnalysisTab />)

    expect(screen.getAllByText('Road Fork').length).toBeGreaterThanOrEqual(2)
    expect(screen.getByText('高刚性 / 碟刹')).toBeTruthy()
    expect(screen.queryByText('trail/disc/v2')).toBeNull()
    expect(screen.getAllByText('RF-01').length).toBeGreaterThanOrEqual(1)
    expect(selectDropdownMock.mock.calls[0]?.[0]).toEqual(
      expect.objectContaining({
        value: 'all',
        items: [
          { label: '全部', value: 'all' },
          { label: 'Acme', value: 'customer-1' },
        ],
      })
    )
    expect(industrialHeaderMock.mock.calls[0]?.[0]).toEqual(
      expect.objectContaining({
        title: '订单分析',
      })
    )
  })

  it('falls back to analytics compat display when authority projection is missing', () => {
    useSalesAnalyticsProductDisplayMapMock.mockReturnValue(new Map())

    render(<OrdersAnalysisTab />)

    expect(screen.getByText('trail/disc/v2')).toBeTruthy()
    expect(screen.queryByText('高刚性 / 碟刹')).toBeNull()
  })
})
