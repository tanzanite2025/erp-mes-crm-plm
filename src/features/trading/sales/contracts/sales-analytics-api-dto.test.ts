import { describe, expect, it } from 'vitest'
import {
  deserializeCustomerAnalyticsListResponseApiDTO,
  deserializeGlobalProductRankingResponseApiDTO,
} from './sales-analytics-api-dto'

const baseProductDisplay = {
  title: 'Road Fork',
  subtitle: 'trail/disc/v2',
  code: 'RF-01',
  fullLabel: 'Road Fork (trail/disc/v2)',
  strategyVersion: 'product-display-v1',
} as const

const baseProductStat = {
  productId: 'product-1',
  productDisplay: baseProductDisplay,
  totalQty: 12,
  orderCount: 3,
  totalAmount: 180,
} as const

describe('sales-analytics-api-dto', () => {
  it('accepts customer analytics payloads with compat product display fields', () => {
    expect(
      deserializeCustomerAnalyticsListResponseApiDTO({
        items: [
          {
            customerId: 'customer-1',
            customerName: 'Acme',
            totalOrders: 3,
            totalAmount: 180,
            products: [baseProductStat],
          },
        ],
        total: 1,
      })
    ).toEqual({
      items: [
        {
          customerId: 'customer-1',
          customerName: 'Acme',
          totalOrders: 3,
          totalAmount: 180,
          products: [baseProductStat],
        },
      ],
      total: 1,
    })
  })

  it('rejects analytics payloads whose strategy version is not the compat v1 value', () => {
    expect(() =>
      deserializeGlobalProductRankingResponseApiDTO({
        items: [
          {
            ...baseProductStat,
            productDisplay: {
              ...baseProductDisplay,
              strategyVersion: 'product-display-v2',
            },
          },
        ],
        total: 1,
      })
    ).toThrow()
  })
})
