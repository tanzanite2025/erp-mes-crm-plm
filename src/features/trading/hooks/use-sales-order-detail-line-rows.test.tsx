// @vitest-environment jsdom

import { renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { SalesOrder } from '../data/schema'
import { useSalesOrderDetailLineRows } from './use-sales-order-detail-line-rows'

function buildOrder(): SalesOrder {
  return {
    id: 'so-1',
    orderNo: 'SO-001',
    customerName: 'Customer A',
    customerId: 'cust-1',
    type: 'NORMAL',
    currency: 'CNY',
    exchangeRateSnapshot: 1,
    classification: 'GENERAL',
    status: 'InProgress',
    amount: 125,
    quantity: 10,
    orderDate: '2026-05-10',
    deliveryDate: '2026-05-20',
    lines: [
      {
        id: 1,
        lineNo: 1,
        productId: 'prod-1',
        productModel: 'MODEL-A',
        productCode: 'CODE-A',
        specification: 'Spec A',
        productDisplayTitleSnapshot: 'Fork Alpha',
        productDisplaySubtitleSnapshot: 'trail/disc/v2',
        productDisplayCodeSnapshot: 'CODE-A',
        productDisplayFullLabelSnapshot: 'Fork Alpha (trail/disc/v2)',
        productDisplayStrategyVersionSnapshot: 'product-display-v1',
        description: 'Desc A',
        qty: 10,
        uom: 'PCS',
        price: 12.5,
        amount: 125,
        deliveredQty: 5,
        customerPartNo: 'CP-1',
        jobNo: 'JOB-1',
        orderDate: '2026-05-10',
        status: 'InProgress',
        returnedQuantity: 0,
        remainingReturnableQuantity: 10,
      },
    ],
    version: 1,
    createdAt: '2026-05-10T00:00:00.000Z',
    updatedAt: '2026-05-10T00:00:00.000Z',
    isDeleted: false,
  }
}

describe('useSalesOrderDetailLineRows', () => {
  it('derives display title and subtitle from snapshot fields', () => {
    const { result } = renderHook(() => useSalesOrderDetailLineRows(buildOrder()))

    expect(result.current[0]?.displayTitle).toBe('Fork Alpha')
    expect(result.current[0]?.displaySubtitle).toBe('trail/disc/v2')
  })

  it('falls back to product model and description placeholder when snapshots are absent', () => {
    const order = buildOrder()
    order.lines[0] = {
      ...order.lines[0],
      productDisplayTitleSnapshot: '',
      productDisplaySubtitleSnapshot: '',
      productDisplayFullLabelSnapshot: '',
      specification: '',
      description: '',
    }

    const { result } = renderHook(() => useSalesOrderDetailLineRows(order))

    expect(result.current[0]?.displayTitle).toBe('未识别产品')
    expect(result.current[0]?.displaySubtitle).toBe('--')
  })
})
