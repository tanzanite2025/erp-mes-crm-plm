import { describe, expect, it } from 'vitest'
import {
  toSalesOrderContract,
  toSalesOrderListPageContract,
} from './sales-order-api-adapter'

describe('sales-order-api-adapter', () => {
  it('defaults missing lines to an empty array so list payloads cannot break the adapter', () => {
    expect(
      toSalesOrderContract({
        id: 'order-1',
        orderNo: 'SO-001',
        orderName: 'Sales Order 001',
        customerName: 'Acme',
        customerId: 'customer-1',
        type: 'NORMAL',
        currency: 'CNY',
        classification: 'STANDARD',
        status: 'Pending',
        statusNote: '',
        amount: 100,
        quantity: 2,
        orderDate: '2026-04-18',
        deliveryDate: '2026-04-20',
        paymentMethod: '',
        paymentMethodName: '',
        paymentTerm: '',
        paymentTermName: '',
        purchaseOrderNo: '',
        barcode: 'SO-001',
        requirements: '',
        workflowInstanceId: '',
        createdAt: '2026-04-18T00:00:00.000Z',
        updatedAt: '2026-04-18T00:00:00.000Z',
        updatedBy: 'tester',
        isDeleted: false,
        version: 1,
        evidences: [],
        fulfillmentRate: 0,
        lines: undefined as unknown as [],
      }).lines
    ).toEqual([])
  })

  it('does not synthesize missing list items into an empty page', () => {
    expect(() =>
      toSalesOrderListPageContract({
        total: 0,
        page: 1,
        pageSize: 50,
      } as never)
    ).toThrow()
  })
})
