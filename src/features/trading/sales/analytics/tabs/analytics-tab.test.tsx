// @vitest-environment jsdom

import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  industrialHeaderMock,
  selectDropdownMock,
  useSalesAnalyticsMock,
  useGlobalProductRankingMock,
} = vi.hoisted(() => ({
  industrialHeaderMock: vi.fn(),
  selectDropdownMock: vi.fn(),
  useSalesAnalyticsMock: vi.fn(),
  useGlobalProductRankingMock: vi.fn(),
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

import { OrdersAnalysisTab } from './analytics-tab'

describe('OrdersAnalysisTab', () => {
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
  })

  it('renders analytics product labels from productDisplay contract fields', () => {
    render(<OrdersAnalysisTab />)

    expect(screen.getAllByText('Road Fork').length).toBeGreaterThanOrEqual(2)
    expect(screen.getByText('trail/disc/v2')).toBeTruthy()
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
})
