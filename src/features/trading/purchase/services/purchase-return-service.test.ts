import { beforeEach, describe, expect, it, vi } from 'vitest'

const { apiFetchMock } = vi.hoisted(() => ({
  apiFetchMock: vi.fn(),
}))

vi.mock('@/lib/api-client', () => ({
  apiFetch: apiFetchMock,
}))

import { getPurchaseReturns } from './purchase-return-service'

beforeEach(() => {
  apiFetchMock.mockReset()
})

describe('PurchaseReturnService', () => {
  it('rejects return list payloads that omit items instead of treating them as empty lists', async () => {
    apiFetchMock.mockResolvedValue({
      total: 0,
      page: 1,
      pageSize: 50,
    })

    await expect(getPurchaseReturns()).rejects.toThrow(
      '[INVALID_RESPONSE] PurchaseReturnService.getPurchaseReturns expected "items" to be an array.'
    )
  })

  it('rejects purchase return payloads that omit lines instead of treating them as empty lists', async () => {
    apiFetchMock.mockResolvedValue({
      items: [
        {
          id: 'return-1',
          returnNo: 'PR-001',
          purchaseOrderId: 'po-1',
          purchaseOrderNo: 'PO-001',
          supplierId: 'supplier-1',
          supplierName: 'Supplier A',
          status: 'Draft',
          returnDate: '2026-04-18',
          issueCategory: 'Quality',
          reason: 'Scratch',
          remarks: '',
          evidences: [],
          operator: 'buyer',
          totalQuantity: 1,
          totalAmount: 10,
          createdAt: '2026-04-18T00:00:00.000Z',
          updatedAt: '2026-04-18T00:00:00.000Z',
        },
      ],
      total: 1,
      page: 1,
      pageSize: 50,
    })

    await expect(getPurchaseReturns()).rejects.toThrow(
      '[INVALID_RESPONSE] PurchaseReturnService.toPurchaseReturnContract expected "lines" to be an array.'
    )
  })

  it('loads purchase returns from the locked paginated object protocol', async () => {
    apiFetchMock.mockResolvedValue({
      items: [
        {
          id: 'return-1',
          returnNo: 'PR-001',
          purchaseOrderId: 'po-1',
          purchaseOrderNo: 'PO-001',
          supplierId: 'supplier-1',
          supplierName: 'Supplier A',
          status: 'Draft',
          returnDate: '2026-04-18',
          issueCategory: 'Quality',
          reason: 'Scratch',
          remarks: '',
          evidences: [],
          operator: 'buyer',
          totalQuantity: 1,
          totalAmount: 10,
          createdAt: '2026-04-18T00:00:00.000Z',
          updatedAt: '2026-04-18T00:00:00.000Z',
          lines: [],
        },
      ],
      total: 1,
      page: 2,
      pageSize: 10,
    })

    const result = await getPurchaseReturns(2, 10)

    expect(apiFetchMock).toHaveBeenCalledWith('/purchase/returns?page=2&pageSize=10')
    expect(result.items).toHaveLength(1)
    expect(result.items[0]?.returnNo).toBe('PR-001')
  })
})
