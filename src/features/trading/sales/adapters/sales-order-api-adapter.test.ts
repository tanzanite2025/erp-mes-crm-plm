import { describe, expect, it } from 'vitest'
import {
  toSalesOrderContract,
  toSalesOrderListPageContract,
} from './sales-order-api-adapter'

describe('sales-order-api-adapter', () => {
  const baseOrder = {
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
  }

  it('defaults missing lines to an empty array so list payloads cannot break the adapter', () => {
    expect(
      toSalesOrderContract({
        ...baseOrder,
        lines: undefined as unknown as [],
      }).lines
    ).toEqual([])
  })

  it.each(['Canceled', 'Cancelled', 'canceled', 'cancelled'])(
    'normalizes %s order and line statuses as Canceled',
    (status) => {
      const order = toSalesOrderContract({
        ...baseOrder,
        status,
        lines: [
          {
            id: 1,
            lineNo: 1,
            productId: 'product-1',
            productModel: 'MTB-01',
            productCode: 'MTB-01',
            specification: '',
            description: '',
            qty: 2,
            uom: 'PCS',
            price: 50,
            amount: 100,
            deliveredQty: 0,
            customerPartNo: '',
            jobNo: '',
            orderDate: '2026-04-18',
            status,
            returnedQuantity: 0,
            remainingReturnableQuantity: 2,
          },
        ],
      })

      expect(order.status).toBe('Canceled')
      expect(order.lines[0]?.status).toBe('Canceled')
    }
  )

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
