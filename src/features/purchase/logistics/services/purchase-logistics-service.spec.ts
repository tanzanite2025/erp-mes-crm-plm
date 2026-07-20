import { beforeEach, describe, expect, it, vi } from 'vitest'
import { PurchaseLogisticsService } from './purchase-logistics-service'

const apiFetch = vi.hoisted(() => vi.fn())

vi.mock('@/lib/api-client', () => ({ apiFetch }))
vi.mock('@/features/logistics/services/logistics-service', () => ({
  logisticsService: {
    getControlledTrackingDetail: vi.fn(),
  },
}))

const receiptRecord = {
  id: 'logistics-1',
  orderNo: 'PO-001',
  type: 'Receipt',
  purchaseOrderId: 'purchase-order-1',
  carrier: 'SF',
  trackingNo: 'SF001',
  status: 'Pending',
  events: [],
  version: 1,
  updatedAt: '2026-07-20T00:00:00Z',
} as const

describe('PurchaseLogisticsService receipt scope', () => {
  beforeEach(() => {
    apiFetch.mockReset()
  })

  it('always requests only receipt logistics records', async () => {
    apiFetch.mockResolvedValue({ items: [receiptRecord], total: 1 })

    const result = await PurchaseLogisticsService.getRecords({
      page: 1,
      pageSize: 100,
    })

    const requestedUrl = String(apiFetch.mock.calls[0]?.[0])
    const query = new URL(requestedUrl, 'http://localhost').searchParams
    expect(query.get('type')).toBe('Receipt')
    expect(query.get('page')).toBe('1')
    expect(query.get('pageSize')).toBe('100')
    expect(result.items?.[0]?.type).toBe('Receipt')
  })

  it('rejects a shipment record returned through the purchase contract', async () => {
    apiFetch.mockResolvedValue({
      items: [{ ...receiptRecord, type: 'Shipment' }],
      total: 1,
    })

    await expect(PurchaseLogisticsService.getRecords()).rejects.toThrow(
      'Purchase logistics received non-receipt record'
    )
  })
})
