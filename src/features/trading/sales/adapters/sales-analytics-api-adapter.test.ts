import { describe, expect, it } from 'vitest'
import {
  toCustomerAnalyticsArrayContract,
  toProductStatArrayContract,
} from './sales-analytics-api-adapter'

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

describe('sales-analytics-api-adapter', () => {
  it('maps product stats using the local compat display contract', () => {
    expect(toProductStatArrayContract([baseProductStat])).toEqual([baseProductStat])
  })

  it('maps customer analytics lists while preserving compat display snapshots', () => {
    expect(
      toCustomerAnalyticsArrayContract([
        {
          customerId: 'customer-1',
          customerName: 'Acme',
          totalOrders: 3,
          totalAmount: 180,
          products: [baseProductStat],
        },
      ])
    ).toEqual([
      {
        customerId: 'customer-1',
        customerName: 'Acme',
        totalOrders: 3,
        totalAmount: 180,
        products: [baseProductStat],
      },
    ])
  })
})
