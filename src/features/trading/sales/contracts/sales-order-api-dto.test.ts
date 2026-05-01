import { describe, expect, it } from 'vitest'
import {
  deserializeSalesOrderApiDTO,
  deserializeSalesOrderListPageApiDTO,
} from './sales-order-api-dto'

const baseOrder = {
  id: 'order-1',
  orderNo: 'SO-001',
  orderName: 'Sales Order 001',
  customerName: 'Acme',
  customerId: 'customer-1',
  type: 'NORMAL',
  currency: 'CNY',
  exchangeRateSnapshot: 1,
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
  createdAt: '2026-04-18T00:00:00.000Z',
  updatedAt: '2026-04-18T00:00:00.000Z',
  updatedBy: 'tester',
  isDeleted: false,
  version: 1,
  evidences: [],
  fulfillmentRate: 0,
}

describe('sales-order-api-dto', () => {
  it('requires lines on detail responses', () => {
    expect(() => deserializeSalesOrderApiDTO(baseOrder)).toThrow()
  })

  it('accepts detail responses with lines', () => {
    expect(
      deserializeSalesOrderApiDTO({
        ...baseOrder,
        lines: [
          {
            id: 1,
            lineNo: 1,
            productId: 'product-1',
            productModel: 'PM-001',
            productCode: 'PC-001',
            specification: 'spec',
            appearanceId: 'appearance-1',
            appearanceNameSnapshot: 'UD',
            appearanceBarcodeCodeSnapshot: '1',
            appearanceDescriptionSnapshot: '澶栬浣嶅€? 1',
            appearanceImageUrlSnapshot: '/uploads/appearance/ud.png',
            description: 'desc',
            qty: 2,
            uom: 'PCS',
            price: 10,
            amount: 20,
            deliveredQty: 0,
            customerPartNo: 'CP-001',
            jobNo: 'JOB-001',
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
            remainingReturnableQuantity: 2,
          },
        ],
      })
    ).toEqual({
      ...baseOrder,
      lines: [
        {
          id: 1,
          lineNo: 1,
          productId: 'product-1',
          productModel: 'PM-001',
          productCode: 'PC-001',
          specification: 'spec',
          appearanceId: 'appearance-1',
          appearanceNameSnapshot: 'UD',
          appearanceBarcodeCodeSnapshot: '1',
          appearanceDescriptionSnapshot: '澶栬浣嶅€? 1',
          appearanceImageUrlSnapshot: '/uploads/appearance/ud.png',
          description: 'desc',
          qty: 2,
          uom: 'PCS',
          price: 10,
          amount: 20,
          deliveredQty: 0,
          customerPartNo: 'CP-001',
          jobNo: 'JOB-001',
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
          remainingReturnableQuantity: 2,
        },
      ],
    })
  })

  it('accepts list responses without lines when withLines is false', () => {
    expect(
      deserializeSalesOrderListPageApiDTO(
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
      deserializeSalesOrderListPageApiDTO(
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
      deserializeSalesOrderListPageApiDTO(
        {
          items: [
            {
              ...baseOrder,
              lines: [
                {
                  id: 1,
                  lineNo: 1,
                  productId: 'product-1',
                  productModel: 'PM-001',
                  productCode: 'PC-001',
                  specification: 'spec',
                  description: 'desc',
                  qty: 2,
                  uom: 'PCS',
                  price: 10,
                  amount: 20,
                  deliveredQty: 0,
                  customerPartNo: 'CP-001',
                  jobNo: 'JOB-001',
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
                  remainingReturnableQuantity: 2,
                },
              ],
            },
          ],
          total: 1,
          page: 1,
          pageSize: 50,
        },
        { withLines: true }
      )
    ).toEqual({
      items: [
        {
          ...baseOrder,
          lines: [
            {
              id: 1,
              lineNo: 1,
              productId: 'product-1',
              productModel: 'PM-001',
              productCode: 'PC-001',
              specification: 'spec',
              description: 'desc',
              qty: 2,
              uom: 'PCS',
              price: 10,
              amount: 20,
              deliveredQty: 0,
              customerPartNo: 'CP-001',
              jobNo: 'JOB-001',
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
              remainingReturnableQuantity: 2,
            },
          ],
        },
      ],
      total: 1,
      page: 1,
      pageSize: 50,
    })
  })

  it('accepts list responses with empty lines when withLines is true', () => {
    expect(
      deserializeSalesOrderListPageApiDTO(
        {
          items: [
            {
              ...baseOrder,
              lines: [],
            },
          ],
          total: 1,
          page: 1,
          pageSize: 50,
        },
        { withLines: true }
      )
    ).toEqual({
      items: [
        {
          ...baseOrder,
          lines: [],
        },
      ],
      total: 1,
      page: 1,
      pageSize: 50,
    })
  })
})
