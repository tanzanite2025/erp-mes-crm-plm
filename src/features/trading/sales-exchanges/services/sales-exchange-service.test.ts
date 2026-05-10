import { beforeEach, describe, expect, it, vi } from 'vitest'

const { apiFetchMock } = vi.hoisted(() => ({
  apiFetchMock: vi.fn(),
}))

vi.mock('@/lib/api-client', () => ({
  apiFetch: apiFetchMock,
}))

import {
  confirmSalesExchangeOldItemInbound,
  getSalesExchangeById,
} from './sales-exchange-service'

beforeEach(() => {
  apiFetchMock.mockReset()
})

describe('sales-exchange-service', () => {
  it('maps product display snapshot fields from exchange line responses', async () => {
    apiFetchMock.mockResolvedValue({
      id: 'exchange-1',
      exchangeNo: 'SE-001',
      sourceSalesOrderId: 'so-1',
      sourceSalesOrderNo: 'SO-001',
      customerName: '客户A',
      status: 'Draft',
      exchangeDate: '2026-05-04T00:00:00.000Z',
      receivedOldItemTrackingNo: '',
      replacementTrackingNo: '',
      exchangeReason: '质量问题',
      exchangeRemarks: '',
      totalExchangeQuantity: 1,
      createdAt: '2026-05-04T00:00:00.000Z',
      updatedAt: '2026-05-04T00:00:00.000Z',
      lines: [
        {
          id: 1,
          lineDraftId: 'sales-exchange-line-1',
          salesOrderLineId: 1,
          lineNo: 1,
          productId: 'prod-1',
          productCode: 'PC-1',
          productModel: 'PM-1',
          specification: 'Spec',
          productDisplayTitleSnapshot: 'Fork Alpha',
          productDisplaySubtitleSnapshot: 'trail/disc/v2',
          productDisplayCodeSnapshot: 'PC-1',
          productDisplayFullLabelSnapshot: 'Fork Alpha (trail/disc/v2)',
          productDisplayStrategyVersionSnapshot: 'product-display-v1',
          description: 'Desc',
          uom: 'PCS',
          originalOrderQuantity: 10,
          deliveredQuantity: 5,
          exchangeQuantity: 1,
          replacementMode: 'sameSalesOrderLineItem',
          replacementProductCode: 'PC-1',
          replacementProductModel: 'PM-1',
          issueCategory: '',
          issueDescription: '',
          recognizedLabelCodes: [],
        },
      ],
      unmatchedLabelCodes: [],
    })

    const result = await getSalesExchangeById('exchange-1')

    expect(result.lines[0]?.productDisplayTitleSnapshot).toBe('Fork Alpha')
    expect(result.lines[0]?.productDisplaySubtitleSnapshot).toBe('trail/disc/v2')
    expect(result.lines[0]?.productDisplayStrategyVersionSnapshot).toBe('product-display-v1')
  })

  it('rejects sales exchange payloads that omit lines instead of treating them as empty lists', async () => {
    apiFetchMock.mockResolvedValue({
      id: 'exchange-1',
      exchangeNo: 'SE-001',
      sourceSalesOrderId: 'so-1',
      sourceSalesOrderNo: 'SO-001',
      customerName: '客户A',
      status: 'draft',
      exchangeDate: '2026-05-04',
      receivedOldItemTrackingNo: '',
      replacementTrackingNo: '',
      exchangeReason: '质量问题',
      exchangeRemarks: '',
      totalExchangeQuantity: 1,
      createdAt: '2026-05-04T00:00:00.000Z',
      updatedAt: '2026-05-04T00:00:00.000Z',
      unmatchedLabelCodes: [],
    })

    await expect(getSalesExchangeById('exchange-1')).rejects.toThrow(
      '[INVALID_RESPONSE] SalesExchangeService.toSalesExchangeContract expected "lines" to be an array.'
    )
  })

  it('rejects old item inbound responses that omit createdInboundRecords instead of treating them as empty lists', async () => {
    apiFetchMock.mockResolvedValue({
      salesExchange: {
        id: 'exchange-1',
        exchangeNo: 'SE-001',
        sourceSalesOrderId: 'so-1',
        sourceSalesOrderNo: 'SO-001',
        customerName: '客户A',
        status: 'draft',
        exchangeDate: '2026-05-04',
        receivedOldItemTrackingNo: '',
        replacementTrackingNo: '',
        exchangeReason: '质量问题',
        exchangeRemarks: '',
        totalExchangeQuantity: 1,
        createdAt: '2026-05-04T00:00:00.000Z',
        updatedAt: '2026-05-04T00:00:00.000Z',
        lines: [],
        unmatchedLabelCodes: [],
      },
    })

    await expect(
      confirmSalesExchangeOldItemInbound('exchange-1', {
        targetCategory: 'FINISHED',
        batchNo: 'BATCH-001',
        inboundDate: '2026-05-04',
        remarks: '',
      })
    ).rejects.toThrow(
      '[INVALID_RESPONSE] SalesExchangeService.confirmSalesExchangeOldItemInbound expected "createdInboundRecords" to be an array.'
    )
  })
})
