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
