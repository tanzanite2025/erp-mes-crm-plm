import { describe, expect, it } from 'vitest'
import {
  deserializeConfirmPurchaseReceiptResponseApiDTO,
  deserializePurchaseOrderApiDTO,
  deserializePurchaseOrderListPageApiDTO,
} from './purchase-order-api-dto'

const baseOrder = {
  id: 'po-1',
  orderNo: 'PO-001',
  supplierName: 'Supplier A',
  supplierId: 'supplier-1',
  status: 'Draft',
  amount: 100,
  orderDate: '2026-04-18',
  expectedDate: '2026-04-25',
  purchaser: 'buyer',
  currency: 'CNY',
  exchangeRate: 1,
  paymentMethod: '',
  paymentMethodName: '',
  paymentTerm: '',
  paymentTermName: '',
  note: '',
  workflowInstanceId: '',
  isDeleted: false,
  createdAt: '2026-04-18T00:00:00.000Z',
  updatedAt: '2026-04-18T00:00:00.000Z',
  version: 1,
  evidences: [],
}

const line = {
  id: 1,
  version: 1,
  lineNo: 1,
  materialId: 'material-1',
  materialName: 'Copper',
  materialCode: 'MAT-001',
  specification: 'spec',
  qty: 2,
  uom: 'PCS',
  price: 10,
  amount: 20,
  expectedDate: '2026-04-25',
  receivedQty: 0,
  returnedQty: 0,
  status: 'Draft',
  note: '',
}

describe('purchase-order-api-dto', () => {
  it('requires lines on detail responses', () => {
    expect(() => deserializePurchaseOrderApiDTO(baseOrder)).toThrow()
  })

  it('accepts detail responses with lines', () => {
    expect(
      deserializePurchaseOrderApiDTO({
        ...baseOrder,
        lines: [line],
      })
    ).toEqual({
      ...baseOrder,
      lines: [line],
    })
  })

  it('accepts list responses without lines when withLines is false', () => {
    expect(
      deserializePurchaseOrderListPageApiDTO(
        {
          items: [baseOrder],
          total: 1,
          page: 1,
          pageSize: 50,
        },
        { withLines: false }
      )
    ).toEqual({
      items: [baseOrder],
      total: 1,
      page: 1,
      pageSize: 50,
    })
  })

  it('rejects list responses that omit lines when withLines is true', () => {
    expect(() =>
      deserializePurchaseOrderListPageApiDTO(
        {
          items: [baseOrder],
          total: 1,
          page: 1,
          pageSize: 50,
        },
        { withLines: true }
      )
    ).toThrow()
  })

  it('accepts list responses with lines when withLines is true', () => {
    expect(
      deserializePurchaseOrderListPageApiDTO(
        {
          items: [{ ...baseOrder, lines: [line] }],
          total: 1,
          page: 1,
          pageSize: 50,
        },
        { withLines: true }
      )
    ).toEqual({
      items: [{ ...baseOrder, lines: [line] }],
      total: 1,
      page: 1,
      pageSize: 50,
    })
  })

  it('requires lines on confirm receipt purchaseOrder responses', () => {
    expect(() =>
      deserializeConfirmPurchaseReceiptResponseApiDTO({
        purchaseOrder: baseOrder,
        createdInboundRecords: [{ id: 'inbound-1' }],
      })
    ).toThrow()
  })
})
