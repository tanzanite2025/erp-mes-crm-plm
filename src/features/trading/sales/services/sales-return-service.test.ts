import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createApiClientError } from '@/lib/api-error'
import type {
  SalesReturnActualAmountRecordApiDTO,
  SalesReturnApiDTO,
} from '../contracts/sales-return-api-dto'

const { apiFetchMock } = vi.hoisted(() => ({
  apiFetchMock: vi.fn(),
}))

vi.mock('@/lib/api-client', () => ({
  apiFetch: apiFetchMock,
}))

import {
  deleteSalesReturn,
  getSalesReturnActualAmountRecords,
  getSalesReturnById,
} from './sales-return-service'

function buildSalesReturnDto(
  overrides: Partial<SalesReturnApiDTO> = {}
): SalesReturnApiDTO {
  return {
    id: 'sr-1',
    returnNo: 'SR-001',
    salesOrderId: 'so-1',
    salesOrderNo: 'SO-001',
    customerId: 'cust-1',
    customerName: 'Customer A',
    status: 'Created',
    trackingNo: '',
    carrier: '',
    shippedAt: null,
    trackingFilledAt: null,
    trackingFilledBy: '',
    logisticsNote: '',
    pendingTrackingFill: false,
    returnDate: '2026-04-25T00:00:00.000Z',
    issueCategory: 'Damage',
    reason: 'damaged',
    remarks: '',
    actualReturnAmount: 0,
    actualReturnAmountNote: '',
    actualReturnAmountEvidences: [],
    actualReturnAmountRecordedAt: null,
    actualReturnAmountRecordedBy: '',
    evidences: [],
    operator: 'tester',
    totalQuantity: 1,
    totalAmount: 12.5,
    createdAt: '2026-04-25T00:00:00.000Z',
    updatedAt: '2026-04-25T00:00:00.000Z',
    lines: [],
    ...overrides,
  }
}

function buildActualAmountRecordDto(
  overrides: Partial<SalesReturnActualAmountRecordApiDTO> = {}
): SalesReturnActualAmountRecordApiDTO {
  return {
    id: 'record-1',
    salesReturnId: 'sr-1',
    salesOrderId: 'so-1',
    salesOrderNo: 'SO-001',
    returnNo: 'SR-001',
    customerId: 'cust-1',
    customerName: 'Customer A',
    amount: 10,
    note: 'confirmed',
    evidences: [],
    estimatedReturnAmountSnapshot: 12.5,
    recordedAt: '2026-04-25T00:00:00.000Z',
    recordedBy: 'finance-user',
    createdAt: '2026-04-25T00:00:00.000Z',
    updatedAt: '2026-04-25T00:00:00.000Z',
    ...overrides,
  }
}

describe('sales-return-service', () => {
  beforeEach(() => {
    apiFetchMock.mockReset()
  })

  it('passes suppressErrorStatuses when loading a sales return detail', async () => {
    apiFetchMock.mockResolvedValue(buildSalesReturnDto())

    const result = await getSalesReturnById('sr-1')

    expect(apiFetchMock).toHaveBeenCalledWith('/sales-returns/sr-1', {
      suppressErrorStatuses: [404],
    })
    expect(result.id).toBe('sr-1')
    expect(result.returnNo).toBe('SR-001')
  })

  it('rejects sales return payloads that omit lines instead of treating them as empty lists', async () => {
    apiFetchMock.mockResolvedValue(buildSalesReturnDto({ lines: undefined as never }))

    await expect(getSalesReturnById('sr-1')).rejects.toThrow(
      '[INVALID_RESPONSE] SalesReturnService.toSalesReturnContract expected "lines" to be an array.'
    )
  })

  it('returns an empty history list when actual amount records return 404', async () => {
    apiFetchMock.mockRejectedValue(
      createApiClientError({
        kind: 'http',
        message: 'not found',
        endpoint: '/sales-returns/sr-missing/actual-amount-records',
        status: 404,
      })
    )

    await expect(getSalesReturnActualAmountRecords('sr-missing')).resolves.toEqual([])
    expect(apiFetchMock).toHaveBeenCalledWith(
      '/sales-returns/sr-missing/actual-amount-records',
      {
        suppressErrorStatuses: [404],
      }
    )
  })

  it('maps actual amount history records when the backend returns data', async () => {
    apiFetchMock.mockResolvedValue([buildActualAmountRecordDto()])

    const result = await getSalesReturnActualAmountRecords('sr-1')

    expect(result).toHaveLength(1)
    expect(result[0]?.salesReturnId).toBe('sr-1')
    expect(result[0]?.amount).toBe(10)
  })

  it('calls delete endpoint when deleting a sales return', async () => {
    apiFetchMock.mockResolvedValue(undefined)

    await deleteSalesReturn('sr-1')

    expect(apiFetchMock).toHaveBeenCalledWith('/sales-returns/sr-1', {
      method: 'DELETE',
    })
  })
})
