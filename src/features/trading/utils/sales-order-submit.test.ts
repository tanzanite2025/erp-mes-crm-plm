import { describe, expect, it } from 'vitest'
import type { SalesOrder, SalesOrderFormValues } from '../data/schema'
import { sanitizeSalesOrderDelta, sanitizeSalesOrderSubmitValues } from './sales-order-submit'

const baseOrder: SalesOrder = {
  id: 'order-1',
  orderNo: 'SO-001',
  orderName: 'Sales Order 001',
  customerName: 'Acme',
  customerId: 'customer-1',
  type: 'NORMAL',
  currency: 'CNY',
  exchangeRateSnapshot: 1,
  paymentMethod: '',
  paymentMethodName: '',
  paymentTerm: '',
  paymentTermName: '',
  classification: 'STANDARD',
  status: 'Pending',
  statusNote: '',
  amount: 20,
  quantity: 2,
  orderDate: '2026-04-18',
  deliveryDate: '2026-04-20',
  purchaseOrderNo: '',
  barcode: 'SO-001',
  requirements: '',
  evidences: [],
  createdAt: '2026-04-18T00:00:00.000Z',
  updatedAt: '2026-04-18T00:00:00.000Z',
  updatedBy: 'tester',
  isDeleted: false,
  version: 1,
  fulfillmentRate: 0,
  availableActions: [],
  lines: [
    {
      id: 1,
      lineNo: 1,
      productId: 'product-1',
      productModel: 'PM-001',
      productCode: 'PC-001',
      specification: 'spec',
      modelCodeSnapshot: '',
      holePrefixSnapshot: '',
      appearanceId: '',
      appearanceNameSnapshot: '',
      appearanceBarcodeCodeSnapshot: '',
      appearanceDescriptionSnapshot: '',
      appearanceImageUrlSnapshot: '',
      description: 'desc',
      qty: 2,
      uom: 'PCS',
      price: 10,
      amount: 20,
      deliveredQty: 0,
      customerPartNo: '',
      jobNo: '',
      note: '',
      drillingPlanId: '',
      labelingPlanId: '',
      holeCount: 0,
      route: '',
      orderDate: '2026-04-18',
      status: 'Pending',
      claimedBy: '',
      claimedAt: '',
      returnedQuantity: 0,
      remainingReturnableQuantity: 0,
    },
  ],
}

describe('sales-order-submit', () => {
  it('sanitizes derived submit values', () => {
    const draft: SalesOrderFormValues = {
      orderNo: baseOrder.orderNo,
      orderName: baseOrder.orderName,
      customerName: baseOrder.customerName,
      customerId: baseOrder.customerId,
      type: baseOrder.type,
      currency: baseOrder.currency,
      exchangeRateSnapshot: baseOrder.exchangeRateSnapshot,
      paymentMethod: baseOrder.paymentMethod,
      paymentMethodName: baseOrder.paymentMethodName,
      paymentTerm: baseOrder.paymentTerm,
      paymentTermName: baseOrder.paymentTermName,
      classification: baseOrder.classification,
      status: baseOrder.status,
      statusNote: baseOrder.statusNote,
      amount: 999,
      quantity: 888,
      orderDate: baseOrder.orderDate,
      deliveryDate: baseOrder.deliveryDate,
      purchaseOrderNo: baseOrder.purchaseOrderNo,
      barcode: baseOrder.barcode,
      requirements: baseOrder.requirements,
      evidences: baseOrder.evidences,
      lines: baseOrder.lines.map((line) => ({
        ...line,
        amount: 777,
      })),
      fulfillmentRate: baseOrder.fulfillmentRate,
      version: baseOrder.version,
    }

    const sanitized = sanitizeSalesOrderSubmitValues(draft)

    expect(sanitized.amount).toBe(0)
    expect(sanitized.quantity).toBe(0)
    expect(sanitized.lines[0]?.amount).toBe(0)
  })

  it('sanitizes derived delta fields', () => {
    const sanitized = sanitizeSalesOrderDelta(
      {
        amount: { o: 20, n: 999 },
        quantity: { o: 2, n: 888 },
        lines: {
          o: baseOrder.lines,
          n: baseOrder.lines.map((line) => ({ ...line, qty: 3, amount: 777 })),
        },
      },
      baseOrder
    )

    expect(sanitized.amount).toBeUndefined()
    expect(sanitized.quantity).toBeUndefined()
    expect(Array.isArray(sanitized.lines?.n)).toBe(true)
    expect((sanitized.lines?.n as Array<{ amount: number }>)[0]?.amount).toBe(20)
  })
})
