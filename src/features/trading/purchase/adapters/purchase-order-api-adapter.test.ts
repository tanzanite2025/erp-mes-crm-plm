import { describe, expect, it } from 'vitest'
import {
  toPurchaseOrderContract,
  toPurchaseOrderListPageContract,
} from './purchase-order-api-adapter'

describe('purchase-order-api-adapter', () => {
  it('rejects missing lines on full purchase order contracts', () => {
    expect(() =>
      toPurchaseOrderContract({
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
        isDeleted: false,
        createdAt: '2026-04-18T00:00:00.000Z',
        updatedAt: '2026-04-18T00:00:00.000Z',
        version: 1,
        evidences: [],
        lines: undefined as unknown as [],
      })
    ).toThrow()
  })

  it('maps withLines=false list payloads into lightweight contracts without lines', () => {
    const result = toPurchaseOrderListPageContract({
      items: [
        {
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
          isDeleted: false,
          createdAt: '2026-04-18T00:00:00.000Z',
          updatedAt: '2026-04-18T00:00:00.000Z',
          version: 1,
          evidences: [],
        },
      ],
      total: 1,
      page: 1,
      pageSize: 50,
    })

    expect(result.items).toHaveLength(1)
    expect(result.items[0]).not.toHaveProperty('lines')
  })

  it('does not synthesize missing list items into an empty page', () => {
    expect(() =>
      toPurchaseOrderListPageContract({
        page: 1,
        pageSize: 50,
      } as never)
    ).toThrow()
  })

  it('rejects purchase orders that carry non-canonical status values', () => {
    expect(() =>
      toPurchaseOrderContract({
        id: 'po-legacy',
        orderNo: 'PO-LEGACY',
        supplierName: 'Supplier A',
        supplierId: 'supplier-1',
        status: 'Approved',
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
        isDeleted: false,
        createdAt: '2026-04-18T00:00:00.000Z',
        updatedAt: '2026-04-18T00:00:00.000Z',
        version: 1,
        evidences: [],
        lines: [
          {
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
          },
        ],
      })
    ).toThrow('Invalid purchase order status: Approved')
  })

  it('rejects purchase order lines that carry non-canonical status values', () => {
    expect(() =>
      toPurchaseOrderContract({
        id: 'po-line-legacy',
        orderNo: 'PO-LINE-LEGACY',
        supplierName: 'Supplier A',
        supplierId: 'supplier-1',
        status: 'Canceled',
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
        isDeleted: false,
        createdAt: '2026-04-18T00:00:00.000Z',
        updatedAt: '2026-04-18T00:00:00.000Z',
        version: 1,
        evidences: [],
        lines: [
          {
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
            status: 'PendingApproval',
            note: '',
          },
        ],
      })
    ).toThrow('Invalid purchase order status: PendingApproval')
  })
})
